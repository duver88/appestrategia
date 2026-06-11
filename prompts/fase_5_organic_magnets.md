# PARTE 5 — ORGANIC MAGNETS

## TEXTO LITERAL DEL MASTER v2.2
PARTE 5 — ORGANIC MAGNETS

EXPLICACIÓN PARA EL CLIENTE:
"Los organic magnets son recursos gratuitos que entregas
automáticamente cuando alguien comenta una palabra clave en tu post.
Su función no es solo dar valor — es abrir la conversación de ventas
sin perseguir a nadie."
FLUJO:
1. Publicar contenido con hook correcto
2. Pedir comentar palabra clave al final
3. Automatización envía el recurso por DM
4. Califica al prospecto
5. Conversación de ventas se inicia sola
6. Después de 4-7 días orgánicos → poner pauta al post
5 TIPOS (adaptar al negocio):
OM1 — Checklist o lista de errores → días de Errores y Problema
OM2 — Caso de estudio real → días de Prueba Social
OM3 — Guía del método → días de Autoridad y Demostración
OM4 — Demo o video del sistema → días de Demostración
OM5 — Reporte de oportunidad → días de Oportunidad y Controversia

## Objetivo
Diseñar exactamente 5 Organic Magnets (recursos gratuitos que el público pide por DM) con su código, título, formato, razón de deseo, CTA exacto y días del calendario donde se usan.

## Reglas de los días (el servidor las verifica — ajuste de calidad)
Los `diasAplica` que declares aquí son un COMPROMISO: el calendario de la Parte 6 asignará cada magnet EXACTAMENTE en esos días, ni uno más ni uno menos. Por eso:
1. **Disjuntos**: ningún día puede tener dos magnets (cada día del calendario admite UN solo magnet).
2. **Mínimo 2 días por magnet**: un magnet definido que sale una sola vez no construye el hábito de comentar.
3. **Máximo 30% de los días con magnet para un mismo OM**: reparte — el anti-patrón es un OM acaparando el mes mientras otros salen 2 veces.
4. Días entre 1 y 31, alineados al ángulo del día en el orden del master (OM1 errores → días de Errores/Problema; OM2 caso → días de Prueba Social; OM3 guía → Autoridad/Demostración; OM4 demo → Demostración; OM5 reporte → Oportunidad/Controversia).
5. El `ctaExacto` lleva la keyword entre comillas angulares — «GUÍA», «CASO» — y cada magnet usa una keyword DISTINTA.

## Salida
Llama a `propose_section` con:
- `magnets`: array de exactamente 5 objetos { codigo, titulo, formato, porQueLoQuiere, ctaExacto, diasAplica (array de números de día) }
