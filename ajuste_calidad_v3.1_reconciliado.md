# AJUSTE INCREMENTAL #3.1 — CALIDAD DEL DOCUMENTO FINAL (RECONCILIADO)
## El ajuste #3 reescrito contra la realidad del código, con evidencia de la auditoría previa (solo lectura)

> **Estado:** documento de decisión. NADA de esto está implementado. Cada punto marcado
> **⚠️ DECISIÓN** requiere elección del dueño antes de escribir código. Aplican las skills
> `lionscore-architecture`, `lionscore-design` y `lionscore-prod-safe`; `audit.sh` intocable;
> tests solo se agregan; todo cambio de DB/schema es ADITIVO; prompts vía nuevas versiones
> de `PromptTemplate` con script idempotente (clon del patrón `scripts/upgrade-prompts-v3.js`
> → `scripts/upgrade-prompts-v4.js`, que aún no existe). **NO desplegar sin aprobación.**
>
> Evidencia: 4 agentes de auditoría en paralelo (solo lectura) sobre el código, la DB de
> Hernesto y el disco. Salidas literales completas en `auditoria_previa_v3_salidas_agentes.json`.

---

## VEREDICTO DEL FOMO DE HERNESTO

**Veredicto: CONFIRMADO_POR_CLIENTE — `confirmedByClient: true` es legítimo. No hay bug ni del prompt ni del flujo de la tool.**

Objeto `fomo` literal de la Section fase_6 APPROVED (proyecto `cmq87p420000mv3rsloultvri`):

```json
{
  "descripcion": "10 cupos de implementación al mes | 20% de descuento en implementación | Primer mes gratis de la plataforma",
  "tipo": "Cupos limitados + descuento temporal + bonus",
  "confirmedByClient": true
}
```

Trazabilidad en los `Message` de fase_6 (orden cronológico, literal):

1. **[assistant 19:29:47]** propone opciones y pregunta: «¿Cuál de estas opciones es real para ti este mes? O si tienes otra idea de urgencia genuina, dímela.»
2. **[user 19:30:38]** — Hernesto escribe textualmente: «1) 10 cupos al mes / 2) 20% de descuento en implementación / 3) Primer mes gratis de la plataforma»
3. **[assistant 19:30:42]** repregunta compromiso: «¿estás seguro…? ¿hasta cuándo corre…? ¿aplica a cualquiera de los 3 paquetes? … ¿Te parece bien ese compromiso?»
4. **[user 19:30:49]** — «si»
5. **[assistant 19:32:49]** — «Genial. FOMO confirmado.»

Los tres elementos de la `descripcion` los escribió el propio cliente. **La premisa del ajuste #3 original ("FOMO posiblemente inventado — Hernesto") queda desmentida**: B2 se reduce al caso Duberney (FOMO ausente) + la vía de brackets.

**Matiz menor (opcional, no bug):** la repregunta de detalle (¿hasta cuándo corre el descuento?, ¿aplica a los 3 paquetes?) se cerró con un «si» genérico sin respuestas específicas. Endurecimiento opcional de prompt en B2: cuando el FOMO tiene componentes con parámetros abiertos (fecha límite, alcance), el modelo no acepta un "sí" global — pide cada parámetro o lo deja en brackets.

**El hallazgo de prioridad 1 sí se confirma, pero es otro:** el Credibility Bank de Hernesto tiene **7/7 casos con `esPlaceholder: true` y métrica "Pendiente de confirmar"** (el caso 7 ni siquiera es real: "Caso genérico representativo"), y el calendario aprobado afirma cifras de resultado sin respaldo: «hace 45 días» (día 10), «18 citas» (días 21 y 29, y también en el hook nivel-5 de la matriz fase_4), «perdía el 40% de sus leads» (día 26). A1 sigue siendo la prioridad 1.

---

## ✅ DECISIÓN 0 — RESUELTA: REFERENCIAS DORADAS ENTREGADAS

El PDF físico no está en este equipo, pero el dueño entregó los **seis extractos literales** del ideal, guardados en **`docs/referencias/luxor_referencias_doradas.md`**: (1) ficha técnica de portada, (2) tres cajas «¿Para qué sirve esta sección?» de ejemplo + patrón, (3) nota de placeholders del bank (pág. 15) + patrón de placeholder por caso, (4) cierre de 4 párrafos + cita final con su patrón, (5) Brand Statement Principal completo con mapeo a los 4 pasos, (6) tabla de distribución magnets↔calendario del ideal. A4.1, A4.2, B1, B3 y B5 quedan **desbloqueados** — toda redacción de prompts/plantilla cita ese archivo como fuente. El PDF físico puede subirse después a `docs/referencias/` si se quiere la referencia visual.

---

## FRENTE A — CÓDIGO (validadores y plantilla)

### A1. Validador: cifras del contenido contra el Credibility Bank (PRIORIDAD 1)

**Corrección de enganche:** el ajuste original decía «rechazo a la tool `propose_section`», pero el calendario NO pasa por `propose_section` — fase_6 usa la tool `generar_calendario` (`app/api/chat/route.ts:187-191`). Puntos de enganche reales, tres:

1. **`validateWeek` + `weekPrompt`** (`lib/calendar/generate.ts`) — el modelo corrige durante la generación; semana inválida nunca se persiste (rechazo/reintento ya existente en `generate.ts:584-632`).
2. **`validateCalendar` + approve route** (`lib/schemas/calendar-validators.ts`, `app/api/sections/approve/route.ts:77-105`) — gate final, patrón existente (422 con errores).
3. **`propose_section`** solo para **fase_4** (hooks de la matriz).

**⚠️ DECISIÓN A1-flag:** el ajuste pedía flag nuevo `metrica_confirmada`, pero `fase24Schema` **ya tiene** `esPlaceholder: boolean` por caso (`lib/schemas/index.ts:183`).
- **(Recomendada) Reutilizar `esPlaceholder`, sin campo nuevo:** métrica confirmada ⇔ `esPlaceholder === false` **y** `metrica`/`resultado` sin brackets (`[X]`, `$[X]`…). El caso real con métrica aún no documentada se escribe con brackets en `metrica` (disciplina B3) y la regex lo detecta. Cero migración; la granularidad "caso placeholder" vs "métrica placeholder" la resuelven los brackets.
- Alternativa: añadir `metricaConfirmada?: boolean` aditivo — duplica semántica con `esPlaceholder` y exige migración de criterio en banks aprobados.

**Detección (sin cambios respecto al original, ahora con whitelist concreta):** regex de cifras de resultado (`%`, `$`, "citas", "leads", "meses", "días", "años" adyacentes a números) y vía de escape (b) = cifra en brackets + nota de placeholder en la `ideaCentral`. La **lista blanca** se construye en servidor al validar (sin campo nuevo en DB): tokens numéricos normalizados extraídos de las Sections APPROVED de fundamentos — `fase_0` (precio), `fase_1_3` (promesa y componentes), `fase_1_6`/`fase_1_7`, y métricas confirmadas de `fase_2_4`. Preferir falsos positivos (el pipeline ya reintenta con el error literal). Nota de calibración con evidencia real: el día 15 de Hernesto («500 leads pagados este mes. 0 citas.») es un escenario de dolor, no un resultado atribuido — la regla caerá también sobre él; aceptable por diseño (el modelo reformula con brackets o sin cifra).

**Tests (igual que el original):** «perdía el 40% de sus leads» + bank sin métrica confirmada ⇒ rechazo con día/cifra señalados; mismo texto con `[X]%` + nota ⇒ pasa; mismo texto con caso del bank confirmando el 40% ⇒ pasa.

### A2. Validador cruzado: Organic Magnets ↔ Calendario

**Evidencia real de Hernesto (peor que lo que decía el ajuste):** intersección **vacía en los 5 magnets**. `fase_5` declara OM1=[1,3,5,8,10], OM2=[2,6,9,12], OM3=[4,7,11,14], OM4=[5,9,13,16], OM5=[3,8,12,17]; el calendario asigna OM1={28}, OM2={3,10,26}, OM3={24}, OM4={25,30}, OM5={5,14,23}. Ni un solo día coincide. Causa raíz confirmada en código: **el generador nunca recibe `diasAplica`** — el contexto de magnets es solo `{codigo, ctaExacto}` (`lib/calendar/generate.ts:78`, `app/api/chat/route.ts:172-175`) y el prompt semanal solo lista keywords (`generate.ts:377-381`). El modelo elige los días a ciegas. Además: keyword huérfana real en el **día 15** (usa el CTA de OM1 con `magnet=null`; el ajuste original citaba el día 11 — corregido), y `fase_5` **se solapa a sí misma** (días 3, 5, 8, 9 y 12 tienen 2 magnets asignados — imposible de cumplir: el calendario admite un magnet por día).

Plan reconciliado:

1. **Alimentar la generación (causa raíz):** extender el tipo de magnets del pipeline a `{codigo, ctaExacto, diasAplica}` (`fase5Schema` ya lo tiene: `lib/schemas/index.ts:231`) y que `weekPrompt` fije por día «DÍA N — magnet: OMx (declarado en fase_5)» / «sin magnet». `validateWeek` verifica la asignación exacta de su rango; añadir patrones de error de magnet a `pickCulpritWeek` (`generate.ts:468-485`) para regenerar la semana correcta.
2. **Igualdad exacta de conjuntos** en `validateCalendar` con diff legible («OM1 declara día 5; el calendario asigna OM5 ese día»). El ctx del approve route ya carga fase_5 (`approve/route.ts:80-99`); solo se extiende con `diasAplica`.
3. **Keyword huérfana** (dirección inversa de la regla existente `calendar-validators.ts:187-193`): día cuyo CTA contiene la keyword de un magnet ⇒ debe tener ese magnet en su columna.
4. **Validar fase_5 en su propia aprobación** (nuevo respecto al original, obligado por la evidencia): conjuntos `diasAplica` **disjuntos** entre magnets (anti-solape), ningún OM > 30% de los días con magnet, todo OM ≥ 2 días. Si esto solo se valida en fase_6, el conflicto se detecta donde ya no se puede corregir (fase_5 aprobada + igualdad exacta + topes = contradicción insalvable).
5. **⚠️ DECISIÓN A2-invalidación:** el original pedía invalidación recíproca, pero la cascada existente es solo hacia fases posteriores (`approve/route.ts:122-129` con `getFollowingPhases` = `slice(idx+1)`) y fase_5 SIEMPRE se aprueba antes que fase_6 (orden estricto, `approve/route.ts:37-53`).
   - **(Recomendada) Sin cascada nueva:** la validación cruzada corre al aprobar fase_6 contra la fase_5 APPROVED; editar/re-aprobar fase_5 ya marca fase_6 `needsReview` con el mecanismo existente, y al re-aprobar fase_6 el cross-check se re-ejecuta. Reciprocidad cubierta sin tocar el motor de fases.
   - Alternativa: cascada hacia atrás (fase_6 → fase_5) — toca el motor, no aporta nada porque fase_6 es la última fase.
6. **⚠️ DECISIÓN A2-límites:** «configurables por proyecto» no tiene mecanismo hoy (Project sin campo de config; `Setting` es global).
   - **(Recomendada)** Defaults como constantes en `lib/calendar/catalogs.ts` (30% / mín 2) + override opcional vía `Setting` global `magnet_limits` (JSON). Config por-proyecto se pospone hasta que exista UI (cambio aditivo futuro, documentado).
   - Alternativa: campo aditivo `Project.magnetLimits String?` ahora — sin UI que lo edite, sería campo muerto.
7. **Tests:** mismatch de días ⇒ rechazo con diff; keyword huérfana ⇒ rechazo; OM con >30% ⇒ rechazo; fase_5 con días solapados ⇒ rechazo en su propia aprobación; pipeline con `diasAplica` inyectado converge (generateWeekFn de test, patrón existente). Referencia del comportamiento correcto: la tabla 1:1 del ideal en `docs/referencias/luxor_referencias_doradas.md` §6 (que también documenta el anti-patrón a NO copiar: OM5 con 9 de 19 días con magnet = 47%).

> Nota de impacto: el proyecto de Hernesto YA APROBADO no se toca (los validadores corren en aprobaciones nuevas). Si algún día se re-aprueba su fase_6, su fase_5 actual no cuadra ni consigo misma — habría que regenerar fase_5 primero. No es regresión: es el comportamiento deseado.

### A3. Validador: correspondencia nivel ↔ uso en la Matriz de 30 Hooks

**Evidencia:** la matriz APPROVED de Hernesto cumple las 3 reglas al 100% (0 violaciones en 30 filas) — A3.1 codifica un patrón que el modelo ya produce; el riesgo es regresión futura, no bug actual. La afirmación del original «cobertura ya parcialmente existente» es falsa: **no existe ninguna validación de fase_4 más allá del schema** (30 filas con enums independientes, `lib/schemas/index.ts:201-220`); un nivel 1 marcado NUTRICIÓN pasa hoy.

1. Crear `validateMatriz()` (p. ej. `lib/schemas/matrix-validators.ts`), llamada desde el execute de `propose_section` cuando `phaseId === "fase_4"` y desde el approve route (defensa en profundidad, patrón fase_6). Reglas: `nivel ∈ {1,2}` ⇒ `DOLOR` + `ATRACCION`; `nivel ∈ {3,4}` ⇒ `GANANCIA` + (`NUTRICION` | `CONVERSION`); `nivel = 5` ⇒ `GANANCIA` + `CONVERSION` (estricto — mejor que Luxor, que viola su propia fórmula en las filas 17 y 26).
2. **⚠️ DECISIÓN A3-cobertura:** «3 deseos × 5 perfiles sin celdas duplicadas» (15 celdas) no cuadra con 30 hooks, y la matriz real de Hernesto tiene otra estructura: **6 pares (deseo, perfil) × 5 niveles**, sin duplicados internos, con el perfil "Asesores comerciales desbordados" repetido bajo 2 deseos (cubre 6 de 15 cruces).
   - **(a)** Cobertura = la estructura de Hernesto: cada par (deseo, perfil) aparece con los 5 niveles exactos, pares únicos. Valida lo que el sistema ya produce bien.
   - **(b)** Cobertura = 15 cruces deseo×perfil × 2 niveles c/u (lectura literal del original). Invalidaría la matriz de Hernesto y exige cambiar el prompt de fase_4.
   - **(Recomendada) (a)**, salvo que el master v2.2 mande explícitamente (b) — confírmalo tú, que el master es tuyo.
3. **Test:** matriz con un hook nivel 1 marcado NUTRICIÓN ⇒ rechazada con la fila señalada. Anti-regresión: la matriz canónica de los fixtures debe cumplir las reglas nuevas (los helpers actuales generan nivel/uso cíclicos que las violan — **se adaptan los fixtures, jamás se debilita el validador**; cambio declarado por protocolo).

### A4. Plantilla PDF: formato Luxor

1. **Portada ficha técnica** (CLIENTE / METODOLOGÍA / EJE / VEHÍCULO / CARA VISIBLE / CALENDARIO / MODO — estructura exacta y pie de portada en `docs/referencias/luxor_referencias_doradas.md` §1). Fuentes reales: cliente, modo y brandColor existen en Project; eje en fase_0_5/2_1; nombre del vehículo en fase_1_6. **Tres datos NO existen** y el original decía que sí:
   - METODOLOGÍA: constante de código junto a los catálogos — no vive en ningún dato hoy. Formato del ideal: «Lionscore AI v2.4 · Andromeda 2026» → la nuestra sería «Lionscore AI v2.2» (el sufijo de cohorte/año es opcional; confirmar el texto exacto al implementar).
   - CALENDARIO (mes/año): **(Recomendado)** derivarlo de `Section.approvedAt` de fase_6 (cero datos nuevos); fallback «—».
   - **⚠️ DECISIÓN A4-cara:** CARA VISIBLE es un NOMBRE («Wilfer») y solo existe el enum COMPLETA/PARCIAL/NINGUNA en fase_0 (`lib/schemas/index.ts:21`). Opciones: **(Recomendada)** campo aditivo opcional `nombreCaraVisible` en el schema de fase_0 — el prompt de fase_0 lo pregunta cuando `personaVisible ≠ NINGUNA`; proyectos viejos: fallback «—». Alternativa: campo `Project.caraVisible String?` editable desde el panel admin (sirve para proyectos ya aprobados sin re-aprobar fase_0). Pueden convivir (ambos aditivos).
   - **Excepción de jerga confirmada como cambio real:** el título actual es exactamente el anti-patrón — `El Vehículo: ${nombre}` en `lib/pdf/template.ts:276` y en el TOC `:492`. Cambiar ambos al nombre propio del método; «VEHÍCULO» solo como rótulo de la ficha de portada.
2. **Caja de propósito:** el mecanismo **ya existe en TODAS las secciones** vía `explainBox` (`lib/pdf/template.ts:133-135`, invocado en los 14 bloques) — el original decía «solo en algunas»: falso. Lo que queda: retitular a «¿Para qué sirve esta sección?» y redactar los 14 textos siguiendo el patrón del ideal (qué es + cómo se usa + leyenda/regla de oro si aplica, personalizado con el nombre de la marca — tres ejemplos literales en `docs/referencias/luxor_referencias_doradas.md` §2). La caja del calendario incluye la leyenda de colores y la regla «★ = Semana 4 FOMO — [cara visible] completa los brackets antes de publicar», que conecta con A4.4 y B2.
3. **Columna Formato / Persona:** `persona: z.string().optional()` en `fase6DiaSchema` (aditivo — hoy no existe, `index.ts:239-249`; requerido rompería calendarios aprobados). El generador la rellena vía `weekPrompt`: default = nombre de la cara visible para formatos CON CARA (`esConCara`, `catalogs.ts:83-86`); «Narración AI»/«Marca» para sin-cara o proyectos NINGUNA. El PDF renderiza «Formato — Persona» con fallback a solo formato. Depende de DECISIÓN A4-cara para el default.
4. **Semana 4 absorbe 22-31 — BUG REAL CONFIRMADO, prioridad alta dentro de A4:** la plantilla Y la UI trocean de 7 en 7 y **sí renderizan «Semana 5»** para los días 29-31, sin etiqueta: `lib/pdf/template.ts:406-408` (header `Semana ${si+1}` en `:425`, FOMO atado a `si===3` en `:415`) y `components/chat/SectionContent.tsx:644-648` (header en `:684`). Los datos y validadores ya son correctos (`FASE6_SEMANAS=[22,31]` en `catalogs.ts:124-129`); es bug de render puro. Fix: trocear por `FASE6_SEMANAS` en ambos archivos. Test de regresión: render de 31 días produce exactamente 4 encabezados de semana.
   **★ FOMO y leyenda:** **(Recomendado)** marcar con ★ los días de semana 4 con `uso === CONVERSION` (sin campo nuevo) y leyenda de colores al pie reutilizando los colores de uso existentes en la plantilla. Alternativa con campo aditivo `fomoDay` — innecesaria salvo que quieras ★ fuera de semana 4.
5. **Cierre personalizado:** solo el bloque de render aquí; el contenido es B5 (ver ⚠️ DECISIÓN B5). El cierre actual es estático: `closingPage` en `template.ts:471-482`, tres `<p>` fijos con el nombre interpolado.
6. **Regresión obligatoria:** regenerar PDF de proyecto de prueba y verificar contra el checklist dorado (sin perder tildes, columna Ángulo, etiquetas de semana).

### A5. Validador de CTAs canónicos — YA EXISTE; solo falta un test

- ≤4 palabras: refine `ctaCorto` en `lib/schemas/index.ts:275-281`, aplicado al par en `fase6FomoToolSchema` (`index.ts:286-296`; los campos reales se llaman **`ctas.primario` / `ctas.secundario`**). «Escríbenos y te contamos todo» (6 palabras) ya es rechazado por el schema de la tool.
- Par canónico exacto en días de conversión (máx. 2 CTAs/mes): `calendar-validators.ts:163-177` + `generate.ts:210-219`, con test de rechazo en `tests/audit/calendar-quality.test.ts:95`.
- **Único trabajo restante:** test dedicado del límite de 4 palabras a nivel `fase6FomoToolSchema` (no existe en `tests/audit/`).

---

## FRENTE B — PROMPTS (nuevas versiones vía `upgrade-prompts-v4.js`, restaurables)

### B1. Versión Principal del Brand Statement

**Ya cumplido (no re-especificar):** `fase22Schema` ya es non-nullable en las tres versiones (`lib/schemas/index.ts:164-168`) y el prompt ya exige Principal/Agresiva/Comercial con estructura de 4 pasos (`prompts/fase_2_2_brand_statement.md:7-31`). **Evidencia de que aun así falla:** la Principal de Hernesto aprobada es «Ayudo a [perfil] a [solución] — para que [promesa]» — formato clásico sin apertura empática, sin quitar la culpa, sin giro de creencia (todo eso quedó relegado al campo "agresivo").

**Trabajo real de B1:** afinar el prompt con (1) la estructura explícita paso a paso — *(nombrar la situación con empatía) → (quitar la culpa: «no porque no tengas opciones, sino porque nadie te había mostrado…») → (causa real) → (solución con respaldo de marca + remate de objeciones)* — como guion de la Principal, distinto del de la Agresiva; (2) el **ejemplo dorado completo de Luxor con su mapeo a los 4 pasos** (`docs/referencias/luxor_referencias_doradas.md` §5), incluyendo los nombres canónicos de las tres versiones: «Principal — Empático y claro» / «Agresivo — Directo y provocador» / «Comercial — Orientado a la decisión»; (3) anti-ejemplo: la Principal real de Hernesto, citada en el prompt como «esto es una Comercial larga, no una Principal».

### B2. FOMO confirmado — solo queda la vía de brackets

**Ya cumplido:** el prompt de fase_6 ya exige FOMO real confirmado antes de la semana 4 con modo construcción de 2-3 opciones y anti-ejemplos (`prompts/fase_6_calendario.md:120-125`); el flujo funciona (ver VEREDICTO). **La premisa "Hernesto inventado" es falsa** — B2 queda motivado solo por Duberney (ausencia) y por la imposibilidad actual de aprobar sin confirmar.

**⚠️ DECISIÓN B2-gate (la decisión de diseño más importante del ajuste):** hoy hay DOS gates booleanos duros — la tool no genera si `confirmedByClient=false` (`app/api/chat/route.ts:192-199`) y `validateCalendar` no deja aprobar (`calendar-validators.ts:70-74`). B2.3 exige poder generar Y aprobar con brackets; convertir el boolean a enum NO es aditivo (rompería calendarios aprobados).

- **(Recomendada) Gate ternario aditivo:** mantener `confirmedByClient: boolean` y añadir `fomo.estado?: 'CONFIRMADO' | 'PENDIENTE_BRACKETS'` opcional en `fase6Schema` y `fase6FomoToolSchema`. Lógica: `confirmedByClient=true` ⇒ números concretos permitidos en semana 4; `false` + `estado='PENDIENTE_BRACKETS'` ⇒ generable y aprobable SOLO si A1 confirma que toda cifra de FOMO va en brackets + nota al cliente (estilo «★ = [cliente] completa los brackets antes de publicar»); `false` sin estado (calendarios viejos / FOMO no tratado) ⇒ bloqueado como hoy. Cambia los DOS gates + el prompt de fase_6.
- Alternativa: mantener el gate binario (sin vía de brackets) — B2.3 no se implementa y un cliente que no confirma sigue bloqueado en fase_6.

Endurecimiento opcional (matiz del veredicto): cuando los componentes del FOMO tienen parámetros abiertos, el modelo no acepta «sí» genérico — pide cada parámetro o lo pasa a brackets.

### B3. Disciplina de placeholders en TODA generación

Instrucción transversal a los prompts de fase_2_4, fase_4 y fase_6 (sin cambios de fondo respecto al original): dato no confirmado ⇒ brackets, nunca valor plausible inventado; si la `ideaCentral` marca placeholder, el hook del día también lleva la cifra en brackets.

**Cambio respecto al original — el bloque «Nota para [cliente]» del bank NO necesita schema ni modelo:** renderizarlo **determinista en la plantilla**: `credibilidadBlock` (`template.ts:311-335`) deriva la lista de pendientes de los casos con `esPlaceholder=true` o brackets en `metrica` y arma la nota con la redacción literal del ideal — «Nota para [nombre]: Estos N casos tienen la estructura lista. Solo necesitas meter los números reales. Un caso con datos concretos vale más que diez genéricos.» (`docs/referencias/luxor_referencias_doradas.md` §3, que también trae el patrón de placeholder por caso para el prompt de fase_2_4). Cero cambio de schema, funciona retroactivamente con banks ya aprobados (el de Hernesto mostraría sus 7 pendientes).

### B4. Anti-regresión — TODO ya está blindado en schema/render; queda solo el checklist

Verificado en código, no re-especificar:
1. «Señal de que funciona»: `senalesDeExito` length(2) non-nullable (`index.ts:129,145`), render `template.ts:157-162`.
2. Posicionamiento por proceso: `versiones` min(5).max(7) (`index.ts:131-134`), render `template.ts:165-168`.
3. CTAs keyword duales: `prompts/fase_6_calendario.md:128-131` + instrucción de salida en `chat/route.ts:140`.
4. Banco de 10 (`index.ts:170-172`) y Regla de Pairing (`reglaEjecucion` obligatoria, `index.ts:127`).

Trabajo restante: añadir los 4 ítems al checklist dorado de verificación manual (documento del owner, gate 4) y un test de presencia en el HTML del PDF para los que no lo tengan en `pdf-quality.test.ts`.

### B5. Cierre personalizado del documento

**⚠️ DECISIÓN B5 (bloqueante para A4.5):** el original dice «el prompt de la fase de cierre» — **esa fase no existe** (`lib/state-machine/phases.ts:7-26` termina en fase_6) y crear fases está prohibido. El cierre actual es estático (`template.ts:471-482`). Opciones:

- **(Recomendada) (i) Sub-entregable aditivo de fase_6:** campo opcional `cierre` en `fase6Schema` que espeja los 4 párrafos + cita del ideal (`docs/referencias/luxor_referencias_doradas.md` §4): `{ queEsElDocumento, logicaVehiculo, decisionDelMes, rolMagnets, citaFinal }`, generado con una 5ª llamada `generateObject` al ensamblar en `generateCalendarInWeeks` (el contexto del pipeline ya incluye 2_2, 2_3, 2_4, 3, 4 y 5 — suficiente para la síntesis). PRO: vive en la Section (fuente de verdad), el cliente lo aprueba junto con el calendario, el render del PDF sigue determinista y testeable, regenerable vía «pedir cambios». CONTRA: +1 llamada por generación; calendarios viejos no lo traen → `closingPage` usa el cierre si existe y cae al texto estático actual.
- (ii) Llamada LLM al renderizar el PDF: no toca el schema y «ve» el documento completo, pero el PDF deja de ser determinista, depende de red/credenciales en el render, **el contenido nunca pasa por aprobación del cliente** (rompe Section = fuente de verdad), cuesta en cada regeneración y es difícil de testear.

El «prompt de la fase de cierre» de B5 se convierte en el prompt de esa llamada de ensamblado, con el ejemplo dorado completo de §4 y el patrón de la cita: *«El mercado no necesita otro/a [categoría genérica]. Necesita uno/a que [diferenciadores reales del proyecto]. Eso/Esa es [marca].»* — construida desde los diferenciadores APPROVED de fase_1_4, no inventada. Anti-ejemplo: cierre plantilla que sirve para cualquier cliente cambiando el nombre (= exactamente el `closingPage` actual).

### B6. Refuerzo del pulido — por fase, no paso global

**Corrección de premisa:** no existe un «paso de pulido» único del ajuste #2; existen bloques «Pulido obligatorio antes de proponer» en 4 prompts (`fase_1_3:42`, `fase_1_6:37`, `fase_2_1:47`, `fase_2_2:24`). Y B6.2 tal como estaba escrito («el pulido relee Brand Statement, promesa, elevator pitch, taglines y diferenciadores») implicaría un repaso cross-sección que viola la máquina de fases: una fase no puede reescribir secciones APPROVED anteriores.

Plan reconciliado:
1. **Concordancia sintáctica:** endurecer los bloques de pulido existentes y añadir bloque a `fase_1_4` (que hoy no lo tiene), citando los anti-ejemplos REALES de Hernesto verificados en DB: «Nosotros el sistema califica automáticamente…» y «Nosotros el sistema atiende 24/7…» (diferenciadores 5 y 7 aprobados). Regla: «Nosotros + verbo conjugado» o «El sistema + verbo» — nunca ambos sujetos.
2. **Consistencia de voz — transversal vía `master_rules.md`** (en contexto en todas las fases): la variante de voz se fija en la fase de tono (sección APPROVED siempre disponible) y toda salida la respeta — voseo/tuteo/ustedeo jamás mezclados. Anti-ejemplo real verificado: brand statement de Hernesto en tuteo («Pagas pauta… Tu sigues» — además «Tu» sin tilde) contra hooks/calendario en voseo («Decís "los leads son malos"», «¿Cuántas perdiste vos?»). Cada fase pule SU salida contra la voz fijada; nada de paso global que toque secciones aprobadas.

### Script de versionado

Crear `scripts/upgrade-prompts-v4.js` clonando el patrón de `upgrade-prompts-v3.js` (idempotente por comparación de contenido, transacción `updateMany`+`create`, nunca sobrescribe versiones, restaurable desde el panel — `upgrade-prompts-v3.js:36-53`), con TARGETS limitados a los prompts realmente tocados por el Frente B: `master_rules`, `fase_0` (si DECISIÓN A4-cara = prompt), `fase_1_4`, `fase_2_2`, `fase_2_4`, `fase_4`, `fase_5`, `fase_6`, `modo_2_renovacion` y los 4 de pulido — editando en paralelo los seeds de `/prompts`.

---

## RESUMEN DE DECISIONES PENDIENTES (todas bloquean su punto, ninguna bloquea a las demás)

| # | Punto | Pregunta | Recomendación |
|---|-------|----------|---------------|
| ~~0~~ | ~~Global~~ | ~~PDF de Luxor~~ | **RESUELTA** — referencias doradas en `docs/referencias/luxor_referencias_doradas.md` |
| 1 | A1 | ¿Reutilizar `esPlaceholder`+brackets o crear `metricaConfirmada`? | Reutilizar |
| 2 | A2 | ¿Cross-check solo al aprobar fase_6 (sin cascada nueva)? | Sí |
| 3 | A2 | ¿Límites 30%/≥2 como constantes + Setting global (config por-proyecto después)? | Sí |
| 4 | A3 | Cobertura de la matriz: ¿pares (deseo,perfil) × 5 niveles (como Hernesto) o 15 cruces × 2? | Como Hernesto, salvo que el master diga otra cosa |
| 5 | A4 | Nombre de la cara visible: ¿campo en fase_0 (prompt lo pregunta) y/o en Project (panel admin)? | fase_0; Project como complemento para proyectos viejos |
| 6 | A4 | ★ FOMO = días CONVERSION de semana 4 (sin campo nuevo)? | Sí |
| 7 | B2 | ¿Gate ternario aditivo (`fomo.estado` PENDIENTE_BRACKETS aprobable)? | Sí — es la decisión central del ajuste |
| 8 | B5 | Cierre: ¿sub-entregable de fase_6 (i) o LLM al render (ii)? | (i) |

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
5. Entregar: diff por archivo, salidas literales de los tests, y un PDF de muestra regenerado para comparar contra Luxor. **NO desplegar sin aprobación.**
