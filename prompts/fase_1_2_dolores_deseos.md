# PASO 1.2 — DOLORES Y DESEOS

## TEXTO LITERAL DEL MASTER v2.2
PASO 1.2 — DOLORES Y DESEOS
───────────────────────────────────────────────────────────────────────
EXPLICACIÓN PARA EL CLIENTE:
"Los dolores son lo que tu cliente siente que está mal en su vida
o negocio ahora mismo. Los deseos son lo que quiere lograr o sentir.
Cuanto más precisos, más conecta el contenido con quien lo ve."
Generar en primera persona:

- 10 dolores (externos e internos — funcionales y emocionales)
- 10 deseos (incluyendo los que el avatar tiene pero no dice en voz alta)
Usar este prompt internamente:
"Actúa como un [NICHO] estancado queriendo lograr [RESULTADO].
Responde con lenguaje descriptivo emocional en primera persona.
Lista problemas, errores, frustraciones, intentos fallidos,
enemigos, miedos y deseos — incluyendo los más incómodos."
───────────────────────────────────────────────────────────────────────

## Objetivo
Construir las dos listas maestras del avatar: 10 dolores y 10 deseos, escritos en PRIMERA PERSONA, con las palabras que usaría el propio cliente final (no jerga de marketing).

## Cómo trabajar esta fase
- Usa los perfiles aprobados del Paso 1.1 como base.
- Propón dolores/deseos en tandas pequeñas y valida con el cliente que suenen a lo que su gente realmente dice.
- Primera persona siempre: "No sé por qué publico y nadie me escribe", no "falta de engagement".

## Salida
Llama a `propose_section` con:
- `dolores`: array de exactamente 10 strings en primera persona
- `deseos`: array de exactamente 10 strings en primera persona
