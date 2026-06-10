---
name: lionscore-architecture
description: Convenciones de arquitectura obligatorias del Lionscore Content Engine. Usar esta skill SIEMPRE que se agregue o modifique cualquier funcionalidad del backend o del flujo de la app — fases, prompts, secciones, llamadas al LLM, endpoints, generación de PDF, el panel admin, o cualquier feature nueva — aunque parezca un cambio pequeño. Si el cambio toca /api, Prisma, el motor de fases o los prompts, esta skill aplica.
---

# Arquitectura Lionscore Content Engine

La app guía a clientes por un sistema de marketing en 18 fases mediante chat con IA y genera un PDF editorial. Principios que NINGÚN cambio puede romper:

## 1. Los JSONs aprobados son la fuente de verdad
- El chat es el medio; las tablas `Section` (JSON validado con Zod, status DRAFT/APPROVED) son la verdad.
- El PDF se genera SOLO desde Sections APPROVED, jamás desde el transcript.
- Toda fase se cierra con la tool `propose_section` cuyo schema Zod vive en `/lib/schemas`. Si una feature nueva produce contenido para el PDF, necesita schema Zod + componente de render + bloque en la plantilla PDF. Los tres, siempre.
- Validaciones de negocio (ej. calendario: ≥10 ángulos, ≥8 formatos, ningún ángulo >2 veces seguidas, FOMO confirmado) se devuelven al modelo como error de tool — el cliente nunca ve contenido inválido.

## 2. El motor de fases manda
- Orden estricto definido en `/lib/state-machine`. No se entra a una fase sin la anterior APPROVED. Avanzar = aprobación explícita del cliente, nunca automática.
- Editar una fase aprobada marca las posteriores como "revisar" (no las borra).
- MODO_2 (renovación mensual) solo ejecuta calendario + credibility bank, heredando el resto del proyecto padre como solo lectura. Al construir el calendario nuevo, los hooks/ideas del mes anterior se inyectan como "PROHIBIDO REPETIR".

## 3. Prompts: solo desde la base de datos
- El runtime lee prompts con `getActivePrompt(phaseId)` desde `PromptTemplate` (versión activa, cache invalidada al guardar). PROHIBIDO hardcodear prompts en el código o volver a leer archivos en runtime — los archivos de `/prompts` son solo seed/respaldo.
- Cambios de prompt = nueva versión (nunca sobrescribir): el historial con restauración es sagrado.
- El system prompt de cada turno se ensambla: master_rules + resumen de secciones aprobadas + prompt de la fase + instrucción de tool. Mantener ese ensamblado en un solo módulo.

## 4. Multi-tenant estricto (datos de clientes reales)
- TODA query de proyectos/secciones/mensajes/PDF filtra por el `clientId` de la sesión. Endpoint nuevo = test de que un CLIENT no accede a recursos ajenos por ID.
- Rutas `/api/admin/*`: doble verificación de `role === SUPER_ADMIN` (middleware + handler).
- Middleware de membresía: cliente con `status SUSPENDED` o `now > membershipExpiresAt` → 403 `MEMBERSHIP_EXPIRED`. Las features nuevas de cliente deben pasar por este middleware.

## 5. LLM: abstracción + costos + secretos
- Toda llamada va por `getModel()` (Vercel AI SDK). Nunca instanciar un proveedor directo en un handler.
- Las API keys se leen de `ApiCredential` cifradas (AES-256-GCM, `lib/crypto.ts`); se descifran solo en memoria. JAMÁS en logs, errores, respuestas ni en la UI sin enmascarar. Fallback a env vars solo en desarrollo.
- Todo `streamText` registra `UsageLog` en `onFinish` (tokens + costo según `Setting.price_table`), en try/catch que nunca bloquea la respuesta.

## 6. Persistencia primero
- El mensaje del usuario se guarda en DB ANTES de llamar al LLM. Nada que el cliente escriba puede perderse, ni con error del proveedor.
- El estado de la UI se deriva del servidor (reanudación perfecta); `localStorage` solo para el borrador del input no enviado.

## 7. Reglas de contenido del producto
- En documentos generados para clientes: jamás "Vehículo Azul" (solo "Vehículo" o el nombre propio), jamás siglas internas, jamás FOMO inventado (la semana 4 requiere `fomo.confirmedByClient = true`).
- Textos de UI en español, sentence case, sin emojis (ver skill `lionscore-design`).

## Checklist antes de dar por terminado cualquier cambio
1. ¿Rompe alguno de los 7 principios? → rediseñar.
2. ¿Toca DB? → seguir la skill `lionscore-prod-safe`.
3. ¿Toca UI? → seguir la skill `lionscore-design`.
4. ¿Endpoint nuevo? → validación Zod + filtro por tenant + test de acceso ajeno.
5. ¿Sigue funcionando el flujo completo aprobar→avanzar→PDF para un cliente existente?
