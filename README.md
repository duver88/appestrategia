# LIONSCORE Content Engine

Chat guiado multi-API que construye el Sistema de Marca Personal + Contenido + Ventas (master prompt v2.2) fase por fase, con aprobación explícita del cliente en cada una, y genera al final un PDF con diseño editorial.

## Estado de implementación

- ✅ **M1 — Esqueleto funcional**: Next.js + Prisma, chat con streaming + tool `propose_section`, tarjeta de aprobación, persistencia y reanudación. **Auth.js v5** con roles CLIENT/SUPER_ADMIN, seed del super admin (cambio de contraseña obligatorio al primer login) y **aislamiento multi-tenant verificado** (un cliente recibe 404 al intentar acceder a chat/secciones/PDF de otro).
- ✅ **M2 — Plantilla PDF**: plantilla editorial (portada a color de marca con índice, cajas explicativas por sección, calendario con código de colores, página de cierre), render con Puppeteer A4 + header/footer, endpoint `/api/pdf/[projectId]`. Los PDFs se guardan en `/storage` (NO en `/public`: solo se descargan autenticados).
- ✅ **M3 — Sistema completo**: las 18 fases activas con schemas Zod, ramificación del eje (fase_0_5 → fase_2_1 inyecta solo la opción A/B/C/D), gate de FOMO (UI + backend), validadores del calendario, corrección retroactiva con marcado ⚠, pantalla de revisión con selector de color conectada al PDF real.
- ✅ **M4 — Panel super admin** (`/admin`, design system navy/cian/Nunito Sans): los 7 módulos — Resumen (por vencer en 7 días, flags de ayuda, gasto del mes), Clientes (alta con invitación, extender membresía, suspender, reset de contraseña, eliminar con doble confirmación), API y modelos (keys **cifradas AES-256-GCM** y enmascaradas, prueba de conexión, modelo por defecto, tabla de precios), Consumo (UsageLog real por cliente/proveedor/fase + barras por día), Prompts (**versionado completo desde DB** con restaurar, aplica al siguiente mensaje sin redeploy), Proyectos (conversación solo lectura, cambiar modelo, retroceder fase, archivar) y Configuración (textos, branding, SMTP, gate de membresía). Membresías con bloqueo automático por fecha (403 `MEMBERSHIP_EXPIRED` + pantalla de renovación + banner 5 días antes) y botón "Necesito ayuda humana" en el chat. Verificado con `scripts/verify-admin.ps1` (15 checks).
- ✅ **M5 — Modo 2**: renovación mensual (botón en proyectos completados), hereda la arquitectura del Mes 1 como contexto de solo lectura, inyecta el calendario anterior como "PROHIBIDO REPETIR", y genera el PDF corto.
- ✅ **Motor de calidad (ajustes #1, #2, #3 + correcciones del owner + hotfix de edición)** — ver "Motor de calidad del documento" abajo. Calendario por semanas con validación servidor, catálogos canónicos del master v2.2, validadores de cifras/magnets/matriz/mes/eco, PDF formato Luxor con cierre personalizado, gate ternario de FOMO y flujo de edición honesto.
- ⬜ M6 — Despliegue en VPS (Docker + Nginx + backups automáticos). **OJO: mientras M6 no exista, "producción" es ESTA máquina** (`prisma/dev.db` con los clientes reales, servidor en `npm start` puerto 3000). Si la terminal se cierra, el servidor cae — ver "Operación" abajo para relanzarlo.

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

## Motor de calidad del documento (ajustes #1-#3 y posteriores)

Construido para cerrar la brecha entre el output generado y el documento ideal hecho a mano ("LionScore_LuxorSolar_Julio2025" — extractos canónicos en `docs/referencias/luxor_referencias_doradas.md`). Especificación reconciliada en `ajuste_calidad_v3.1_reconciliado.md`.

### Generación del calendario (fase_6)
- **Pipeline por semanas** (`lib/calendar/generate.ts`): 4 llamadas `generateObject` (7/7/7/10 días), persistencia parcial (`Section PARTIAL`) con reanudación, regeneración solo de la semana culpable, máx. 1+2 intentos por semana, progreso visible con heartbeat ≤10s.
- **Catálogos canónicos** (`lib/calendar/catalogs.ts`): 18 ángulos, 19 formatos (11 con cara / 8 sin cara), ORDEN_MASTER de 31 días, etiquetas de semana, CTAs del master, topes PARCIAL (2 cara/semana, 8/mes) y NINGUNA (enum reducido a 8 sin cara).
- **5ª llamada: cierre personalizado** (B5) — 4 párrafos + cita final construida desde los diferenciadores aprobados; usa el nombre EXACTO del método, jamás "Vehículo"; se valida antes de persistir.
- **Gate ternario de FOMO** (B2): confirmado con números / `estado: "PENDIENTE_BRACKETS"` (aprobable con números en brackets + nota ★) / bloqueado.

### Validadores de servidor (`lib/schemas/`)
| Validador | Qué rechaza |
|---|---|
| `metric-validators.ts` (A1) | Cifras de resultado sin respaldo del Credibility Bank confirmado ni whitelist de fundamentos. Cubre %, monedas ($ € EUR USD COP), verbos de dinero (facturar/ganar/vender/ahorrar/cobrar) y rangos "de X a Y". La whitelist exige **número + unidad** ("10 clientes en 90 días" NO autoriza "10 leads en un día"). Vía de escape: brackets `[X]` integrados natural. También: tokens de eco ("Placeholder", "Sin inventar cifras") y menciones de mes ajeno al calendario. |
| `magnet-validators.ts` (A2) | fase_5: días solapados entre magnets, <2 días por OM, >30% de los días con magnet en un OM. fase_6: desigualdad exacta con los `diasAplica` aprobados (diff legible) y keywords huérfanas. El pipeline INYECTA el plan de magnets día a día al prompt. |
| `matrix-validators.ts` (A3 + p.6) | Matriz: nivel 1-2⇒DOLOR+ATRACCIÓN, 3-4⇒GANANCIA+NUT/CONV, 5⇒GANANCIA+CONV; exactamente 3 deseos; pares (deseo,perfil) únicos × niveles 1-5; perfiles/deseos EXACTOS de las secciones aprobadas. Diferenciadores: sin ítems con el mismo cuerpo. |
| `calendar-validators.ts` | Las 17 reglas históricas del master + todo lo anterior en la aprobación (`/api/sections/approve`, defensa en profundidad). |

### PDF formato Luxor (`lib/pdf/template.ts`)
Ficha técnica de portada (CLIENTE/METODOLOGÍA/EJE/VEHÍCULO/CARA VISIBLE/CALENDARIO/MODO — "VEHÍCULO" solo ahí), cajas "¿Para qué sirve esta sección?" en las 14 secciones, columna Formato/Persona, semana 4 absorbe los días 22-31 (JAMÁS "Semana 5"), ★ en semana 4 + leyenda de colores, "Nota para [cliente]" determinista en el bank, cierre personalizado con cita en caja (keep-together), título del método con nombre propio. Datos nuevos aditivos: `Project.caraVisible` (editable en panel admin) y `fase_0.nombreCaraVisible` (pregunta 13b).

### Flujo de edición honesto (hotfix 2026-06-11)
Si un validador rechaza una edición pedida por el cliente: el modelo NO persiste una versión mutada y responde «No apliqué el cambio porque: [razón]» + qué haría falta; diff mínimo obligatorio (solo se toca lo pedido); secciones de fases ya APROBADAS no se editan desde el chat (camino real: botón Ayuda). Cinturón de UI: todo `ok:false` de tool sin reintento exitoso se muestra como aviso en el chat (`lib/chat-tools.ts`) — nunca silencio con card vieja. Reglas 18-19 de `master_rules`.

## Protocolo de auditoría (resumen operativo)

- `./audit.sh` — del owner, INTOCABLE. Estática: 27 checks. Debe salir 0.
- `npm run test:audit` — suite completa (22 archivos / 116 tests). Los tests solo se agregan, jamás se debilitan; el código se adapta a los tests.
- **Regla 5**: tras CUALQUIER fix → suite completa + audit.sh + regresión dorada de nuevo.
- **Regresión dorada reproducible**: `node scripts/diag-fase6-setup.js && node scripts/diag-fase6-run.js` (genera calendario real con DeepSeek en el proyecto de diagnóstico y produce `storage/pdfs/muestra-calidad.pdf`) y luego `node scripts/verify-golden-pdf.js` (**checklist dorado de 22 ítems** contra el PDF + DB).
- **Diagnóstico del flujo de edición**: `node scripts/diag-edit-run.js` (3 escenarios instrumentados: edición benigna, rechazo de validador, fase aprobada).
- NO desplegar sin aprobación explícita del owner. Versiones de prompts: nunca sobrescribir — `scripts/upgrade-prompts-v4.js` publica nuevas versiones activas (idempotente, restaurables desde el panel).

## Operación (producción provisional en esta máquina)

```powershell
# Relanzar producción (si la terminal se cerró):
cd "C:\Users\duver\Desktop\Proyecto APP\Estrategia"
npm run build    # solo si hubo cambios de código desde el último build
npm start        # sirve en http://localhost:3000 con prisma/dev.db

# Backup de la DB (SIEMPRE antes de migrar/desplegar):
node scripts/backup-db.js          # → backups/dev-AAAA-MM-DD-HH-mm.db

# Publicar cambios de prompts (idempotente, nunca sobrescribe):
node scripts/upgrade-prompts-v4.js
```

- Repo: https://github.com/duver88/appestrategia (main).
- Backups en `/backups` (fechados). PDFs en `/storage/pdfs` (fuera de /public, descarga autenticada).
- Versiones de prompts activas a 2026-06-11: `master_rules` v7 · `fase_6_calendario` v8 · `fase_4_matriz_hooks` v5 · `fase_1_4_diferenciadores` v4 · `fase_2_2` v4 · resto v2-v3. Todas las anteriores restaurables en panel → Prompts.

## Changelog (commits principales)

| Commit | Qué |
|---|---|
| `764c2ed` | Base M1-M5 + panel admin + ajustes #1/#2 + pipeline por semanas + fix PARCIAL (caso Hernesto) |
| `7aeb872` | **Ajuste #3 v3.1**: validadores A1/A2/A3, gate ternario FOMO, cierre personalizado, PDF Luxor, `caraVisible`, prompts v4 |
| `dbdb959` | **Correcciones del owner** (6 puntos): A1 ampliado (€/verbos/rangos, whitelist número+unidad), nombre del método en el cierre, anti-eco, coherencia de mes, keep-together, perfiles/duplicados — checklist dorado ampliado 22/22 |
| `4dbc0c0` | **Hotfix flujo de edición**: disciplina de edición (diff mínimo, "No apliqué el cambio porque…"), reglas 18-19, cinturón de UI para `ok:false` |

## Flujo de una fase

1. El modelo conversa (una pregunta a la vez) usando `master_rules.md` + resumen legible de TODAS las secciones aprobadas + prompt de la fase.
2. Cuando el contenido está listo, llama a la tool `propose_section` → se valida con Zod (y en `fase_6` con los validadores del calendario) → se guarda como `Section DRAFT`.
3. La UI muestra la tarjeta de propuesta con **Aprobar ✓** / **Pedir cambios ✎**. En `fase_6`, Aprobar queda deshabilitado hasta que el FOMO esté confirmado por el cliente.
4. Aprobar → `APPROVED`, avanza `currentPhase` y la IA abre la fase siguiente. Última fase → proyecto pasa a `REVIEW` → pantalla de revisión → PDF.
5. Si se re-aprueba una fase anterior, las posteriores se marcan ⚠ revisar (no se borran).
