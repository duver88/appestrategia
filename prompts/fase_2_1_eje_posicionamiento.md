# PASO 2.1 — EJE DE POSICIONAMIENTO

## TEXTO LITERAL DEL MASTER v2.2
PARTE 2 — POSICIONAMIENTO DE MARCA

IMPORTANTE: Construir según el eje diagnosticado en la Parte 0.5.
───────────────────────────────────────────────────────────────────────
PASO 2.1 — EJE DE POSICIONAMIENTO
───────────────────────────────────────────────────────────────────────

## Objetivo
Desarrollar el eje de posicionamiento diagnosticado en la Parte 0.5.

<!-- EJE:CREENCIA_CONTRARIA -->
### Texto literal del master (CREENCIA_CONTRARIA)
OPCIÓN A — CREENCIA CONTRARIA:
EXPLICACIÓN PARA EL CLIENTE:
"La creencia contraria es la verdad que el mercado necesita escuchar

pero nadie le ha dicho con precisión. No es ser polémico — es
señalar por qué la forma en que todos abordan el problema está
fallando, y por qué tu enfoque es diferente."
Estructura:
- La narrativa dominante del mercado: [lo que todos dicen]
- La verdad que nadie dice: [lo que el cliente sabe por experiencia]
- El costo de seguir la idea vieja: [qué le cuesta al cliente]
- El beneficio de la idea correcta: [qué gana adoptándola]
Generar 2 versiones:
1. Agresiva — para atracción fría
2. Consultiva — para nutrición y conversión
PROCESO DE REDACCIÓN:
1. Escribir la versión larga primero
2. Contar las palabras exactas
3. Reducir exactamente un 40% sin perder fuerza
4. Validar con el cliente antes de fijar
Fórmula: Pairing × Consistencia = Asociación en la mente del mercado.
Esta tesis se repite en CADA pieza de contenido — nunca cambia.
───────────────────────────────────────────────────────────────────────

## Opción A — Creencia contraria
Desarrolla: la narrativa dominante del mercado, una versión agresiva del posicionamiento contrario, una versión consultiva, y la tesis unificada.

Genera SIEMPRE, además:
1. **Regla de ejecución — Pairing × Consistencia = Asociación**, redactada para el cliente: esta tesis se repite en CADA pieza de contenido desde ángulos distintos; el objetivo no es variedad temática, es instalación de asociación en la mente del mercado.
2. **Señal de que funciona**: 2 ejemplos de DMs hipotéticos que el cliente recibiría cuando la tesis se instale, escritos en el lenguaje literal del avatar (ej. del caso ideal: "vi tu video y me di cuenta que llevo años moviéndome desde el castigo").

### Pulido obligatorio antes de proponer
Relee cada frase central en voz alta: gramática, ritmo, y que suene a frase de marca. Anti-ejemplo: "Esto pondrá a correr tu negocio sin tu mirar" → "Tu negocio corriendo sin que tengas que mirarlo". Si una frase nace del lenguaje literal del cliente y está rota, propone la versión pulida Y la literal, y que el cliente elija.

### Salida
Llama a `propose_section` con:
- `tipo`: "CREENCIA_CONTRARIA"
- `narrativaDominante`, `versionAgresiva`, `versionConsultiva`, `tesisUnificada`: strings
- `reglaEjecucion`: string (la regla redactada para el cliente)
- `senalesDeExito`: array de exactamente 2 strings (los DMs hipotéticos)
<!-- /EJE:CREENCIA_CONTRARIA -->

<!-- EJE:PROCESO -->
### Texto literal del master (PROCESO)
OPCIÓN B — DIFERENCIADOR DE PROCESO:
EXPLICACIÓN PARA EL CLIENTE:
"Tu diferenciador de proceso explica por qué la forma en que
tú haces las cosas produce resultados que otros no logran.
Es tu metodología hecha visible."
Estructura:
"La mayoría [hace X así],
nosotros [lo hacemos diferente — proceso concreto]
porque [razón basada en evidencia],
lo que produce [resultado específico]."
Generar 5 a 7 versiones. El cliente elige las más poderosas.
El contenido mensual muestra el proceso internamente.
───────────────────────────────────────────────────────────────────────

## Opción B — Proceso
Desarrolla 5 a 7 versiones del posicionamiento por proceso propio.

### Salida
Llama a `propose_section` con:
- `tipo`: "PROCESO"
- `versiones`: array de 5 a 7 strings
<!-- /EJE:PROCESO -->

<!-- EJE:RESULTADO -->
### Texto literal del master (RESULTADO)
OPCIÓN C — AUTORIDAD POR RESULTADO:
EXPLICACIÓN PARA EL CLIENTE:
"Tu posicionamiento se basa en los resultados reales que produces.

Los casos de éxito de tus clientes son tu argumento principal."
Construir Credibility Bank robusto:
TEMA → CASO REAL → MÉTRICA → RESULTADO → TIEMPO
Mínimo 7 casos reales organizados por tipo de cliente y problema.
REGLA: Solo casos reales. Si no hay casos documentados —
construir placeholders en lenguaje humano real que suenen
a personas reales. El cliente los revisa y reemplaza con
los casos reales cuando estén disponibles.
Los placeholders deben:
- Sonar como personas reales hablando — no como copy de IA
- Describir una situación concreta y reconocible
- Usar lenguaje coloquial del mercado
- Nunca sonar artificiales, robóticos ni genéricos
───────────────────────────────────────────────────────────────────────
OPCIÓN D — COMBINACIÓN PROCESO + RESULTADO:
Construir Opción B y Opción C en paralelo.
El proceso explica POR QUÉ. Los resultados demuestran QUE funciona.
───────────────────────────────────────────────────────────────────────

## Opción C — Resultado
El posicionamiento se sostiene en casos y métricas; los casos concretos se construyen en el Paso 2.4 (Credibility Bank).

### Salida
Llama a `propose_section` con:
- `tipo`: "RESULTADO"
<!-- /EJE:RESULTADO -->

<!-- EJE:COMBINACION -->
### Texto literal del master (COMBINACION)
OPCIÓN A — CREENCIA CONTRARIA:
EXPLICACIÓN PARA EL CLIENTE:
"La creencia contraria es la verdad que el mercado necesita escuchar

pero nadie le ha dicho con precisión. No es ser polémico — es
señalar por qué la forma en que todos abordan el problema está
fallando, y por qué tu enfoque es diferente."
Estructura:
- La narrativa dominante del mercado: [lo que todos dicen]
- La verdad que nadie dice: [lo que el cliente sabe por experiencia]
- El costo de seguir la idea vieja: [qué le cuesta al cliente]
- El beneficio de la idea correcta: [qué gana adoptándola]
Generar 2 versiones:
1. Agresiva — para atracción fría
2. Consultiva — para nutrición y conversión
PROCESO DE REDACCIÓN:
1. Escribir la versión larga primero
2. Contar las palabras exactas
3. Reducir exactamente un 40% sin perder fuerza
4. Validar con el cliente antes de fijar
Fórmula: Pairing × Consistencia = Asociación en la mente del mercado.
Esta tesis se repite en CADA pieza de contenido — nunca cambia.
───────────────────────────────────────────────────────────────────────

OPCIÓN B — DIFERENCIADOR DE PROCESO:
EXPLICACIÓN PARA EL CLIENTE:
"Tu diferenciador de proceso explica por qué la forma en que
tú haces las cosas produce resultados que otros no logran.
Es tu metodología hecha visible."
Estructura:
"La mayoría [hace X así],
nosotros [lo hacemos diferente — proceso concreto]
porque [razón basada en evidencia],
lo que produce [resultado específico]."
Generar 5 a 7 versiones. El cliente elige las más poderosas.
El contenido mensual muestra el proceso internamente.
───────────────────────────────────────────────────────────────────────

## Opción D — Combinación
Desarrolla ambos bloques: creencia contraria completa + versiones por proceso.

### Salida
Llama a `propose_section` con:
- `tipo`: "COMBINACION"
- `narrativaDominante`, `versionAgresiva`, `versionConsultiva`, `tesisUnificada`: strings
- `reglaEjecucion`: string · `senalesDeExito`: array de 2 strings (igual que la Opción A)
- `versiones`: array de 5 a 7 strings
<!-- /EJE:COMBINACION -->
