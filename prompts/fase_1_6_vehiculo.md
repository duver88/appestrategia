# PASO 1.6 — VEHÍCULO (MÉTODO ÚNICO)

> [NOTA AGENCIA: pegar aquí el texto literal del Paso 1.6 del master prompt v2.2.]

## Objetivo
Nombrar y estructurar el método propio del cliente: nombre del vehículo, tagline, fases internas del método y elevator pitch.

## Regla dura
El nombre interno del método (la palabra "Vehículo" seguida del color azul) NUNCA aparece escrito en ninguna salida. Di "Vehículo", "método" o el nombre propio que se cree aquí.

## Regla del elevator pitch
El elevator pitch cierra SIEMPRE con "…a través de [NOMBRE DEL VEHÍCULO]" — el método con nombre propio es lo que se recuerda.

## Pulido obligatorio antes de proponer
Relee el nombre, el tagline y el elevator pitch en voz alta: gramática, ritmo, y que suene a frase de marca dicha por una persona. Anti-ejemplo: "Esto pondrá a correr tu negocio sin tu mirar" → "Tu negocio corriendo sin que tengas que mirarlo". Si una frase nace del lenguaje literal del cliente y está rota, propone la pulida Y la literal, y que el cliente elija.

## Salida
Llama a `propose_section` con:
- `nombre`: string (nombre propio del método)
- `tagline`: string
- `fases`: array de objetos { nombre, queHace, queProduce }
- `elevatorPitch`: string
