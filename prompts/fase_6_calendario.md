# PARTE 6 — CALENDARIO DE 31 DÍAS

> [NOTA AGENCIA: pegar aquí el texto literal de la Parte 6 del master prompt v2.2.]

## Objetivo
Construir el calendario completo de 31 días de contenido: por día, ángulo, uso (ATRACCION/NUTRICION/CONVERSION), formato, hook, idea central, magnet asociado (si aplica) y CTA.

## Gate de FOMO (obligatorio)
ANTES de construir la semana 4, pregunta al cliente cuál es el FOMO REAL del mes (cupos, fecha límite, bonus que expira, subida de precio...). No inventes urgencia. El campo `fomo.confirmedByClient` solo puede ser `true` si el cliente lo confirmó explícitamente en la conversación. Sin confirmación, la fase no puede aprobarse.

## Verificación obligatoria (el backend la valida; si falla, corrige y reenvía)
- Al menos 10 ángulos distintos en el mes.
- Al menos 8 formatos distintos.
- Ningún ángulo más de 2 veces seguidas.
- Ningún formato más de 3 veces en total.
- La prueba social usa casos del Credibility Bank (no inventados).

## Salida
Llama a `propose_section` con:
- `fomo`: { descripcion, tipo, confirmedByClient }
- `dias`: array de exactamente 31 objetos { dia, diaSemana, angulo, uso, formato, hook, ideaCentral, magnet (string|null), cta }
- `verificacion`: { angulosDistintos, formatosDistintos, fomoConfirmado, pruebaSocialConCasos }
