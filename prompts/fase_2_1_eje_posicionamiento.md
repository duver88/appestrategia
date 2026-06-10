# PASO 2.1 — EJE DE POSICIONAMIENTO

> [NOTA AGENCIA: pegar aquí el texto literal del Paso 2.1 del master prompt v2.2.
> El backend inyecta SOLO la opción correspondiente al eje diagnosticado en la
> Parte 0.5 (A: creencia contraria, B: proceso, C: resultado, D: combinación).
> Mantener los cuatro bloques marcados con los delimitadores de abajo.]

## Objetivo
Desarrollar el eje de posicionamiento diagnosticado en la Parte 0.5.

<!-- EJE:CREENCIA_CONTRARIA -->
## Opción A — Creencia contraria
Desarrolla: la narrativa dominante del mercado, una versión agresiva del posicionamiento contrario, una versión consultiva, y la tesis unificada.

Genera SIEMPRE, además:
1. **Regla de ejecución — Pairing × Consistencia = Asociación**, redactada para el cliente: esta tesis se repite en CADA pieza de contenido desde ángulos distintos; el objetivo no es variedad temática, es instalación de asociación en la mente del mercado.
2. **Señal de que funciona**: 2 ejemplos de DMs hipotéticos que el cliente recibiría cuando la tesis se instale, escritos en el lenguaje literal del avatar (ej. del caso ideal: "vi tu video y me di cuenta que llevo años moviéndome desde el castigo").

### Pulido obligatorio antes de proponer
Relee cada frase central en voz alta: gramática, ritmo, y que suene a frase de marca. Anti-ejemplo: "Esto pondrá a correr tu negocio sin tu mirar" → "Tu negocio corriendo sin que tengas que mirarlo". Si una frase nace del lenguaje literal del cliente y está rota, propone la versión pulida Y la literal, y que el cliente elija.

### Salida
Llama a `propose_section` con:
- `tipo`: "CREENCIA_CONTRARIA"
- `narrativaDominante`, `versionAgresiva`, `versionConsultiva`, `tesisUnificada`: strings
- `reglaEjecucion`: string (la regla redactada para el cliente)
- `senalesDeExito`: array de exactamente 2 strings (los DMs hipotéticos)
<!-- /EJE:CREENCIA_CONTRARIA -->

<!-- EJE:PROCESO -->
## Opción B — Proceso
Desarrolla 5 a 7 versiones del posicionamiento por proceso propio.

### Salida
Llama a `propose_section` con:
- `tipo`: "PROCESO"
- `versiones`: array de 5 a 7 strings
<!-- /EJE:PROCESO -->

<!-- EJE:RESULTADO -->
## Opción C — Resultado
El posicionamiento se sostiene en casos y métricas; los casos concretos se construyen en el Paso 2.4 (Credibility Bank).

### Salida
Llama a `propose_section` con:
- `tipo`: "RESULTADO"
<!-- /EJE:RESULTADO -->

<!-- EJE:COMBINACION -->
## Opción D — Combinación
Desarrolla ambos bloques: creencia contraria completa + versiones por proceso.

### Salida
Llama a `propose_section` con:
- `tipo`: "COMBINACION"
- `narrativaDominante`, `versionAgresiva`, `versionConsultiva`, `tesisUnificada`: strings
- `reglaEjecucion`: string · `senalesDeExito`: array de 2 strings (igual que la Opción A)
- `versiones`: array de 5 a 7 strings
<!-- /EJE:COMBINACION -->
