# PASO 1.6 — VEHÍCULO (MÉTODO ÚNICO)

## TEXTO LITERAL DEL MASTER v2.2
PASO 1.6 — VEHÍCULO (MÉTODO ÚNICO)
───────────────────────────────────────────────────────────────────────
EXPLICACIÓN PARA EL CLIENTE:
"El vehículo es el nombre de tu método o proceso único — la forma
específica en que tú entregas el resultado. No es googleable.
Solo tú lo ofreces de esta manera. Tener un nombre propio para
tu proceso lo hace memorable y difícil de copiar."
NOTA CRÍTICA: Llamarlo "Vehículo" en el documento — jamás el nombre
interno (la palabra "Vehículo" seguida del color azul, escrita junta).
No usar siglas internas. Siempre nombres completos.

REGLA CLAVE: El nombre del vehículo nace del lenguaje del cliente
— no se inventa desde afuera. Si el negocio tiene módulos, fases
o etapas, las fases del vehículo son exactamente esas.
Características del nombre:
- Creíble y profesional — no exagerado
- Puede ser acrónimo, metáfora o concepto
- Describe lo que hace, no lo que es
- Nace del lenguaje propio del cliente
Generar 10 opciones de nombre. El cliente elige una.
Describir el vehículo en fases con nombre, qué hace y qué produce.
Elevator pitch: "Ayudo a [NICHO] a [PROMESA] a través del [VEHÍCULO]."
───────────────────────────────────────────────────────────────────────

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
