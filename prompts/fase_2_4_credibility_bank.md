# PASO 2.4 — CREDIBILITY BANK

## TEXTO LITERAL DEL MASTER v2.2
PASO 2.4 — CREDIBILITY BANK
───────────────────────────────────────────────────────────────────────
REGLA: Solo casos reales. Si no hay, construir placeholders
en lenguaje humano real. El cliente los revisa y reemplaza.
Ver instrucciones de placeholders en Opción C arriba.
Estructura: TEMA → PRUEBA CONTEXTUAL → RESULTADO QUE INSTALA

## Objetivo
Construir el banco de credibilidad: mínimo 7 casos con tema, caso real, métrica, resultado y tiempo. Si el cliente aún no tiene un caso real para un tema, se marca `esPlaceholder: true` — NUNCA se inventan casos.

## Salida
Llama a `propose_section` con:
- `casos`: array (mínimo 7) de objetos { tema, casoReal, metrica, resultado, tiempo, esPlaceholder }
