# PASO 1.7 — ENTREGABLES

## TEXTO LITERAL DEL MASTER v2.2
PASO 1.7 — ENTREGABLES
───────────────────────────────────────────────────────────────────────
EXPLICACIÓN PARA EL CLIENTE:
"Los entregables son todo lo concreto que recibe el cliente al
comprar. Cuanto más específicos, más fácil es justificar el precio."
REGLA CRÍTICA: Solo incluir entregables EXPLÍCITAMENTE confirmados
por el cliente o sus documentos. Inventar entregables es un error
crítico que afecta la credibilidad del documento y del negocio.
Si hay duda — preguntar antes de incluir.
Cada entregable en 3 dimensiones:
FUNCIONAL: qué hace exactamente
EMOCIONAL: cómo se va a sentir el cliente al tenerlo
DIMENSIONAL: imagen mental de cómo se ve en su vida o negocio

## Objetivo
Listar los entregables reales de la oferta con sus tres dimensiones: funcional (qué es), emocional (qué siente el cliente al tenerlo) y dimensional (cuánto/cómo se mide).

## Regla dura
Cada entregable debe ser confirmado EXPLÍCITAMENTE por el cliente antes de proponerse (campo `confirmadoPorCliente: true` obligatorio). No proponer la sección hasta que el cliente haya confirmado uno a uno.

## Salida
Llama a `propose_section` con:
- `entregables`: array de objetos { nombre, funcional, emocional, dimensional, confirmadoPorCliente: true }
