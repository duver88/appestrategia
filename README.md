# LIONSCORE Content Engine

Chat guiado multi-API que construye el Sistema de Marca Personal + Contenido + Ventas (master prompt v2.2) fase por fase, con aprobación explícita del cliente en cada una, y genera al final un PDF con diseño editorial.

## Estado de implementación

- ✅ **M1 — Esqueleto funcional**: Next.js + Prisma, chat con streaming + tool `propose_section`, tarjeta de aprobación, persistencia y reanudación. **Auth.js v5** con roles CLIENT/SUPER_ADMIN, seed del super admin (cambio de contraseña obligatorio al primer login) y **aislamiento multi-tenant verificado** (un cliente recibe 404 al intentar acceder a chat/secciones/PDF de otro).
- ✅ **M2 — Plantilla PDF**: plantilla editorial (portada a color de marca con índice, cajas explicativas por sección, calendario con código de colores, página de cierre), render con Puppeteer A4 + header/footer, endpoint `/api/pdf/[projectId]`. Los PDFs se guardan en `/storage` (NO en `/public`: solo se descargan autenticados).
- ✅ **M3 — Sistema completo**: las 18 fases activas con schemas Zod, ramificación del eje (fase_0_5 → fase_2_1 inyecta solo la opción A/B/C/D), gate de FOMO (UI + backend), validadores del calendario, corrección retroactiva con marcado ⚠, pantalla de revisión con selector de color conectada al PDF real.
- ✅ **M4 — Panel super admin** (`/admin`, design system navy/cian/Nunito Sans): los 7 módulos — Resumen (por vencer en 7 días, flags de ayuda, gasto del mes), Clientes (alta con invitación, extender membresía, suspender, reset de contraseña, eliminar con doble confirmación), API y modelos (keys **cifradas AES-256-GCM** y enmascaradas, prueba de conexión, modelo por defecto, tabla de precios), Consumo (UsageLog real por cliente/proveedor/fase + barras por día), Prompts (**versionado completo desde DB** con restaurar, aplica al siguiente mensaje sin redeploy), Proyectos (conversación solo lectura, cambiar modelo, retroceder fase, archivar) y Configuración (textos, branding, SMTP, gate de membresía). Membresías con bloqueo automático por fecha (403 `MEMBERSHIP_EXPIRED` + pantalla de renovación + banner 5 días antes) y botón "Necesito ayuda humana" en el chat. Verificado con `scripts/verify-admin.ps1` (15 checks).
- ✅ **M5 — Modo 2**: renovación mensual (botón en proyectos completados), hereda la arquitectura del Mes 1 como contexto de solo lectura, inyecta el calendario anterior como "PROHIBIDO REPETIR", y genera el PDF corto.
- ⬜ M6 — Despliegue en VPS (Docker + Nginx + backups).

## Setup

```bash
npm install
npx prisma db push                 # crea/actualiza dev.db (SQLite)
npm run db:seed                    # crea el SUPER_ADMIN desde .env
node scripts/seed-prompts.js       # migra /prompts/*.md a DB (v1 activa)
node scripts/seed-credentials.js   # keys del .env → DB cifradas
node scripts/seed-settings.js      # default_model, price_table, textos
node scripts/backfill-memberships.js 30  # fechas de membresía + activa el gate
npm run dev
```

En `.env`, configurar como mínimo:

```
ANTHROPIC_API_KEY=sk-ant-...
AUTH_SECRET=<openssl rand -base64 32>
APP_ENCRYPTION_KEY=<openssl rand -base64 32>
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...
```

Ver `DEPLOY.md` para el protocolo completo (backup, orden de despliegue, rollback).

### Datos de prueba

`node scripts/e2e-seed.js` crea dos clientes de prueba con usuario
(`cliente-e2e@test.local` / `demo-pass-1234`, proyecto completo listo para
generar PDF; y `otro-e2e@test.local`, proyecto vacío). `--clean` los elimina.

## Arquitectura (resumen)

- **Máquina de estados**: `/lib/state-machine/phases.ts` — 18 fases en orden estricto; el avance requiere `Section APPROVED`. `MODO_2` solo ejecuta `fase_6`.
- **Fuente de verdad**: los JSON de `Section.data`, validados con Zod (`/lib/schemas`). La conversación es solo el medio.
- **Prompts desde DB**: el runtime lee SIEMPRE de `PromptTemplate` (versión activa, cache invalidada al guardar desde el panel; fallback al archivo de `/prompts` solo si no hay registro). Cada guardado crea una versión nueva restaurable. Los archivos marcados con `[NOTA AGENCIA: ...]` esperan el texto literal del master prompt v2.2 (editar ya directamente en el panel → Prompts). El prompt de `fase_2_1` mantiene los 4 bloques `<!-- EJE:X -->`: el backend conserva solo el del eje diagnosticado.
- **Multi-proveedor**: `/lib/llm/index.ts` — `Project.modelProvider` con formato `proveedor:modelo` (ej. `anthropic:claude-sonnet-4-5`, `deepseek:deepseek-chat`).
- **Persistencia**: cada mensaje del usuario se guarda en DB **antes** de llamar al LLM. Al reabrir un proyecto se recarga la fase actual con su historial.
- **Auth y multi-tenant**: Auth.js v5 (JWT) en `/lib/auth.ts` + `middleware.ts`. TODA query de proyectos/secciones/mensajes/PDF pasa por `canAccessClient()` (`/lib/authz.ts`); el acceso ajeno devuelve 404.
- **PDF**: `/lib/pdf/template.ts` (HTML editorial, Modo 1 y Modo 2) + `/lib/pdf/render.ts` (Puppeteer singleton). Regla dura verificada: "Vehículo Azul" nunca aparece.

## Notas de base de datos

Desarrollo usa SQLite, que en Prisma no soporta `enum` ni `Json`: esos campos son `String` (los valores se tipan en `/lib/types.ts` y se validan con Zod). Para producción con PostgreSQL: cambiar `provider` en `prisma/schema.prisma`, convertir los campos de estado a enums, `Section.data` a `Json` y `Message.content` a `@db.Text`.

## Flujo de una fase

1. El modelo conversa (una pregunta a la vez) usando `master_rules.md` + resumen legible de TODAS las secciones aprobadas + prompt de la fase.
2. Cuando el contenido está listo, llama a la tool `propose_section` → se valida con Zod (y en `fase_6` con los validadores del calendario) → se guarda como `Section DRAFT`.
3. La UI muestra la tarjeta de propuesta con **Aprobar ✓** / **Pedir cambios ✎**. En `fase_6`, Aprobar queda deshabilitado hasta que el FOMO esté confirmado por el cliente.
4. Aprobar → `APPROVED`, avanza `currentPhase` y la IA abre la fase siguiente. Última fase → proyecto pasa a `REVIEW` → pantalla de revisión → PDF.
5. Si se re-aprueba una fase anterior, las posteriores se marcan ⚠ revisar (no se borran).
