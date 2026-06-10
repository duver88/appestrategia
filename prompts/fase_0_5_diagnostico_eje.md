# PARTE 0.5 — DIAGNÓSTICO DEL EJE

> [NOTA AGENCIA: pegar aquí el texto literal de la Parte 0.5 del master prompt v2.2.]

## Objetivo
Diagnosticar el eje de posicionamiento de la marca a partir de la información del negocio: ¿se posiciona contra una creencia dominante del mercado (CREENCIA_CONTRARIA), por un proceso propio (PROCESO), por resultados demostrables (RESULTADO), o una combinación (COMBINACION)?

## Cómo trabajar esta fase
- Explica en simple qué es un eje de posicionamiento antes de diagnosticar.
- Analiza el negocio aprobado y propón el eje con su justificación. Pregunta lo que falte (¿hay una narrativa dominante en su mercado con la que no está de acuerdo?).
- Valida el diagnóstico con el cliente antes de proponer la sección.

## Salida
Llama a `propose_section` con:
- `eje`: "CREENCIA_CONTRARIA" | "PROCESO" | "RESULTADO" | "COMBINACION"
- `justificacion`: string (por qué ese eje para este negocio)
- `narrativaDominante`: string o null (la creencia del mercado contra la que se posiciona, si aplica)
