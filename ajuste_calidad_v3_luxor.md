Necesio hacer esta mejora analizala bien y dime si hay algo que no entiendas ahi se menciona luxor fue otro domento que analizamos # AJUSTE INCREMENTAL #3 — CALIDAD DEL DOCUMENTO FINAL
## Cierra la brecha entre el output del sistema (caso Hernesto, generado) y el documento ideal hecho a mano (Luxor Solar v2.4)

> **Instrucción para Claude Code:** App en producción. Aplican las skills `lionscore-architecture`, `lionscore-design` y `lionscore-prod-safe` y el protocolo de auditoría (`audit.sh` intocable; tests solo se agregan, jamás se debilitan ni se saltan). Todo cambio de DB es ADITIVO. Dos frentes: **A (código: validadores y plantilla PDF)** y **B (prompts)**. Los prompts viven en `PromptTemplate` con versionado — los cambios del Frente B se aplican creando NUEVAS VERSIONES activas vía script idempotente (`scripts/upgrade-prompts-v4.js`), nunca sobrescribiendo, actualizando en paralelo los archivos seed de `/prompts` para que repo y DB queden alineados. Evidencia base: comparar el PDF generado del proyecto Hernesto contra el documento ideal "LionScore_LuxorSolar_Julio2025.pdf" (hecho a mano — es la referencia de oficio). Leer el código real antes de escribir y adaptar nombres a los existentes.

---

## CONTEXTO — QUÉ MIDE ESTE AJUSTE

Los ajustes #1 y #2 cerraron lo estructural: tildes, columna Ángulo, encabezados de semana, formatos canónicos, bloques de la creencia contraria. El output actual (Hernesto) está a ~90% del ideal. Este ajuste codifica los matices de oficio que el documento hecho a mano (Luxor) tiene y el sistema todavía no produce — y blinda con tests lo que el sistema ya hace MEJOR que el ideal, para que no haya regresiones al copiar el formato de Luxor.

**Hallazgo más grave del caso Hernesto (prioridad 1 de todo el ajuste):** el calendario citó métricas que NO existen en el Credibility Bank — "perdía el 40% de sus leads" (día 26), "18 citas automáticas" (días 15/21/29), "hace 45 días" (día 10) — mientras el bank tenía todos los casos en "Pendiente de confirmar". Esto viola la regla sagrada "prueba social solo desde el Credibility Bank, jamás inventada". Luxor lo resuelve con disciplina de placeholders: brackets `[X]`, "[ciudad]", y notas explícitas "Placeholder hasta documentar con números reales".

---

## FRENTE A — CÓDIGO (validadores y plantilla)

### A1. Validador: cifras del contenido contra el Credibility Bank (PRIORIDAD 1)

Regla de negocio nueva, validada del lado servidor como rechazo a la tool `propose_section` (patrón existente):

1. Toda **métrica de resultado** que aparezca en hooks, ideas centrales del calendario o hooks de la matriz — porcentajes de mejora/pérdida atribuidos a un caso, cantidades de citas/leads/ventas logradas, tiempos de implementación o de resultado, montos ahorrados, "X meses sin pagar", etc. — debe cumplir UNA de dos condiciones:
   - **(a)** Estar respaldada por un caso del Credibility Bank APPROVED cuyo campo de métrica esté **confirmado** (no placeholder). Implementar en el schema del bank un flag explícito `metrica_confirmada: boolean` (cambio aditivo). "Pendiente de confirmar" ⇒ `false`.
   - **(b)** Estar renderizada como **placeholder con brackets** — `$[X]`, `[X]%`, `[X] meses`, `[ciudad]` — y la pieza marcada con nota de placeholder en su idea central (estilo Luxor día 3: "Placeholder hasta documentar con números reales").
2. Si una cifra concreta no cumple (a) ni (b) ⇒ **rechazo de la tool** con error descriptivo que le diga al modelo exactamente qué cifra y qué día/hook violó la regla, para que reformule con brackets o sin la cifra.
3. Implementación sugerida de detección: extraer del texto patrones numéricos de resultado (regex sobre `%`, `$`, "citas", "leads", "meses", "días", "años" adyacentes a números) y cruzar contra las métricas confirmadas del bank del proyecto. Preferir falsos positivos (rechazo que el modelo corrige reformulando) a falsos negativos. Excluir del chequeo las cifras que son **parámetros del negocio aprobados en fases previas** (umbral de recibo "$1.200.000", precios de paquetes, "25 años de trayectoria", "30 años de garantía") — mantener una lista blanca por proyecto alimentada desde las secciones APPROVED de fundamentos.
4. **Tests:** calendario con "perdía el 40% de sus leads" y bank sin métrica confirmada ⇒ rechazado. Mismo calendario con "[X]%" + nota placeholder ⇒ aprobado. Mismo calendario con bank confirmando el 40% ⇒ aprobado.

### A2. Validador cruzado: Organic Magnets ↔ Calendario

En Hernesto, NINGÚN magnet cuadraba (OM1 decía días 1,3,5,8,10 y el calendario tenía otra cosa; el día 11 usaba el CTA de OM3 con la columna Magnet vacía). En Luxor cuadran los 5, día por día. Validar al aprobar la fase del calendario (la última de las dos secciones en aprobarse dispara la validación cruzada):

1. El conjunto de días declarado en cada OM (campo "Días" / "Aplica en") debe ser **exactamente igual** al conjunto de días del calendario que asignan ese magnet.
2. Todo día del calendario cuyo CTA use la **palabra clave de un magnet** debe tener ese magnet en su columna Magnet (no puede haber keyword huérfana).
3. **Distribución:** ningún OM puede concentrar más del **30% de los días con magnet** del mes, y todo OM definido debe aparecer **al menos 2 días**. (Anti-patrón detectado en el propio ideal de Luxor: OM5 en 9 de 31 días mientras OM1 y OM4 salen 2 veces — el validador debe impedir ese desbalance en outputs del sistema.) Límites configurables por proyecto con estos defaults.
4. Si se edita una de las dos secciones después de aprobada, la otra se marca "revisar" (mecanismo existente de invalidación en cascada).
5. **Tests:** mismatch de días ⇒ rechazo con diff legible ("OM1 declara día 5; el calendario asigna OM5 ese día"). Keyword huérfana ⇒ rechazo. OM con 10 apariciones ⇒ rechazo.

### A3. Validador: correspondencia nivel ↔ uso en la Matriz de 30 Hooks

La fórmula del master es: niveles 1-2 (Inconsciente, Problema) = ángulo DOLOR = **Atracción**; niveles 3-4-5 (Solución, Producto, Decisión) = ángulo GANANCIA = **Nutrición o Conversión** (nivel 5 preferentemente Conversión). El propio ideal de Luxor la viola dos veces (hook 17: nivel Problema marcado CONVERSIÓN; hook 26: nivel Inconsciente marcado NUTRICIÓN) — el sistema debe hacerlo mejor que el documento de referencia, como ya pasó con el "Vehículo Azul" de Cindy.

1. Validar cada fila de la matriz: `nivel ∈ {1,2}` ⇒ `angulo = DOLOR` y `uso = Atracción`; `nivel ∈ {3,4,5}` ⇒ `angulo = GANANCIA` y `uso ∈ {Nutrición, Conversión}`; `nivel = 5` ⇒ `uso = Conversión`.
2. Validar la cobertura de la fórmula (ya parcialmente existente): 3 deseos × 5 perfiles, sin celdas duplicadas.
3. **Test:** matriz con un hook nivel 1 marcado NUTRICIÓN ⇒ rechazada con la fila señalada.

### A4. Plantilla PDF: formato Luxor

Cambios de render (solo plantilla y schema aditivo donde se indica; NO tocar el motor de fases):

1. **Portada ficha técnica.** Tabla de metadatos en portada: CLIENTE, METODOLOGÍA (versión), EJE, VEHÍCULO, CARA VISIBLE, CALENDARIO (mes/año), MODO. Todos estos datos ya existen en el proyecto/secciones aprobadas; la cara visible se agrega como campo del proyecto (aditivo) si no existe. **Excepción de jerga:** en la portada y en títulos de sección, la palabra "VEHÍCULO" se permite SOLO en la ficha técnica de portada; el título de la sección dentro del documento debe ser el nombre propio del método ("Sistema 30/30", "Sistema Cero Fugas"), nunca "El Vehículo: …".
2. **Caja "¿Para qué sirve esta sección?"** al inicio de TODAS las secciones (Hernesto la tiene como "Cómo usar esta sección" solo en algunas). El texto de propósito por sección es estático por tipo de sección (vive en la plantilla, no lo genera el modelo) — redactarlos tomando los de Luxor como referencia.
3. **Columna Formato / Persona en el calendario.** Cada día muestra formato + quién da la cara ("Talk & Walk — Wilfer"). Agregar campo `persona` al schema del día (aditivo), con default = cara visible del proyecto; el modelo puede variarlo (ej. "Narración AI", testimonial de cliente).
4. **Semana 4 absorbe los días 22-31.** Si el mes tiene 31 días, el encabezado de la semana 4 cubre 22-31 con su etiqueta estratégica de FOMO; PROHIBIDO renderizar un encabezado "SEMANA 5" sin etiqueta. Marcar los días de FOMO con ★ y renderizar la leyenda de colores (verde/morado/rojo) al final de la tabla.
5. **Cierre personalizado** (el contenido lo cubre B5; aquí solo el bloque de render): página de cierre con síntesis + cita final destacada en caja, estilo Luxor pág. 21.
6. **Regresión obligatoria:** regenerar el PDF de un proyecto de prueba y verificar visualmente contra Luxor en estructura — sin perder nada de lo ya conquistado (tildes, columna Ángulo, encabezados de semana).

### A5. Validador de CTAs canónicos (endurecer el existente)

1. El CTA canónico de conversión es **una acción de máximo 4 palabras** ("Escríbenos", "Ingresa ya") o **patrón keyword** ("Comenta SISTEMA"). "Escríbenos y te contamos todo" (6 palabras, anti-ejemplo de Luxor) ⇒ rechazado.
2. Par canónico configurado por proyecto (máximo 2 CTAs de conversión distintos en el mes), regla ya definida en el ajuste #2 — verificar que esté efectivamente aplicándose y agregar test si no existe.

---

## FRENTE B — PROMPTS (nuevas versiones, restaurables)

### B1. Versión Principal del Brand Statement — OBLIGATORIA

Tercera comparación consecutiva (Duberney, Hernesto) en que falta. El prompt de la fase del Brand Statement debe exigir TRES versiones con nombres fijos: **Principal (empática)**, **Agresiva**, **Comercial**. Para la Principal, dar la estructura explícita en el prompt: *(1) nombrar la situación del cliente con empatía → (2) quitarle la culpa ("no porque no tengas opciones, sino porque nadie te había mostrado…") → (3) revelar la causa real → (4) posicionar la solución con el respaldo de la marca*. Incluir como ejemplo dorado en el prompt la Principal de Luxor ("Cada mes que pasa pagando un recibo de energía alto es plata que se va y nunca vuelve. No porque no tengas opciones — sino porque nadie te había mostrado los números reales…"). El schema Zod de la sección hace las tres versiones **non-nullable**.

### B2. FOMO confirmado con el cliente — nunca inventado, nunca vacío

Regla de dos caras que une los hallazgos de Duberney (FOMO ausente) y Hernesto (FOMO posiblemente inventado):

1. Los elementos de FOMO de la semana 4 (cupos, descuentos, bonus, fechas límite) son **datos del negocio, no creatividad del modelo**. El prompt de la fase del calendario debe exigir confirmación explícita del cliente en la conversación ANTES de proponer la semana 4: el modelo presenta 2-3 opciones de FOMO legítimo según el tipo de negocio (cupos reales de implementación para servicios, ventana tributaria o estacional real, precio de lanzamiento con fecha real) y pregunta cuál es verdad y con qué números.
2. Si el cliente confirma ⇒ el FOMO entra con números concretos (como "10 cupos, 20% de descuento, primer mes gratis").
3. Si el cliente NO confirma en esa sesión ⇒ los elementos entran como **brackets con nota al cliente** (estilo Luxor: "★ = Wilfer completa los brackets del bonus antes de publicar") — y los brackets caen bajo el validador A1, así que el calendario puede aprobarse sin inventar nada.
4. PROHIBIDO al modelo generar números de FOMO no confirmados sin brackets. Citar en el prompt el anti-ejemplo: cupos/descuentos que el cliente nunca mencionó.

### B3. Disciplina de placeholders en TODA generación

Instrucción transversal (agregar a los prompts de Credibility Bank, calendario y matriz): cualquier dato del negocio no confirmado en la conversación o en secciones APPROVED se escribe con brackets — `$[X]`, `[X]%`, `[ciudad]`, `[nombre]` — nunca con un valor inventado plausible. El Credibility Bank cierra con un bloque **"Nota para [nombre del cliente]"** que lista exactamente qué brackets debe completar y por qué ("Un caso con datos concretos vale más que diez genéricos" — tomar la redacción de Luxor pág. 15). Regla adicional: si la idea central de un día marca placeholder, el **hook de ese día también** lleva la cifra en brackets (anti-ejemplo: día 3 de Luxor, que publica "$2.500.000… hoy paga casi cero" en el hook y solo aclara el placeholder en la idea).

### B4. Blindar lo que el sistema ya hace MEJOR que el ideal (anti-regresión)

Al adoptar el formato Luxor, estos elementos del output actual NO pueden perderse. Agregarlos al checklist dorado de verificación y, donde aplique, al schema como non-nullable:

1. **Bloque "Señal de que funciona"** en la creencia contraria (DMs ejemplo) — Hernesto lo trae, Luxor no. Se queda.
2. **Posicionamiento por proceso** (los contrastes "La mayoría hace X / Nosotros Y") — sección fuerte del output actual que Luxor no tiene como tal. Se queda.
3. **CTAs keyword duales** de conversión cuando el negocio tiene automatización de DMs. Se quedan.
4. **Banco de tesis de 10** y **Regla de Pairing × Consistencia** — presentes en ambos, verificar que sigan saliendo.

### B5. Cierre personalizado del documento

El prompt de la fase de cierre debe producir: (1) síntesis de la lógica estratégica del proyecto concreto (no texto genérico reutilizable), (2) cómo conviven los perfiles en el calendario de ese mes, (3) el rol de los magnets, y (4) una **cita final posicionadora** en la voz de la marca, lista para caja destacada ("El mercado no necesita otra empresa de paneles solares. Necesita una que…" — referencia Luxor pág. 21). Anti-ejemplo: cierres plantilla que sirven para cualquier cliente cambiando el nombre.

### B6. Refuerzo del paso de pulido (ya introducido en ajuste #2 — endurecer)

Agregar al paso de pulido dos chequeos explícitos con anti-ejemplos citados en el propio prompt:

1. **Concordancia sintáctica** en diferenciadores y taglines: anti-ejemplos reales "Nosotros el sistema califica automáticamente…" y "Nosotros el sistema atiende 24/7…" (Hernesto). La estructura es "Nosotros + verbo conjugado" o "El sistema + verbo" — nunca ambos sujetos.
2. **Consistencia de voz**: la variante de voz (voseo / tuteo / ustedeo) se decide UNA vez en la fase de tono y se aplica a todo el documento. Anti-ejemplo: Brand Statement de Hernesto mezclando "Pagas pauta… Tu sigues" con "decís… tenés" (y "Tu" sin tilde). El pulido relee Brand Statement, promesa, elevator pitch, taglines y diferenciadores verificando una sola voz.

---

## ANEXO — CORRECCIONES MANUALES AL PDF DE REFERENCIA (no es tarea de Claude Code)

Antes de volver a usar "LionScore_LuxorSolar_Julio2025.pdf" como ejemplo con clientes o como referencia dorada en prompts, corregir a mano:

1. Matriz de hooks: fila 17 (nivel Problema marcado CONVERSIÓN) y fila 26 (nivel Inconsciente marcado NUTRICIÓN) — cruzan la propia fórmula del documento.
2. Día 3 del calendario: poner la cifra del hook en brackets ("pagaba $[X] al mes") mientras el caso no esté documentado.
3. Redistribuir magnets: OM5 aparece 9 de 31 días; OM1 y OM4 solo 2. Mover 2-3 días de OM5 hacia OM1/OM4.

---

## VERIFICACIÓN (completa, antes de pedir aprobación)

1. `npm run test:audit` en verde (existentes + nuevos), `./audit.sh` exit 0.
2. **Regresión de oro:** regenerar un proyecto de prueba completo y producir el PDF. Verificar contra el checklist dorado: tildes ✓, columna Ángulo ✓, encabezados de semana con estrategia ✓ (sin "Semana 5"), portada ficha técnica ✓, cajas de propósito en todas las secciones ✓, columna Formato/Persona ✓, tres versiones del Brand Statement incluida la Principal ✓, Señal de que funciona ✓, Posicionamiento por proceso ✓, cierre personalizado con cita ✓, CTAs canónicos ≤4 palabras o keyword ✓, magnets↔calendario cuadrando día por día ✓, matriz sin cruces nivel↔uso ✓, y **ninguna cifra de resultado sin respaldo del bank o sin brackets** ✓.
3. **Prueba negativa de A1:** intentar aprobar un calendario con una métrica inventada y confirmar el rechazo con mensaje útil.
4. Confirmar en el panel que las nuevas versiones de prompts aparecen en el historial con la versión anterior restaurable en un clic.
5. Entregar: diff por archivo, salidas literales de los tests, y un PDF de muestra regenerado para comparar contra Luxor. **NO desplegar sin aprobación.** ultracode ultrathink