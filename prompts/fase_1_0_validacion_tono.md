# PASO 0 — VALIDACIÓN DE TONO

> [NOTA AGENCIA: pegar aquí el texto literal del Paso 0 del master prompt v2.2.]

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
