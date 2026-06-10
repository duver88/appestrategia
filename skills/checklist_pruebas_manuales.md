# CHECKLIST DE PRUEBAS MANUALES — LIONSCORE CONTENT ENGINE
## Para que TÚ verifiques en el navegador que todo funciona — sin leer código

Cómo usarlo: sigue cada prueba en orden, haz exactamente los pasos y compara con el "Resultado esperado". Marca ✅ o ❌. Cualquier ❌ se lo reportas a Claude Code copiando el número de la prueba y lo que pasó en realidad. Necesitas: tu acceso de super admin + un cliente de prueba (crea uno llamado "Cliente Test" para no tocar clientes reales).

---

## BLOQUE 1 — EL CLIENTE (lo más importante: que ellos no noten nada raro)

**P1. Login y reanudación**
Pasos: entra con un cliente real (o pídele a uno que lo haga contigo) → cierra el navegador por completo → vuelve a entrar.
Esperado: aterriza exactamente donde estaba — misma fase, misma conversación, secciones aprobadas intactas. Nada se reinició.

**P2. Conversación y guardado**
Pasos: con el Cliente Test, escribe un mensaje en el chat → apaga el WiFi ANTES de que la IA termine de responder → vuelve a conectar y recarga.
Esperado: tu mensaje sigue ahí (no se perdió) y puedes reintentar. Aparece el indicador "Guardado".

**P3. Aprobar una sección**
Pasos: avanza con el Cliente Test hasta que la IA proponga una sección → pulsa "Pedir cambios" y pide algo concreto → cuando vuelva la propuesta, pulsa "Aprobar y continuar".
Esperado: la corrección se aplicó de verdad; al aprobar, el nodo del rail se enciende, la barra de progreso sube y la IA abre la fase siguiente explicándola en lenguaje simple.

**P4. Orden estricto de fases**
Pasos: intenta saltarte una fase (pídele a la IA en el chat "vamos directo al calendario").
Esperado: la IA se niega amablemente y te devuelve a la fase actual. No hay forma de saltar.

**P5. El cliente no ve lo que no debe**
Pasos: con la sesión del Cliente Test, intenta entrar a `/admin` escribiendo la URL directamente. Luego copia la URL de un proyecto de OTRO cliente (la sacas desde tu panel) y pégala en el navegador del Cliente Test.
Esperado: ambas cosas bloqueadas (pantalla de "no autorizado" o redirección). Esto es CRÍTICO — si ve algo ajeno, detén todo y repórtalo de inmediato.

**P6. Móvil**
Pasos: abre la sesión del cliente desde tu teléfono.
Esperado: el chat ocupa la pantalla completa, el menú abre el panel de progreso deslizante, el input no queda tapado por el teclado, los botones de aprobar se tocan fácil.

---

## BLOQUE 2 — MEMBRESÍA (el negocio)

**P7. Vencimiento automático**
Pasos: en el panel admin, ponle al Cliente Test fecha de vencimiento de AYER → intenta entrar como ese cliente.
Esperado: no puede usar el chat ni descargar PDFs; ve la pantalla de "membresía vencida" con tu contacto. Sus datos NO se borraron.

**P8. Renovación**
Pasos: desde el panel, extiéndele la membresía un mes → el cliente vuelve a entrar.
Esperado: recupera TODO su avance exactamente como estaba. Cero pérdida.

**P9. Aviso previo**
Pasos: ponle vencimiento dentro de 3 días → entra como el cliente.
Esperado: ve un aviso discreto de que su membresía vence pronto (sin bloquearlo).

**P10. Alerta para ti**
Pasos: con ese vencimiento a 3 días, abre el panel admin.
Esperado: el Cliente Test aparece destacado en "por vencer en 7 días".

---

## BLOQUE 3 — PANEL SUPER ADMIN

**P11. Solo tú entras**
Pasos: cierra sesión → intenta entrar a `/admin` sin sesión → luego entra con la cuenta de un cliente.
Esperado: bloqueado en ambos casos. Solo tu cuenta de super admin entra.

**P12. API keys protegidas**
Pasos: abre el módulo de API → mira cómo se muestra cada key → abre las herramientas del navegador (clic derecho → Inspeccionar → pestaña Red/Network) → recarga la página y revisa las respuestas que llegan.
Esperado: la key se ve enmascarada en pantalla (tipo `sk-ant-····-x4F2`) Y TAMPOCO viaja completa en las respuestas de red. Si la ves completa en Network: hallazgo CRÍTICO.

**P13. Probar conexión**
Pasos: pulsa "Probar conexión" en un proveedor con key buena → luego edita la key poniéndole basura y prueba de nuevo → restaura la correcta.
Esperado: primera prueba ✓ con fecha; segunda falla con mensaje claro; al restaurar, vuelve a ✓ sin reiniciar nada.

**P14. Editor de prompts en vivo**
Pasos: edita el prompt de la fase donde está el Cliente Test — agrégale al final: "Termina cada respuesta con la palabra PRUEBA-AUDITORIA" → guarda → como cliente, manda un mensaje → luego, en el historial de versiones, restaura la versión anterior → manda otro mensaje.
Esperado: el primer mensaje termina con PRUEBA-AUDITORIA (el cambio aplicó al instante, sin redeploy); tras restaurar, deja de aparecer. El historial muestra ambas versiones.

**P15. Consumo y costos**
Pasos: después de las conversaciones de prueba, abre el módulo de Consumo.
Esperado: ves el gasto del mes con desglose por cliente, y el Cliente Test aparece con tokens y costo en dólares de las pruebas que acabas de hacer (no en cero).

**P16. Control de proyectos**
Pasos: abre el proyecto del Cliente Test desde el panel → lee su conversación → usa "retroceder fase" sobre la última sección aprobada → entra como el cliente.
Esperado: tú puedes leer pero NO escribir en su chat; tras retroceder, el cliente ve esa sección como pendiente de aprobar otra vez, sin perder el contenido.

**P17. Alta de cliente**
Pasos: crea un cliente nuevo desde el panel → copia el link de invitación → ábrelo en ventana de incógnito.
Esperado: el link funciona, obliga a poner contraseña nueva, y aterriza en su proyecto Mes 1 con el mensaje de bienvenida.

---

## BLOQUE 4 — EL PDF (lo que paga el cliente)

**P18. Generación**
Pasos: con un proyecto que tenga todas las fases aprobadas (o el de Cindy), genera el PDF.
Esperado: se descarga sin error y abre bien en el teléfono y la computadora.

**P19. Revisión del documento — abre el PDF y revisa con lupa:**
- Portada con color de marca e índice completo
- Header y footer con número de página en TODAS las páginas
- Cada sección abre con su caja explicativa
- El calendario tiene los colores: verde Atracción, morado Nutrición, rojo Conversión
- La semana 4 muestra el FOMO real confirmado
- Página de cierre con fondo de marca y texto largo bien redactado
- Busca (Ctrl+F) "Vehículo Azul" → cero resultados
- El contenido corresponde a lo que el cliente aprobó en el chat — compara 3 secciones al azar palabra por palabra
Esperado: todo ✓. Si el contenido difiere de lo aprobado, repórtalo como CRÍTICO: significa que el PDF no está saliendo de las secciones aprobadas.

**P20. Diseño general de la app**
Pasos: recorre cliente y admin mirando con ojo de diseñador.
Esperado: cero emojis en toda la interfaz; el cian aparece poco (fase activa, botón principal, progreso) y nunca como texto sobre fondo blanco; todo en Nunito Sans; iconos consistentes.

---

## CIERRE

Resultado final: ___ de 20 pruebas en ✅.

- 20/20 → el sistema está verificado. Borra el Cliente Test.
- Cualquier ❌ en P5, P7, P11 o P12 → **detén el uso con clientes reales** y pásale a Claude Code la auditoría técnica (`auditoria_lionscore.md`) marcando ese hallazgo como prioridad.
- ❌ en las demás → repórtalas una por una: "Falló la prueba P14: hice X y pasó Y en vez de Z".

Recomendación: repite P1–P5 + P18 después de CADA cambio futuro que despliegues. Son 10 minutos y es tu seguro contra regresiones.
