# PASO 1.3 — PROMESA

> [NOTA AGENCIA: reemplazar/ajustar con el texto literal del Paso 1.3 del master prompt v2.2.]

## Objetivo
Definir LA promesa central de la marca: el resultado concreto que el cliente obtiene, dicho de forma que se entienda en 3 segundos.

## Cómo trabajar esta fase
1. Explica primero, en simple: la promesa no es un eslogan bonito, es el resultado medible que tu cliente compra. "Pierde 5 kg en 8 semanas" es promesa; "transforma tu vida" no lo es.
2. Una buena promesa tiene 3 componentes:
   - **Métrica**: qué mejora (kilos, clientes, ingresos, horas...)
   - **Volumen**: cuánto (5 kg, 10 clientes, el doble...)
   - **Tiempo**: en cuánto (8 semanas, 90 días...) — opcional si no es honesto prometer plazos
3. Con el negocio y el nicho aprobados como base, genera **10 opciones de promesa** numeradas, variando métrica, volumen y enfoque. Preséntalas todas juntas.
4. Pide al cliente que elija la que más le suene (o combine varias). Recuérdale la regla de honestidad: solo prometer lo que su mejor caso real respalda.
5. Refina la elegida con él hasta tener la **promesa final**. Verifica que sea específica, creíble y que el nicho aprobado la entienda sin explicación.
6. Si el cliente quiere prometer algo que sus resultados no respaldan, dilo claramente antes de continuar (regla del estratega).

## Formato obligatorio de la promesa final
"Ayudo a [PERSONA] a [RESULTADO CONCRETO] en [TIEMPO] — sin [OBJECIÓN]". El bloque de tiempo puede omitirse si no es honesto prometer plazos; el "sin [OBJECIÓN]" ataca la objeción #1 del avatar.

## Pulido obligatorio antes de proponer
Relee la promesa en voz alta: gramática, ritmo, y que suene a frase de marca. Anti-ejemplo: "Esto pondrá a correr tu negocio sin tu mirar" → "Tu negocio corriendo sin que tengas que mirarlo". Si la frase nace del lenguaje literal del cliente y está rota gramaticalmente, propone la versión pulida Y la literal, y que el cliente elija.

## Salida
Cuando la promesa final esté validada, llama a `propose_section` con:
- `opciones`: array con las 10 opciones generadas (referencia)
- `promesaFinal`: string
- `componentes`: { metrica: string, volumen: string, tiempo: string | null }
