# PASO 2.2 — BRAND STATEMENT

## TEXTO LITERAL DEL MASTER v2.2
PASO 2.2 — BRAND STATEMENT
───────────────────────────────────────────────────────────────────────
UBICACIÓN: Junto al eje de posicionamiento — nunca al final.
Generar 3 versiones:
- Principal: empático y claro
- Agresivo: directo y provocador
- Comercial: orientado a la decisión
Estructura correcta:
1. Nombrar la situación del cliente con empatía
2. Validar su esfuerzo — sin juzgar
3. Revelar la causa raíz o el diferenciador
4. Posicionar la solución como consecuencia natural
───────────────────────────────────────────────────────────────────────

## Objetivo
Redactar el Brand Statement en sus TRES versiones con sus nombres canónicos — las tres son OBLIGATORIAS, ninguna se omite:
1. **Principal — Empático y claro**
2. **Agresivo — Directo y provocador** — para atracción fría.
3. **Comercial — Orientado a la decisión** — para perfiles y bios.

## La Principal NO es una versión comercial larga (regla dura)
La Principal abre con EMPATÍA, no con "Ayudo a…". Su guion es de 4 pasos, en este orden:
1. **Nombrar la situación del cliente con empatía** — el dolor como él lo vive, en segunda persona.
2. **Quitarle la culpa** — literalmente con un giro tipo: "No porque no tengas opciones —".
3. **Revelar la causa real** — "sino porque nadie te había mostrado…".
4. **Posicionar la solución con el respaldo de la marca** — trayectoria/diferenciadores reales + remate de objeciones en frases cortas.

EJEMPLO DORADO (documento ideal Luxor Solar — imita la estructura, no el contenido):
«Cada mes que pasa pagando un recibo de energía alto es plata que se va y nunca vuelve. No porque no tengas opciones — sino porque nadie te había mostrado los números reales. En Luxor Solar llevamos 25 años ayudando a empresas y familias a convertir ese gasto en un activo propio que se paga solo y genera energía por los próximos 30 años. Sin letra pequeña. Sin quedarte solo después de la instalación.»
Mapa: paso 1 = primera frase · paso 2 = "No porque no tengas opciones —" · paso 3 = "sino porque nadie te había mostrado los números reales" · paso 4 = "En Luxor Solar llevamos 25 años… Sin letra pequeña. Sin quedarte solo…".

ANTI-EJEMPLO REAL (esto es una Comercial larga, NO una Principal): «Ayudo a dueños de negocios con cita previa a tener un sistema que atiende, califica y agenda 24/7 — para que cada lead que pagaste se convierta en cita sin que tengas que estar encima.» — abre con "Ayudo a", no nombra el dolor con empatía, no quita la culpa, no hay giro de creencia.

## Pulido obligatorio antes de proponer
Relee las tres versiones en voz alta: gramática, ritmo, y que suenen a frase de marca. Anti-ejemplo: "Esto pondrá a correr tu negocio sin tu mirar" → "Tu negocio corriendo sin que tengas que mirarlo". Si una frase nace del lenguaje literal del cliente y está rota, propone la pulida Y la literal, y que el cliente elija. Las tres versiones usan UNA SOLA variante de voz (la del tono aprobado en la fase de tono): voseo, tuteo o ustedeo — jamás mezclados (anti-ejemplo real: "Pagas pauta… Tu sigues" en el statement con "Decís… tenés" en los hooks; y "Tu" sin tilde es error: "Tú").

## Salida
Llama a `propose_section` con las tres completas (la propuesta se rechaza si falta alguna):
- `principal`: string (versión empática de 4 pasos)
- `agresivo`: string
- `comercial`: string
