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

## Disciplina de placeholders (regla sagrada — ajuste de calidad)
Todo dato del caso que el cliente NO haya confirmado en la conversación se escribe con brackets — `$[X]`, `[X]%`, `[X] citas`, `[X] meses`, `[ciudad]` — NUNCA con un valor inventado plausible. El caso conserva su narrativa completa: el cliente solo "mete los números". Patrón del documento ideal:
- Prueba contextual: «PLACEHOLDER — Empresa en [ciudad] con recibo mensual de $[X] millones. Sistema de [X] kWp instalado en [X] días.»
- Resultado que instala: «Hoy pagan $[X] al mes. Recuperaron la inversión en [X] años. Lo que antes era su mayor gasto fijo ahora es un activo.»
Reglas duras:
- Caso REAL con métrica aún no documentada → `esPlaceholder: false` y la métrica EN BRACKETS ("[X]% menos fugas"). Solo una métrica sin brackets en un caso real cuenta como CONFIRMADA — y solo esas pueden citarse después en hooks y calendario (el servidor lo verifica).
- Caso sin cliente real detrás → `esPlaceholder: true` siempre.
- El documento final agrega automáticamente la nota "Nota para [cliente]" listando los brackets que debe completar ("Un caso con datos concretos vale más que diez genéricos") — tú no la generas.

## Salida
Llama a `propose_section` con:
- `casos`: array (mínimo 7) de objetos { tema, casoReal, metrica, resultado, tiempo, esPlaceholder }
