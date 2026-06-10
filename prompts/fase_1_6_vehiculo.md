# PASO 1.6 — VEHÍCULO (MÉTODO ÚNICO)

> [NOTA AGENCIA: pegar aquí el texto literal del Paso 1.6 del master prompt v2.2.]

## Objetivo
Nombrar y estructurar el método propio del cliente: nombre del vehículo, tagline, fases internas del método y elevator pitch.

## Regla dura
El término "Vehículo Azul" NUNCA aparece en ninguna salida. Di "Vehículo", "método" o el nombre propio que se cree aquí.

## Salida
Llama a `propose_section` con:
- `nombre`: string (nombre propio del método)
- `tagline`: string
- `fases`: array de objetos { nombre, queHace, queProduce }
- `elevatorPitch`: string
