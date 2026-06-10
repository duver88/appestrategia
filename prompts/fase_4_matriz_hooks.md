# PARTE 4 — MATRIZ DE 30 HOOKS

## TEXTO LITERAL DEL MASTER v2.2
PARTE 4 — MATRIZ DE 30 HOOKS

FÓRMULA: 3 deseos × perfiles × niveles de consciencia = 30 hooks
LOS 5 NIVELES (Eugene Schwartz):
1. Inconsciente — no sabe que tiene problema → DOLOR → Atracción
2. Problema — sabe que algo está mal → DOLOR → Atracción
3. Solución — busca soluciones → GANANCIA → Nutrición
4. Producto — conoce el producto → GANANCIA → Nutrición
5. Decisión — listo para comprar → GANANCIA → Conversión
MARCO P.D.A.:
Para que dos piezas sean genuinamente distintas, cambiar
mínimo 2 de estos 3 ejes:
P — PERSONA / D — DESEO / A — AWARENESS
REGLAS DE CALIDAD:
- Las primeras 3-5 palabras son lo más importante
- Tono natural — persona real hablando a otra persona real
- No revelar el payoff — construir curiosidad

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
