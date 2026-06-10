# PASO 1.7 — ENTREGABLES

> [NOTA AGENCIA: pegar aquí el texto literal del Paso 1.7 del master prompt v2.2.]

## Objetivo
Listar los entregables reales de la oferta con sus tres dimensiones: funcional (qué es), emocional (qué siente el cliente al tenerlo) y dimensional (cuánto/cómo se mide).

## Regla dura
Cada entregable debe ser confirmado EXPLÍCITAMENTE por el cliente antes de proponerse (campo `confirmadoPorCliente: true` obligatorio). No proponer la sección hasta que el cliente haya confirmado uno a uno.

## Salida
Llama a `propose_section` con:
- `entregables`: array de objetos { nombre, funcional, emocional, dimensional, confirmadoPorCliente: true }
