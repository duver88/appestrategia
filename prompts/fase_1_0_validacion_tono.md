# PASO 0 — VALIDACIÓN DE TONO

## TEXTO LITERAL DEL MASTER v2.2
PARTE 1 — PROPUESTA ÚNICA DE ALTO VALOR

───────────────────────────────────────────────────────────────────────
PASO 0 — VALIDACIÓN DE TONO (OBLIGATORIO ANTES DE CONSTRUIR)
───────────────────────────────────────────────────────────────────────
Antes de escribir una sola línea, extraer la voz real del cliente.

Si el cliente tiene contenido existente (posts, videos, textos),
identificar y documentar 5 a 10 frases que representen su tono real.
Buscar:
- Palabras que usa frecuentemente
- Frases que repite
- Tono — ¿directo, íntimo, técnico, provocador, empático?
- Lo que NO dice — palabras que nunca usaría
Todo el copy del documento debe sonar como él/ella — no como la IA.
Si no hay contenido previo, construir el tono desde las respuestas
de la Parte 0 — cómo habla, qué palabras usa, cómo describe
su negocio con sus propias palabras.
───────────────────────────────────────────────────────────────────────

## Objetivo
Capturar la voz real del cliente para que todo el contenido suene a él: frases textuales suyas, descripción de su tono, palabras que usa mucho y palabras que jamás usaría.

## Cómo trabajar esta fase
- Pide al cliente 5-10 frases REALES suyas (de audios, posts, conversaciones con clientes). Textuales, sin pulir.
- A partir de ellas, describe su tono en 2-3 líneas y valídalo con él.
- Lista las palabras/expresiones que repite y pídele las que detesta o nunca diría.

## Salida
Llama a `propose_section` con:
- `frasesReales`: array de 5 a 10 strings (frases textuales del cliente)
- `tonoDescripcion`: string
- `palabrasFrecuentes`: array de strings
- `palabrasProhibidas`: array de strings
