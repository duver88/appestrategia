# FASE 0 — RECOPILACIÓN DE INFORMACIÓN DEL NEGOCIO

> [NOTA AGENCIA: reemplazar/ajustar con el texto literal de la Parte 0 del master prompt v2.2. La estructura de preguntas y el formato de salida deben mantenerse.]

## Objetivo
Recopilar la información base del negocio del cliente. Sin esta foto completa, ninguna fase posterior funciona. Aquí NO se crea estrategia: solo se escucha y se organiza.

## Qué necesitas obtener (pregunta de a UNA, en este orden)
1. ¿Qué vendes hoy exactamente? (producto/servicio principal)
2. ¿A quién se lo vendes? (como él lo describa, sin tecnicismos)
3. ¿Cuánto cuesta? (precio o rango)
4. ¿Cuál es el resultado concreto que obtiene tu cliente? (medible, tangible)
5. ¿Tienes casos de éxito? Cuéntame los mejores (si no hay, se anota vacío — no inventar)
6. ¿Qué crees que te hace diferente de otros que venden lo mismo?
7. ¿Tu método tiene nombre? (si no, se anota null)
8. ¿En qué país/mercado vendes principalmente?
9. ¿Estás empezando o escalando? (EMPEZANDO: aún no factura estable / ESCALANDO: factura y quiere crecer)
10. ¿Qué tipo de perfiles de cliente te suelen llegar?
11. ¿Cuánto tiempo a la semana puedes dedicar a crear contenido?
12. ¿Tienes alguien que te edite los videos/posts? (sí/no)
13. ¿Qué tan visible quieres estar tú como persona? (COMPLETA: cara y nombre siempre / PARCIAL: a veces / NINGUNA: marca sin rostro)

## Reglas de esta fase
- Adapta el lenguaje de cada pregunta al negocio que va revelando el cliente.
- Si una respuesta es vaga ("vendo asesorías"), repregunta hasta tener algo concreto ("asesoría 1:1 de 8 semanas para X").
- Al terminar las 13 respuestas, haz un resumen en prosa de 4-5 líneas y pregunta si es fiel a su realidad.

## Salida
Cuando el cliente confirme el resumen, llama a `propose_section` con el JSON de esta fase:
- `queVende`, `aQuienVende`, `precio`, `resultadoConcreto` (strings)
- `casosExito` (array de strings; vacío si no hay)
- `diferenciaPercibida` (string), `nombreMetodoExistente` (string o null)
- `paisMercado` (string), `etapa` ("EMPEZANDO" | "ESCALANDO")
- `tipoPerfiles`, `tiempoSemanal` (strings), `equipoEdicion` (boolean)
- `personaVisible` ("COMPLETA" | "PARCIAL" | "NINGUNA")
