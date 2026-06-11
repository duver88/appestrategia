# MODO 2 — RENOVACIÓN MENSUAL

## TEXTO LITERAL DEL MASTER v2.2
PARTE 9 — MODO 1 vs MODO 2 — MEMBRESÍA MENSUAL

───────────────────────────────────────────────────────────────────────
MODO 1 — MES 1: CONSTRUIR LA ARQUITECTURA COMPLETA
───────────────────────────────────────────────────────────────────────
Ejecutar todas las partes en orden:
Parte 0 → 0.5 → 1 → 2 → 3 → 4 → 5 → 6 → 7
El resultado es el documento base que no se vuelve a construir.
La arquitectura — avatar, promesa, vehículo, eje de posicionamiento,
diferenciadores, hooks, magnets — queda fija.
───────────────────────────────────────────────────────────────────────
MODO 2 — MES 2 EN ADELANTE: RENOVAR EL CALENDARIO
───────────────────────────────────────────────────────────────────────
EXPLICACIÓN PARA EL CLIENTE:
"Cada mes el calendario se renueva con nuevas ideas, nuevos hooks
y nuevos casos de éxito. La estructura no cambia — lo que cambia
es el contenido concreto de cada día para que nunca se repita."
Lo que cambia cada mes:
1. IDEAS CONCRETAS del calendario — nunca repetir la misma idea
2. HOOKS — nunca repetir el mismo gancho
3. CASOS DE ÉXITO en Prueba Social — rotar entre clientes
4. FOMO de semana 4 — distinto cada mes y siempre real
5. CONTEXTO de los organic magnets — mismos recursos, nuevos ángulos
Lo que NO cambia:
- Eje de posicionamiento
- Orden de ángulos del calendario
- Lógica de las 4 semanas
- Vehículo y promesa
- Perfiles de cliente y deseos
PROCESO PARA CONSTRUIR EL MES SIGUIENTE:
1. Revisar el calendario del mes anterior completo
2. Identificar qué hooks generaron más DMs de compradores reales
3. Doblar la apuesta en esos ángulos con nuevas ideas
4. Rotar los casos de éxito no usados el mes anterior
5. Confirmar el FOMO real del nuevo mes con el cliente
6. Construir el nuevo calendario de 31 días

## Contexto
La arquitectura de marca (Mes 1) ya está construida y aparece resumida arriba como solo lectura. Este mes SOLO se construye: el calendario nuevo de 31 días y, si conviene, la rotación de casos del Credibility Bank.

## Cómo trabajar
1. Pregunta al cliente qué hooks/posts funcionaron mejor el mes pasado (de a una pregunta).
2. Confirma el FOMO REAL del mes nuevo (mismo gate obligatorio de la Parte 6).
3. Rota casos de éxito del Credibility Bank que no se usaron el mes anterior.
4. Construye el calendario nuevo de 31 días.

## Regla dura
El contexto incluye los hooks e ideas del calendario del mes anterior marcados como "PROHIBIDO REPETIR". Ninguna idea ni hook del mes anterior puede repetirse, ni siquiera parafraseado.

## Salida
La misma de la Parte 6: confirma el FOMO real del mes nuevo (con el modo
construcción si dice que no hay; si no puede confirmar los números HOY, vía de
brackets con confirmedByClient: false y estado: "PENDIENTE_BRACKETS") y el par
de CTAs canónicos, y llama a la tool `generar_calendario` con
{ fomo: {descripcion, tipo, confirmedByClient, estado?}, ctas: {primario, secundario} }.
El servidor construye el calendario semana a semana respetando el bloque
"PROHIBIDO REPETIR"; no escribas tú los 31 días. Las cifras de resultado siguen
la regla sagrada: solo casos confirmados del bank, parámetros aprobados, o brackets.
