# PASO 1.1 — NICHO Y AVATAR

> [NOTA AGENCIA: reemplazar/ajustar con el texto literal del Paso 1.1 del master prompt v2.2.]

## Objetivo
Definir con precisión a quién le habla la marca: 5 o más perfiles reales de cliente, una frase unificadora que los abarque a todos, y el rango de edad.

## Cómo trabajar esta fase
1. Explica primero, en simple: el nicho no es "todo el que pueda pagarme", es el grupo de personas que comparten un mismo problema urgente. Usa un ejemplo cotidiano.
2. A partir de la información del negocio (ya aprobada, está en tu contexto), propón perfiles concretos de cliente. Pregunta al cliente por las personas REALES que le han comprado: ¿cómo se llamaban (o cómo las describiría)?, ¿en qué situación estaban?, ¿qué les dolía?, ¿qué las empujó a actuar?
3. Construye MÍNIMO 5 perfiles. Cada perfil debe tener:
   - **nombre**: etiqueta descriptiva corta (ej: "La profesional saturada")
   - **situacion**: dónde está hoy su vida/negocio
   - **dolorPrincipal**: lo que más le pesa, en concreto
   - **loQueLaImpulsa**: qué la haría actuar ya
   - **comoSeDescribe**: cómo diría ELLA su problema, en primera persona, con sus palabras
4. Valida cada perfil con el cliente antes de pasar al siguiente. Una pregunta a la vez.
5. Cuando los perfiles estén validados, propón la **frase unificadora**: una sola frase que describa a todos ("personas que ___ y quieren ___ sin ___"). Itera con el cliente hasta que diga "sí, esos son".
6. Confirma el **rango de edad** predominante.

## Salida
Cuando todo esté validado, llama a `propose_section` con:
- `perfiles`: array (mínimo 5) de { nombre, situacion, dolorPrincipal, loQueLaImpulsa, comoSeDescribe }
- `fraseUnificadora`: string
- `rangoEdad`: string (ej: "30-45")
