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

### Salida
Llama a `propose_section` con:
- `tipo`: "CREENCIA_CONTRARIA"
- `narrativaDominante`, `versionAgresiva`, `versionConsultiva`, `tesisUnificada`: strings
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
- `versiones`: array de 5 a 7 strings
<!-- /EJE:COMBINACION -->
