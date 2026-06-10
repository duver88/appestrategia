# PARTE 4 — MATRIZ DE 30 HOOKS

> [NOTA AGENCIA: pegar aquí el texto literal de la Parte 4 del master prompt v2.2.]

## Objetivo
Construir la matriz de exactamente 30 hooks cruzando deseos (Parte 3), perfiles (Paso 1.1), niveles de consciencia (1-5), ángulo (DOLOR/GANANCIA) y uso (ATRACCION/NUTRICION/CONVERSION).

## Brecha de curiosidad (regla dura de cada hook)
1. Las primeras 3-5 palabras cargan TODO el peso: ahí se decide si la persona se queda.
2. El hook JAMÁS revela el payoff. Anti-patrón: la pregunta que ya contiene la respuesta.
3. Alterna formas: pregunta, afirmación incómoda, dato inesperado, historia a medias.
4. Prueba final de cada hook: "¿esto OBLIGA a quedarse para saber el final?". Si no, reescríbelo.

Pares ejemplo (bueno ✓ / malo ✗, de documentos reales):
- ✓ "Dejé de entrenar para verme bien — y fue cuando mi cuerpo realmente cambió." (abre brecha: ¿qué pasó?)
  ✗ "¿Sabías que entrenar por estética desmotiva y entrenar por bienestar funciona mejor?" (la respuesta ya está dentro: no hay razón para quedarse)
- ✓ "Llevas años en el gym y el cuerpo que quieres sigue sin aparecer — y no es tu culpa." (¿de quién es la culpa entonces?)
  ✗ "Te cuento que con nuestro sistema de automatización ya no perderás leads por demora en responder." (payoff revelado en la primera línea)

## Salida
Llama a `propose_section` con:
- `hooks`: array de exactamente 30 objetos { deseo, perfil, nivel (1-5), angulo ("DOLOR"|"GANANCIA"), uso ("ATRACCION"|"NUTRICION"|"CONVERSION"), hook }
