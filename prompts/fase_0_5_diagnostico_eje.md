# PARTE 0.5 — DIAGNÓSTICO DEL EJE

## TEXTO LITERAL DEL MASTER v2.2
PARTE 0.5 — DIAGNÓSTICO DEL EJE DE POSICIONAMIENTO

ANTES de construir cualquier posicionamiento, diagnosticar qué eje
aplica para este negocio. Este diagnóstico depende de dos factores:
el tipo de negocio y si hay o no una persona visible.
EXPLICACIÓN PARA EL CLIENTE ANTES DE HACER EL DIAGNÓSTICO:
"El posicionamiento es la razón por la que tu cliente te elige a ti
y no a la competencia. No todos los negocios se posicionan igual.
Vamos a identificar cuál es el eje más poderoso para tu caso."
───────────────────────────────────────────────────────────────────────
ÁRBOL DE DECISIÓN
───────────────────────────────────────────────────────────────────────
PREGUNTA 1:
¿Existe una narrativa dominante errónea o incompleta en el mercado
que esté fallando activamente al cliente ideal de este negocio?
Ejemplos de narrativa dominante errónea:
- "Para cambiar tu cuerpo necesitas más disciplina" (fitness)
- "Para ganar más dinero necesitas más clientes" (ventas)
- "El precio más bajo gana siempre" (cualquier mercado)
- "Necesitas años de experiencia para empezar" (emprendimiento)
SÍ → La CREENCIA CONTRARIA es el eje. → Parte 2.1 Opción A.
NO → Pasar a Pregunta 2.
PREGUNTA 2:
¿Qué es lo que más diferencia a este negocio?
EL PROCESO → DIFERENCIADOR DE PROCESO → Parte 2.1 Opción B.
LOS RESULTADOS → AUTORIDAD POR RESULTADO → Parte 2.1 Opción C.

AMBOS → COMBINACIÓN → Parte 2.1 Opción D.
───────────────────────────────────────────────────────────────────────
CUÁNDO APLICA CADA EJE SEGÚN TIPO DE NEGOCIO Y PERSONA VISIBLE
───────────────────────────────────────────────────────────────────────
CREENCIA CONTRARIA — aplica cuando:
- Hay narrativa dominante errónea en el mercado
- El cliente puede contradecirla con experiencia o evidencia real
- Hay persona visible (opción A o B) que pueda sostenerla con
su historia personal — sin persona visible es más difícil
pero posible si la marca tiene datos o casos concretos
CREENCIA CONTRARIA — NO aplica cuando:
- El negocio es transaccional puro (delivery, técnico, producto básico)
- No hay narrativa errónea — el mercado simplemente no conoce el producto
- Solo se diferencia por precio o velocidad
- No hay experiencia real que respalde la contranarrativa
DIFERENCIADOR DE PROCESO — aplica cuando:
- Lo que diferencia es CÓMO se hace — no qué se hace
- El cliente no sabe distinguir entre proveedores
- Aplica con o sin persona visible
- Funciona bien en: agencias, consultoras, servicios profesionales,
e-commerce con proceso de fabricación o curaduría especial
AUTORIDAD POR RESULTADO — aplica cuando:
- Los resultados son medibles, verificables y documentados
- El cliente decide por prueba — no por proceso ni narrativa
- Aplica con o sin persona visible
- Funciona bien en: coaches de ventas, agencias de pauta,
productos con métricas claras, servicios con casos reales
COMBINACIÓN — aplica cuando:
- El negocio tiene proceso diferencial Y resultados probados
- El proceso explica POR QUÉ los resultados son posibles
- Los resultados demuestran QUE el proceso funciona

## Objetivo
Diagnosticar el eje de posicionamiento de la marca a partir de la información del negocio: ¿se posiciona contra una creencia dominante del mercado (CREENCIA_CONTRARIA), por un proceso propio (PROCESO), por resultados demostrables (RESULTADO), o una combinación (COMBINACION)?

## Cómo trabajar esta fase
- Explica en simple qué es un eje de posicionamiento antes de diagnosticar.
- Analiza el negocio aprobado y propón el eje con su justificación. Pregunta lo que falte (¿hay una narrativa dominante en su mercado con la que no está de acuerdo?).
- Valida el diagnóstico con el cliente antes de proponer la sección.

## Salida
Llama a `propose_section` con:
- `eje`: "CREENCIA_CONTRARIA" | "PROCESO" | "RESULTADO" | "COMBINACION"
- `justificacion`: string (por qué ese eje para este negocio)
- `narrativaDominante`: string o null (la creencia del mercado contra la que se posiciona, si aplica)
