import type {
  Fase21Data,
  Fase22Data,
  Fase5Data,
  Fase6Data,
  Fase6Cierre,
} from "@/lib/schemas";
import { FASE6_SEMANAS } from "@/lib/calendar/catalogs";
import type { PdfDocumentData } from "./types";

/**
 * Plantilla HTML del PDF editorial (estructura del documento de referencia
 * "Movimiento con Intención"). Reglas duras: el término interno prohibido
 * del método nunca aparece (solo "Vehículo" o el nombre propio que el
 * cliente creó), sin siglas internas y sin emojis.
 */

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const USO_COLOR: Record<string, string> = {
  ATRACCION: "#2E7D52",
  NUTRICION: "#6B4FA0",
  CONVERSION: "#C0392B",
};

/** Ajuste #3 (A4.1): versión de la metodología para la ficha técnica. */
export const METODOLOGIA_LABEL = "Lionscore AI v2.2";

/** Etiqueta del eje para la ficha técnica de portada. */
const EJE_LABEL: Record<string, string> = {
  CREENCIA_CONTRARIA: "Creencia Contraria",
  PROCESO: "Proceso",
  RESULTADO: "Resultado",
  COMBINACION: "Combinación",
};

const USO_LABEL: Record<string, string> = {
  ATRACCION: "Atracción",
  NUTRICION: "Nutrición",
  CONVERSION: "Conversión",
};

function baseCss(brandColor: string): string {
  return `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #FAF7F2; }
  body {
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #2B2620;
    font-size: 10.5pt;
    line-height: 1.55;
  }
  h1, h2, h3, .serif { font-family: Georgia, "Times New Roman", serif; }
  .page { padding: 0 56px; }
  .plate {
    background: ${brandColor};
    color: #ffffff;
    padding: 90px 64px;
    min-height: 980px;
    page-break-after: always;
  }
  .plate h1 { font-size: 30pt; line-height: 1.2; margin-bottom: 10px; }
  .plate .kicker {
    text-transform: uppercase; letter-spacing: 3px; font-size: 9pt;
    opacity: .85; margin-bottom: 26px;
  }
  .plate .client { font-size: 13pt; opacity: .9; margin-bottom: 60px; }
  .toc { border-top: 1px solid rgba(255,255,255,.35); padding-top: 26px; }
  .toc p {
    text-transform: uppercase; letter-spacing: 2px; font-size: 8.5pt;
    opacity: .8; margin-bottom: 14px;
  }
  .toc ol { list-style: none; counter-reset: toc; }
  .toc li {
    counter-increment: toc; font-size: 11pt; padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,.15);
  }
  .toc li::before {
    content: counter(toc, decimal-leading-zero);
    display: inline-block; width: 36px; opacity: .7; font-size: 9pt;
  }
  section.doc { page-break-before: always; padding-top: 24px; }
  section.doc:first-of-type { page-break-before: auto; }
  .part-label {
    text-transform: uppercase; letter-spacing: 2.5px; font-size: 8.5pt;
    color: ${brandColor}; margin-bottom: 6px; font-weight: 600;
  }
  h2 { font-size: 19pt; margin-bottom: 14px; color: #1E1A15; }
  h3 { font-size: 12.5pt; margin: 18px 0 8px; color: #1E1A15; }
  .explain {
    background: #F1EBE1; border-left: 3px solid ${brandColor};
    padding: 14px 18px; margin-bottom: 22px; font-size: 9.5pt;
    color: #5A5248; page-break-inside: avoid;
  }
  .explain strong { color: #2B2620; }
  .card {
    background: #ffffff; border: 1px solid #E7DFD2; border-radius: 6px;
    padding: 14px 18px; margin-bottom: 12px; page-break-inside: avoid;
  }
  .card .title { font-weight: 600; margin-bottom: 4px; }
  .muted { color: #7A7165; font-size: 9pt; }
  .quote {
    font-family: Georgia, serif; font-style: italic; font-size: 13pt;
    line-height: 1.45; padding: 18px 22px; background: #ffffff;
    border: 1px solid #E7DFD2; border-radius: 6px; margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .label {
    text-transform: uppercase; letter-spacing: 1.5px; font-size: 7.5pt;
    color: #988E80; display: block; margin-bottom: 3px; font-weight: 600;
  }
  ol.plain { padding-left: 20px; }
  ol.plain li { margin-bottom: 7px; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th {
    text-align: left; text-transform: uppercase; letter-spacing: 1px;
    font-size: 7pt; color: #988E80; padding: 6px 8px;
    border-bottom: 2px solid #D9CFC0;
  }
  td { padding: 7px 8px; border-bottom: 1px solid #EAE2D5; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .pill {
    display: inline-block; border-radius: 20px; padding: 1px 9px;
    color: #fff; font-size: 7.5pt; font-weight: 600;
  }
  .two-col { display: flex; gap: 24px; }
  .two-col > div { flex: 1; }
  .week { margin-bottom: 18px; page-break-inside: avoid; }
  .week-head {
    font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    font-size: 8.5pt; color: #5A5248; padding: 6px 0; margin-bottom: 4px;
    border-bottom: 2px solid ${brandColor};
  }
  .week-head.fomo { color: ${brandColor}; }
  .closing-text { font-size: 11.5pt; line-height: 1.8; opacity: .95; }
  .closing-text p { margin-bottom: 16px; }
  .ficha { margin-bottom: 46px; }
  .ficha td {
    border-bottom: 1px solid rgba(255,255,255,.18); padding: 6px 0;
    color: #ffffff; font-size: 9.5pt;
  }
  .ficha td.k {
    text-transform: uppercase; letter-spacing: 2px; font-size: 7.5pt;
    opacity: .7; width: 150px; font-weight: 600;
  }
  .legend { margin-top: 10px; font-size: 8.5pt; color: #7A7165; }
  .legend .dot {
    display: inline-block; width: 9px; height: 9px; border-radius: 50%;
    margin: 0 4px 0 10px; vertical-align: middle;
  }
  .closing-quote {
    font-family: Georgia, serif; font-style: italic; font-size: 14pt;
    line-height: 1.5; border: 1px solid rgba(255,255,255,.45);
    padding: 22px 26px; margin-top: 28px;
  }
  `;
}

// Ajuste #3 (A4.2): título canónico del ideal de Luxor. El texto sigue el
// patrón qué-es + cómo-se-usa + regla de oro (docs/referencias §2).
function explainBox(text: string): string {
  return `<div class="explain"><strong>¿Para qué sirve esta sección?</strong> ${text}</div>`;
}

function ejeBlock(d: Fase21Data, brand: Fase22Data): string {
  let body = "";
  if (d.tipo === "CREENCIA_CONTRARIA" || d.tipo === "COMBINACION") {
    // Campos del ajuste de calidad (opcionales en documentos antiguos).
    const extra = d as unknown as {
      reglaEjecucion?: string;
      senalesDeExito?: string[];
    };
    body += `
      <h3>La narrativa que domina el mercado</h3>
      <p>${esc(d.narrativaDominante)}</p>
      <h3>Nuestra posición</h3>
      <div class="card"><span class="label">Versión agresiva</span>${esc(d.versionAgresiva)}</div>
      <div class="card"><span class="label">Versión consultiva</span>${esc(d.versionConsultiva)}</div>
      <div class="quote">${esc(d.tesisUnificada)}</div>
      ${
        extra.reglaEjecucion
          ? `<div class="card"><span class="label">Regla de ejecución — Pairing × Consistencia = Asociación</span>${esc(extra.reglaEjecucion)}</div>`
          : ""
      }
      ${
        extra.senalesDeExito && extra.senalesDeExito.length > 0
          ? `<div class="card"><span class="label">Señal de que funciona</span>DMs que dicen cosas como: ${extra.senalesDeExito
              .map((s) => `«${esc(s)}»`)
              .join(" o ")}. Eso es la tesis devolviéndose.</div>`
          : ""
      }`;
  }
  if (d.tipo === "PROCESO" || d.tipo === "COMBINACION") {
    body += `
      <h3>Posicionamiento por proceso</h3>
      ${d.versiones.map((v) => `<div class="card">${esc(v)}</div>`).join("")}`;
  }
  if (d.tipo === "RESULTADO") {
    body += `<p>Este posicionamiento se sostiene en resultados verificables. Los casos y métricas que lo respaldan están en el Banco de Credibilidad de este documento.</p>`;
  }
  return `
    <section class="doc">
      <p class="part-label">Posicionamiento</p>
      <h2>Eje de posicionamiento y Brand Statement</h2>
      ${explainBox("Es la columna vertebral de toda la estrategia: la tesis que la marca repite en CADA pieza de contenido desde ángulos distintos — no cambia semana a semana, se instala por repetición. Léela antes de grabar o escribir cualquier cosa.")}
      ${body}
      <h3>Brand Statement</h3>
      <div class="quote">${esc(brand.principal)}</div>
      <div class="two-col">
        <div class="card"><span class="label">Versión agresiva</span>${esc(brand.agresivo)}</div>
        <div class="card"><span class="label">Versión comercial</span>${esc(brand.comercial)}</div>
      </div>
    </section>`;
}

function parte1Block(d: PdfDocumentData): string {
  const nicho = d.fase_1_1;
  const dyd = d.fase_1_2;
  const promesa = d.fase_1_3;
  const dif = d.fase_1_4;
  const journey = d.fase_1_5;
  const veh = d.fase_1_6;
  const ent = d.fase_1_7;
  return `
    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <h2>Nicho y avatar</h2>
      ${explainBox("Estas son las personas exactas a las que le hablas. Cuando dudes sobre un contenido, pregúntate: ¿le sirve a alguno de estos perfiles?")}
      ${nicho.perfiles
        .map(
          (p) => `
        <div class="card">
          <p class="title">${esc(p.nombre)}</p>
          <p>${esc(p.situacion)}</p>
          <p class="muted">Dolor principal: ${esc(p.dolorPrincipal)} · La impulsa: ${esc(p.loQueLaImpulsa)}</p>
          <p class="muted">Cómo se describe: «${esc(p.comoSeDescribe)}»</p>
        </div>`,
        )
        .join("")}
      <div class="quote">${esc(nicho.fraseUnificadora)}</div>
      <p class="muted">Rango de edad del avatar: ${esc(nicho.rangoEdad)}</p>
    </section>

    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <h2>Dolores y deseos</h2>
      ${explainBox("Escritos en primera persona, tal como suenan en la cabeza del cliente. Úsalos literalmente en hooks, guiones y respuestas: son el idioma de tu audiencia.")}
      <div class="two-col">
        <div>
          <h3>Dolores</h3>
          <ol class="plain">${dyd.dolores.map((x) => `<li>«${esc(x)}»</li>`).join("")}</ol>
        </div>
        <div>
          <h3>Deseos</h3>
          <ol class="plain">${dyd.deseos.map((x) => `<li>«${esc(x)}»</li>`).join("")}</ol>
        </div>
      </div>
    </section>

    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <h2>La promesa</h2>
      ${explainBox("La frase central de la marca: qué logra el cliente, en qué volumen y en cuánto tiempo. Aparece en el perfil, en los cierres de venta y en los contenidos de conversión.")}
      <div class="quote">${esc(promesa.promesaFinal)}</div>
      <p class="muted">Métrica: ${esc(promesa.componentes.metrica)} · Volumen: ${esc(promesa.componentes.volumen)}${promesa.componentes.tiempo ? ` · Tiempo: ${esc(promesa.componentes.tiempo)}` : ""}</p>
    </section>

    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <h2>Diferenciadores</h2>
      ${explainBox("Cada diferenciador sigue la estructura: lo que todo el mundo hace, el problema que eso genera, lo que hacemos en cambio y para qué. Son argumentos listos para contenido y para ventas.")}
      ${dif.diferenciadores
        .map(
          (x, i) => `
        <div class="card">
          <p class="title">${i + 1}. ${esc(x.titulo)}</p>
          <p><span class="label">Todo el mundo</span>${esc(x.todoElMundo)}</p>
          <p><span class="label">El problema</span>${esc(x.problema)}</p>
          <p><span class="label">En cambio, nosotros</span>${esc(x.enCambio)}</p>
          <p><span class="label">Para que</span>${esc(x.paraQue)}</p>
        </div>`,
        )
        .join("")}
    </section>

    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <h2>Customer Journey</h2>
      ${explainBox("El recorrido completo de un desconocido hasta convertirse en cliente. Cada contenido del calendario empuja a la audiencia de una etapa a la siguiente.")}
      <ol class="plain">
        ${journey.etapas
          .slice()
          .sort((a, b) => a.numero - b.numero)
          .map(
            (e) =>
              `<li><strong>${e.numero}. ${esc(e.nombre)}.</strong> ${esc(e.descripcion)}</li>`,
          )
          .join("")}
      </ol>
    </section>

    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <!-- Ajuste #3 (A4.1): el título es el nombre propio del método; la
           palabra "Vehículo" solo vive en la ficha técnica de portada. -->
      <h2>${esc(veh.nombre)}</h2>
      ${explainBox("El método propio con nombre. Es lo que convierte un servicio genérico en un sistema único y difícil de copiar: nómbralo así, siempre igual, en todo el contenido y en las llamadas de venta.")}
      <div class="quote">${esc(veh.tagline)}</div>
      ${veh.fases
        .map(
          (f, i) => `
        <div class="card">
          <p class="title">Fase ${i + 1} — ${esc(f.nombre)}</p>
          <p><span class="label">Qué hace</span>${esc(f.queHace)}</p>
          <p><span class="label">Qué produce</span>${esc(f.queProduce)}</p>
        </div>`,
        )
        .join("")}
      <h3>Elevator pitch</h3>
      <div class="quote">${esc(veh.elevatorPitch)}</div>
    </section>

    <section class="doc">
      <p class="part-label">Parte 1 · Fundamentos</p>
      <h2>Entregables</h2>
      ${explainBox("Lo que el cliente recibe, descrito en tres dimensiones: lo funcional (qué es), lo emocional (qué siente) y lo dimensional (cómo se ve y se mide).")}
      ${ent.entregables
        .map(
          (e) => `
        <div class="card">
          <p class="title">${esc(e.nombre)}</p>
          <p><span class="label">Funcional</span>${esc(e.funcional)}</p>
          <p><span class="label">Emocional</span>${esc(e.emocional)}</p>
          <p><span class="label">Dimensional</span>${esc(e.dimensional)}</p>
        </div>`,
        )
        .join("")}
    </section>`;
}

function credibilidadBlock(d: PdfDocumentData): string {
  return `
    <section class="doc">
      <p class="part-label">Posicionamiento</p>
      <h2>Banco de tesis</h2>
      ${explainBox("Diez afirmaciones que la marca defiende en público. Cada una puede abrir un contenido, sostener un debate o cerrar un guion. Rótalas: no repitas la misma tesis dos semanas seguidas.")}
      <ol class="plain">${d.fase_2_3.tesis.map((t) => `<li>«${esc(t)}»</li>`).join("")}</ol>
    </section>

    <section class="doc">
      <p class="part-label">Posicionamiento</p>
      <h2>Banco de Credibilidad</h2>
      ${explainBox("Casos reales con métrica, resultado y tiempo. Son la prueba social del sistema: cada contenido de conversión del calendario cita uno de estos casos, nunca uno inventado. Lo que está en brackets es un placeholder hasta documentar el número real.")}
      ${d.fase_2_4.casos
        .map(
          (c) => `
        <div class="card">
          <p class="title">${esc(c.tema)}${c.esPlaceholder ? ' <span class="muted">(por completar con el caso real)</span>' : ""}</p>
          <p>${esc(c.casoReal)}</p>
          <p class="muted">Métrica: ${esc(c.metrica)} · Resultado: ${esc(c.resultado)} · Tiempo: ${esc(c.tiempo)}</p>
        </div>`,
        )
        .join("")}
      ${notaPlaceholders(d.clientName, d.fase_2_4)}
    </section>`;
}

/**
 * Ajuste #3 (B3) — bloque "Nota para [cliente]" del Credibility Bank,
 * derivado DETERMINISTA de los casos pendientes (esPlaceholder o brackets
 * en la métrica). Redacción del ideal de Luxor pág. 15. Funciona
 * retroactivamente con banks ya aprobados; si no hay pendientes, no sale.
 */
function notaPlaceholders(
  clientName: string,
  bank: PdfDocumentData["fase_2_4"],
): string {
  const pendientes = bank.casos.filter(
    (c) =>
      c.esPlaceholder ||
      [c.metrica, c.resultado, c.tiempo].some((x) => /\[[^\]]*\]/.test(x)),
  );
  if (pendientes.length === 0) return "";
  return `
      <div class="card" style="border-left: 3px solid #C0392B;">
        <p class="title">Nota para ${esc(clientName)}</p>
        <p>${pendientes.length === bank.casos.length ? "Estos casos tienen" : `${pendientes.length === 1 ? "Este caso tiene" : `Estos ${pendientes.length} casos tienen`}`} la estructura lista — solo necesitas meter los números reales: ${pendientes
          .map((c) => esc(c.tema))
          .join("; ")}. Un caso con datos concretos vale más que diez genéricos.</p>
      </div>`;
}

function deseosBlock(d: PdfDocumentData): string {
  return `
    <section class="doc">
      <p class="part-label">Parte 3 · Psicología</p>
      <h2>Perfiles y deseos profundos</h2>
      ${explainBox("Los tres deseos profundos (según el modelo de motivación de Reiss) que mueven a tu audiencia. Todo hook de la matriz apunta a uno de estos tres deseos.")}
      ${d.fase_3.deseos
        .map(
          (x) => `
        <div class="card">
          <p class="title">${esc(x.nombre)} <span class="muted">· Deseo de ${esc(x.nombreReiss)}</span></p>
          <p>${esc(x.explicacion)}</p>
        </div>`,
        )
        .join("")}
    </section>`;
}

function hooksBlock(d: PdfDocumentData): string {
  return `
    <section class="doc">
      <p class="part-label">Parte 4 · Contenido</p>
      <h2>Matriz de 30 hooks</h2>
      ${explainBox("El banco de ideas para todo el contenido del mes: 30 aperturas clasificadas por deseo, perfil, nivel de consciencia, ángulo y uso. Niveles 1-2 = atracción fría; niveles 3-4-5 = nutrición y conversión. Antes de grabar, elige un hook de aquí — no improvises el gancho.")}
      <table>
        <thead>
          <tr><th>#</th><th>Hook</th><th>Deseo</th><th>Perfil</th><th>Nivel</th><th>Ángulo</th><th>Uso</th></tr>
        </thead>
        <tbody>
          ${d.fase_4.hooks
            .map(
              (h, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>«${esc(h.hook)}»</strong></td>
              <td>${esc(h.deseo)}</td>
              <td>${esc(h.perfil)}</td>
              <td>${h.nivel}</td>
              <td>${h.angulo === "DOLOR" ? "Dolor" : "Ganancia"}</td>
              <td><span class="pill" style="background:${USO_COLOR[h.uso]}">${USO_LABEL[h.uso]}</span></td>
            </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </section>`;
}

function magnetsBlock(magnets: Fase5Data): string {
  return `
    <section class="doc">
      <p class="part-label">Parte 5 · Captación</p>
      <h2>Organic Magnets</h2>
      ${explainBox("Cinco recursos gratuitos que la audiencia pide por comentario o mensaje directo. Cada uno tiene su CTA exacto y los días del calendario en los que se ofrece.")}
      ${magnets.magnets
        .map(
          (m) => `
        <div class="card">
          <p class="title">${esc(m.codigo)} — ${esc(m.titulo)}</p>
          <p class="muted">${esc(m.formato)} · Se ofrece los días ${m.diasAplica.join(", ")}</p>
          <p>${esc(m.porQueLoQuiere)}</p>
          <p><span class="label">CTA exacto</span>«${esc(m.ctaExacto)}»</p>
        </div>`,
        )
        .join("")}
    </section>`;
}

function calendarBlock(cal: Fase6Data, marca?: string): string {
  const dias = [...cal.dias].sort((a, b) => a.dia - b.dia);
  // Ajuste #3 (A4.4): troceo por FASE6_SEMANAS (7/7/7/10) — la semana 4
  // absorbe los días 22-31. PROHIBIDO un encabezado "Semana 5".
  const semanas = FASE6_SEMANAS.map(([from, to]) =>
    dias.filter((d) => d.dia >= from && d.dia <= to),
  );
  return `
    <section class="doc">
      <p class="part-label">Parte 6 · Ejecución</p>
      <h2>Calendario de 31 días</h2>
      ${explainBox(`Este calendario le dice ${marca ? `al equipo de ${esc(marca)}` : "al equipo"} exactamente qué publicar cada día del mes. Verde = atracción. Morado = nutrición. Rojo = conversión. ★ = Semana 4 — la urgencia real del mes${cal.fomo.estado === "PENDIENTE_BRACKETS" ? "; el cliente completa los brackets del FOMO antes de publicar" : ""}. Antes de grabar, lee el hook del día en voz alta con tus propias palabras.`)}
      ${semanas
        .map((semana, si) => {
          const isFomo = si === 3;
          // Etiqueta estratégica de la semana (la 4 ya integra el FOMO en
          // positivo). Fallback para calendarios previos al ajuste: nunca
          // un encabezado tipo "sin FOMO".
          const etiqueta =
            cal.etiquetasSemana?.[si] ??
            (isFomo ? `${esc(cal.fomo.tipo)}: ${esc(cal.fomo.descripcion)}` : "");
          return `
        <div class="week">
          <p class="week-head${isFomo ? " fomo" : ""}">Semana ${si + 1}${etiqueta ? ` — ${esc(etiqueta)}` : ""}</p>
          <table>
            <thead>
              <tr><th>Día</th><th>Uso</th><th>Ángulo</th><th>Hook</th><th>Idea central</th><th>Formato / Persona</th><th>Magnet</th><th>CTA</th></tr>
            </thead>
            <tbody>
              ${semana
                .map(
                  (x) => `
                <tr>
                  <td><strong>${x.dia}${isFomo ? " ★" : ""}</strong><br/><span class="muted">${esc(x.diaSemana)}</span></td>
                  <td><span class="pill" style="background:${USO_COLOR[x.uso]}">${USO_LABEL[x.uso]}</span></td>
                  <td>${esc(x.angulo)}</td>
                  <td><strong>«${esc(x.hook)}»</strong></td>
                  <td>${esc(x.ideaCentral)}</td>
                  <td>${esc(x.formato)}${x.persona ? ` — ${esc(x.persona)}` : ""}</td>
                  <td>${x.magnet ? esc(x.magnet) : "—"}</td>
                  <td>${esc(x.cta)}</td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>`;
        })
        .join("")}
      <p class="legend"><strong>Leyenda:</strong><span class="dot" style="background:${USO_COLOR.ATRACCION}"></span>Atracción (audiencia nueva)<span class="dot" style="background:${USO_COLOR.NUTRICION}"></span>Nutrición (confianza)<span class="dot" style="background:${USO_COLOR.CONVERSION}"></span>Conversión (venta) · ★ = Semana 4 — FOMO del mes</p>
    </section>`;
}

interface FichaTecnica {
  cliente: string;
  eje?: string | null;
  vehiculo?: string | null;
  caraVisible?: string | null;
  calendario?: string | null;
  modo?: string | null;
}

function coverPage(
  clientName: string,
  subtitle: string,
  tocItems: string[],
  ficha?: FichaTecnica,
): string {
  // Ajuste #3 (A4.1): ficha técnica de portada (estructura del ideal de
  // Luxor §1). "VEHÍCULO" como rótulo se permite SOLO aquí.
  const filas: Array<[string, string]> = ficha
    ? [
        ["CLIENTE", ficha.cliente],
        ["METODOLOGÍA", METODOLOGIA_LABEL],
        ["EJE", ficha.eje ?? "—"],
        ["VEHÍCULO", ficha.vehiculo ?? "—"],
        ["CARA VISIBLE", ficha.caraVisible ?? "—"],
        ["CALENDARIO", ficha.calendario ?? "—"],
        ["MODO", ficha.modo ?? "—"],
      ]
    : [];
  return `
  <div class="plate">
    <p class="kicker">SISTEMA LIONSCORE</p>
    <h1>Sistema de Marca Personal,<br/>Contenido y Ventas</h1>
    <p class="client">${esc(clientName)} · ${esc(subtitle)}</p>
    ${
      filas.length > 0
        ? `<table class="ficha"><tbody>${filas
            .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
            .join("")}</tbody></table>`
        : ""
    }
    <div class="toc">
      <p>Contenido del documento</p>
      <ol>${tocItems.map((t) => `<li>${esc(t)}</li>`).join("")}</ol>
    </div>
    <p style="margin-top:34px;font-size:8pt;letter-spacing:2px;text-transform:uppercase;opacity:.6">${esc(METODOLOGIA_LABEL)} · Lions Core Solutions · Confidencial</p>
  </div>`;
}

function closingPage(clientName: string, cierre?: Fase6Cierre): string {
  // Ajuste #3 (A4.5/B5): cierre personalizado generado con el calendario
  // (4 párrafos + cita destacada, estilo Luxor pág. 21). Los documentos
  // anteriores al ajuste caen al cierre estático de siempre.
  if (cierre) {
    return `
  <div class="plate" style="page-break-after: auto; page-break-before: always;">
    <p class="kicker">Cierre</p>
    <h1>Este documento es la base<br/>de tu estrategia digital</h1>
    <div class="closing-text" style="margin-top: 40px;">
      <p>${esc(cierre.queEsElDocumento)}</p>
      <p>${esc(cierre.logicaVehiculo)}</p>
      <p>${esc(cierre.decisionDelMes)}</p>
      <p>${esc(cierre.rolMagnets)}</p>
    </div>
    <div class="closing-quote">«${esc(cierre.citaFinal)}»</div>
  </div>`;
  }
  return `
  <div class="plate" style="page-break-after: auto; page-break-before: always;">
    <p class="kicker">Cierre</p>
    <h1>Este documento es la base<br/>de tu estrategia digital</h1>
    <div class="closing-text" style="margin-top: 40px;">
      <p>Todo lo que acabas de leer no es una colección de ideas sueltas: es un sistema. El posicionamiento define desde dónde hablas. Los perfiles y sus deseos definen a quién. La promesa y el método definen qué ofreces y por qué eres distinto. Los hooks, los magnets y el calendario convierten todo eso en acciones concretas, día por día.</p>
      <p>Úsalo así: antes de publicar cualquier cosa, vuelve al eje de posicionamiento. Antes de grabar, elige el hook del día y léelo en voz alta con tus propias palabras. Antes de vender, cita un caso real del Banco de Credibilidad. La constancia con la que ejecutes este calendario vale más que cualquier pieza individual de contenido.</p>
      <p>Este sistema fue construido contigo, ${esc(clientName)}, a partir de tu negocio real, tus clientes reales y tu forma real de hablar. Por eso funciona: porque no es una plantilla, es tu estrategia. Ejecútala completa durante el mes y llega a la renovación con datos: qué funcionó, qué no, y qué aprendiste. Sobre eso se construye el mes siguiente.</p>
    </div>
  </div>`;
}

export function renderModo1Html(d: PdfDocumentData): string {
  const toc = [
    "Eje de posicionamiento y Brand Statement",
    "Nicho y avatar",
    "Dolores y deseos",
    "La promesa",
    "Diferenciadores",
    "Customer Journey",
    // Ajuste #3 (A4.1): el TOC usa el nombre propio del método, nunca
    // "El Vehículo: …".
    d.fase_1_6.nombre,
    "Entregables",
    "Banco de tesis",
    "Banco de Credibilidad",
    "Perfiles y deseos profundos",
    "Matriz de 30 hooks",
    "Organic Magnets",
    "Calendario de 31 días",
  ];
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>${baseCss(d.brandColor)}</style>
</head>
<body>
  ${coverPage(d.clientName, d.business, toc, {
    cliente: d.clientName,
    eje: EJE_LABEL[d.fase_2_1.tipo] ?? d.fase_2_1.tipo,
    vehiculo: d.fase_1_6.nombre,
    caraVisible: d.caraVisible,
    calendario: d.calendarioMes,
    modo: d.modoLabel ?? "Modo 1 — Sistema Completo desde Cero",
  })}
  <div class="page">
    ${ejeBlock(d.fase_2_1, d.fase_2_2)}
    ${parte1Block(d)}
    ${credibilidadBlock(d)}
    ${deseosBlock(d)}
    ${hooksBlock(d)}
    ${magnetsBlock(d.fase_5)}
    ${calendarBlock(d.fase_6, d.clientName)}
  </div>
  ${closingPage(d.clientName, d.fase_6.cierre)}
</body>
</html>`;
}

/** PDF corto del Modo 2: portada, recordatorio del eje, calendario nuevo, magnets, cierre. */
export function renderModo2Html(d: {
  clientName: string;
  business: string;
  brandColor: string;
  monthTitle: string;
  caraVisible?: string | null;
  calendarioMes?: string | null;
  vehiculoNombre?: string | null;
  fase_2_1: Fase21Data;
  fase_2_2: Fase22Data;
  fase_5: Fase5Data;
  fase_6: Fase6Data;
}): string {
  const toc = [
    "Recordatorio del eje de posicionamiento",
    "Calendario de 31 días",
    "Organic Magnets del mes",
  ];
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>${baseCss(d.brandColor)}</style>
</head>
<body>
  ${coverPage(d.clientName, d.monthTitle, toc, {
    cliente: d.clientName,
    eje: EJE_LABEL[d.fase_2_1.tipo] ?? d.fase_2_1.tipo,
    vehiculo: d.vehiculoNombre,
    caraVisible: d.caraVisible,
    calendario: d.calendarioMes,
    modo: "Modo 2 — Renovación Mensual",
  })}
  <div class="page">
    ${ejeBlock(d.fase_2_1, d.fase_2_2)}
    ${calendarBlock(d.fase_6, d.clientName)}
    ${magnetsBlock(d.fase_5)}
  </div>
  ${closingPage(d.clientName, d.fase_6.cierre)}
</body>
</html>`;
}
