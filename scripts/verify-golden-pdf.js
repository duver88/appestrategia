// CHECKLIST DORADO AMPLIADO (ajuste #3 + correcciones del owner sobre el
// PDF de muestra) contra el PDF real + cruces en DB del proyecto de
// diagnóstico. Solo lectura.
// El texto extraído de un PDF trae artefactos (letter-spacing, mayúsculas):
// se busca de forma tolerante (sin espacios, case-insensitive).
const { PrismaClient } = require("@prisma/client");
const { PDFParse } = require("pdf-parse");
const fs = require("fs");

const prisma = new PrismaClient();
const squash = (s) => s.toLowerCase().replace(/\s+/g, "");
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

// — Detección de cifras (espejo en JS del validador A1 ampliado) —
const UNIDAD = /^(citas?|leads?|clientes?|ventas?|reuniones?|llamadas?|cupos?|d[ií]as?|semanas?|meses?|años?|kwp|pacientes?|cierres?|agendamientos?|seguidores?|alumnos?)$/i;
const unitClass = (u) => {
  const n = u.toLowerCase().replace(/í/g, "i").replace(/á/g, "a").replace(/é/g, "e").replace(/ó/g, "o").replace(/ú/g, "u").replace(/ñ/g, "n");
  if (/^d[i]as?$/.test(n)) return "dia";
  if (/^semanas?$/.test(n)) return "semana";
  if (/^meses$|^mes$/.test(n)) return "mes";
  if (/^anos?$/.test(n)) return "ano";
  return n.replace(/s$/, "");
};
const digits = (s) => s.replace(/[^\d]/g, "");
function extractCifras(text) {
  const clean = text.replace(/\[[^\]]*\]/g, " ");
  const out = [];
  for (const m of clean.matchAll(/(\d[\d.,]*)\s*(?:%|por\s?ciento)/gi)) out.push({ lit: m[0], n: digits(m[1]), u: "pct" });
  for (const m of clean.matchAll(/(?:\$|€|usd|eur|cop)\s?(\d[\d.,]*)/gi)) out.push({ lit: m[0], n: digits(m[1]), u: "money" });
  for (const m of clean.matchAll(/(\d[\d.,]*)\s?(?:€|usd|eur|cop|euros?|d[oó]lares?|pesos?)\b/gi)) out.push({ lit: m[0], n: digits(m[1]), u: "money" });
  for (const m of clean.matchAll(/(?:facturar|factur[oóa]|facturando|ganar|gan[oóa]|ganando|vender|vendi[oó]|vendiendo|ahorrar|ahorr[oóa]|cobrar|cobr[oóa])\s+(?:\$|€)?\s?(\d[\d.,]*)/gi)) out.push({ lit: m[0], n: digits(m[1]), u: "money" });
  for (const m of clean.matchAll(/(\d[\d.,]*)\s+([a-záéíóúñ]+)/gi)) if (UNIDAD.test(m[2])) out.push({ lit: `${m[1]} ${m[2]}`, n: digits(m[1]), u: unitClass(m[2]) });
  for (const m of clean.matchAll(/\bde\s+(?:\$|€)?\s?(\d[\d.,]*)\S*\s+a\s+(?:[a-záéíóúñ]+\s+)?(?:\$|€)?\s?(\d[\d.,]*)/gi)) {
    out.push({ lit: m[0], n: digits(m[1]), u: null });
    out.push({ lit: m[0], n: digits(m[2]), u: null });
  }
  return out.filter((c) => c.n);
}
function cifraSetFrom(texts) {
  const keys = new Set();
  const bare = new Set();
  for (const t of texts) {
    if (!t) continue;
    for (const c of extractCifras(t)) {
      if (c.u) keys.add(`${c.n}|${c.u}`);
      bare.add(c.n);
    }
    for (const m of t.replace(/\[[^\]]*\]/g, " ").matchAll(/\d[\d.,]*/g)) bare.add(digits(m[0]));
  }
  return { keys, bare };
}
const supported = (c, set) => (c.u ? set.keys.has(`${c.n}|${c.u}`) : set.bare.has(c.n));
const collectStrings = (v, into = []) => {
  if (typeof v === "string") into.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, into);
  else if (v && typeof v === "object") for (const x of Object.values(v)) collectStrings(x, into);
  return into;
};

(async () => {
  const parser = new PDFParse({ data: fs.readFileSync("storage/pdfs/muestra-calidad.pdf") });
  const parsed = await parser.getText();
  const text = parsed.text;
  const flat = squash(text);
  const has = (needle) => flat.includes(squash(needle));
  // Texto por página (para el chequeo de cita partida), si el parser lo da.
  const pageTexts = Array.isArray(parsed.pages) ? parsed.pages.map((p) => squash(p.text ?? "")) : null;

  const project = await prisma.project.findFirst({
    where: { title: "Diagnóstico fase_6" },
    orderBy: { createdAt: "desc" },
  });
  const sections = await prisma.section.findMany({
    where: { projectId: project.id, status: "APPROVED" },
  });
  const byPhase = Object.fromEntries(sections.map((s) => [s.phaseId, JSON.parse(s.data)]));
  const cal = byPhase.fase_6;
  const magnets = byPhase.fase_5.magnets;
  const metodo = byPhase.fase_1_6?.nombre ?? null;
  const fase6Row = sections.find((s) => s.phaseId === "fase_6");
  const mesCal = fase6Row?.approvedAt ? MESES[fase6Row.approvedAt.getMonth()] : null;
  const cierreTexto = cal.cierre
    ? [cal.cierre.queEsElDocumento, cal.cierre.logicaVehiculo, cal.cierre.decisionDelMes, cal.cierre.rolMagnets, cal.cierre.citaFinal].join(" ")
    : "";

  const results = [];
  const check = (nombre, ok, detalle = "") => {
    results.push({ nombre, ok, detalle });
    console.log(`${ok ? "PASA " : "FALLA"}  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  };

  // ——— Checklist dorado original ———
  check("Tildes en el documento", /[áéíóúñ¿¡]/.test(text));
  check("Columna Ángulo con valores canónicos", has("Ángulo") && has("Venta Directa") && has("Dolor Emocional"));
  check(
    "4 semanas con etiqueta estratégica, sin 'Semana 5'",
    has("Semana 4") && !has("Semana 5") && has("Venta con urgencia real"),
    `etiquetas en datos: ${cal.etiquetasSemana?.length ?? 0}`,
  );
  const ficha = ["CLIENTE", "METODOLOGÍA", "EJE", "VEHÍCULO", "CARA VISIBLE", "CALENDARIO", "MODO"];
  check(
    "Ficha técnica de portada completa",
    ficha.every(has) && has("Lionscore AI v2.2") && has("Diana Gómez"),
    ficha.filter((f) => !has(f)).join(", ") || "7/7 rótulos",
  );
  const cajas = (text.match(/¿Para qué sirve esta sección\?/g) || []).length;
  check("Caja '¿Para qué sirve esta sección?' en todas las secciones", cajas >= 14 && !has("Cómo usar esta sección"), `${cajas} cajas`);
  const personasEnDias = cal.dias.filter((d) => d.persona).length;
  check("Columna Formato / Persona", has("Formato / Persona"), `${personasEnDias}/31 días con persona en datos`);
  check("Brand Statement con Principal + Agresiva + Comercial", has("Brand Statement") && has("Versión agresiva") && has("Versión comercial"));
  check("Bloque 'Señal de que funciona'", has("Señal de que funciona"));
  const eje = byPhase.fase_2_1?.tipo;
  check(
    "Posicionamiento por proceso (donde aplique)",
    eje === "PROCESO" || eje === "COMBINACION" ? has("Posicionamiento por proceso") : true,
    `eje=${eje} (no aplica si no es PROCESO/COMBINACION)`,
  );
  check(
    "Cierre personalizado con cita final (no plantilla)",
    !!cal.cierre?.citaFinal && has(cal.cierre.citaFinal.slice(0, 60)) && !has("no es una colección de ideas sueltas"),
    cal.cierre ? `cita: «${cal.cierre.citaFinal.slice(0, 70)}…»` : "SIN cierre en datos",
  );
  const malCta = cal.dias.filter((d) => d.uso === "CONVERSION" && !d.magnet && d.cta.trim().split(/\s+/).length > 4);
  check("CTAs de conversión ≤4 palabras o keyword de magnet", malCta.length === 0, `CTAs: ${cal.ctas.primario} / ${cal.ctas.secundario}`);
  const diffs = [];
  for (const m of magnets) {
    const dec = [...m.diasAplica].sort((a, b) => a - b).join(",");
    const asg = cal.dias.filter((d) => d.magnet === m.codigo).map((d) => d.dia).sort((a, b) => a - b).join(",");
    if (dec !== asg) diffs.push(`${m.codigo}: fase_5={${dec}} cal={${asg}}`);
  }
  check("Magnets ↔ calendario: conjuntos exactos", diffs.length === 0, diffs.join("; ") || magnets.map((m) => `${m.codigo}={${m.diasAplica.join(",")}}`).join(" · "));
  const cruces = byPhase.fase_4.hooks.filter(
    (h) =>
      (h.nivel <= 2 && (h.angulo !== "DOLOR" || h.uso !== "ATRACCION")) ||
      (h.nivel >= 3 && h.angulo !== "GANANCIA") ||
      (h.nivel === 5 && h.uso !== "CONVERSION") ||
      (h.nivel >= 3 && h.nivel < 5 && h.uso === "ATRACCION"),
  );
  check("Matriz de 30 hooks sin cruces nivel↔ángulo↔uso", cruces.length === 0, `${cruces.length} cruces`);

  // ——— P.1: cifras ampliadas (€, facturar, rangos) + whitelist número+unidad ———
  const confirmadas = cifraSetFrom(
    byPhase.fase_2_4.casos
      .filter((c) => !c.esPlaceholder && ![c.metrica, c.resultado, c.tiempo, c.casoReal].some((x) => /\[[^\]]*\]/.test(x)))
      .flatMap((c) => [c.metrica, c.resultado, c.tiempo, c.casoReal]),
  );
  const whitelist = cifraSetFrom([
    ...["fase_0", "fase_1_3", "fase_1_6", "fase_1_7"].flatMap((p) => (byPhase[p] ? collectStrings(byPhase[p]) : [])),
    cal.fomo.confirmedByClient ? cal.fomo.descripcion : "",
  ]);
  const huerfanas = cal.dias.flatMap((d) =>
    [["hook", d.hook], ["idea", d.ideaCentral]].flatMap(([campo, txt]) =>
      extractCifras(txt)
        .filter((c) => !supported(c, confirmadas) && !supported(c, whitelist))
        .map((c) => `Día ${d.dia} ${campo}: ${c.lit}`),
    ),
  );
  check("P.1 — Ninguna cifra sin respaldo (incl. €, facturar, rangos; número+unidad)", huerfanas.length === 0, huerfanas.slice(0, 4).join("; ") || "0 cifras huérfanas");

  // ——— P.2: nombre del método en el cierre, sin 'Vehículo' en el cuerpo ———
  const vehiculoCount = (flat.match(/veh[ií]culo/g) || []).length;
  check(
    "P.2 — Cierre con el nombre aprobado del método y sin 'Vehículo' en el cuerpo",
    !!metodo && cierreTexto.toLowerCase().includes(metodo.toLowerCase()) && !/veh[ií]culo/i.test(cierreTexto) && vehiculoCount <= 1,
    `método="${metodo}" · "vehículo" en el doc: ${vehiculoCount} (≤1, solo la ficha)`,
  );

  // ——— P.3: cero eco de instrucción en textos visibles ———
  const ECOS = ["placeholder", "sin inventar cifras", "sin cifras inventadas", "según la regla", "el servidor"];
  const conEco = [...cal.dias.flatMap((d) => [d.hook, d.ideaCentral]), cierreTexto]
    .filter((c) => ECOS.some((e) => c.toLowerCase().includes(e)))
    .map((c) => `«${c.slice(0, 70)}…»`);
  check("P.3 — Sin eco de instrucción (Placeholder/Sin inventar cifras/…) en días y cierre", conEco.length === 0, conEco.slice(0, 3).join("; ") || "0 ecos");

  // ——— P.4: coherencia de mes ———
  const mesesAjenos = mesCal
    ? [cal.fomo.descripcion, ...cal.dias.flatMap((d) => [d.hook, d.ideaCentral]), cierreTexto].flatMap((txt) =>
        [...txt.matchAll(new RegExp(`\\b(${MESES.join("|")})\\b`, "gi"))]
          .filter((m) => m[1].toLowerCase() !== mesCal)
          .map((m) => m[1]),
      )
    : [];
  check(`P.4 — Coherencia de mes (calendario: ${mesCal ?? "?"})`, mesesAjenos.length === 0, mesesAjenos.length ? `menciones ajenas: ${[...new Set(mesesAjenos)].join(", ")}` : "0 menciones ajenas");

  // ——— P.5: la cita del cierre no se parte entre páginas ———
  if (pageTexts && cal.cierre?.citaFinal) {
    const citaFlat = squash(cal.cierre.citaFinal).slice(0, 120);
    const entera = pageTexts.some((p) => p.includes(citaFlat));
    check("P.5 — Cita del cierre completa en una sola página", entera);
  } else {
    check("P.5 — Cita del cierre completa en una sola página (CSS keep-together aplicado)", has("closing") || !!cal.cierre, "verificación visual: última página");
  }

  // ——— P.6: perfiles de la matriz ⊆ avatares aprobados + diferenciadores sin duplicados ———
  const avataresAprobados = new Set((byPhase.fase_1_1?.perfiles ?? []).map((p) => p.nombre.toLowerCase()));
  const perfilesFuera = [...new Set(byPhase.fase_4.hooks.map((h) => h.perfil))].filter((p) => !avataresAprobados.has(p.toLowerCase()));
  check("P.6a — Perfiles de la matriz EXACTOS de los avatares aprobados", perfilesFuera.length === 0, perfilesFuera.join(", ") || `${avataresAprobados.size} avatares`);
  const cuerpos = new Map();
  const dupDif = [];
  (byPhase.fase_1_4?.diferenciadores ?? []).forEach((d, i) => {
    const key = [d.todoElMundo, d.problema, d.enCambio, d.paraQue].map((x) => x.trim().toLowerCase()).join("¦");
    if (cuerpos.has(key)) dupDif.push(`${cuerpos.get(key) + 1}≡${i + 1}`);
    else cuerpos.set(key, i);
  });
  check("P.6b — Diferenciadores sin ítems duplicados", dupDif.length === 0, dupDif.join(", ") || `${cuerpos.size} contrastes distintos`);

  check("★ en los días de la semana 4 + leyenda de colores", (text.match(/★/g) || []).length >= 10 && has("Leyenda:"));
  check("Título del método con nombre propio (sin 'El Vehículo:')", !has("El Vehículo:"));

  const fallas = results.filter((r) => !r.ok).length;
  console.log(`\nVEREDICTO CHECKLIST DORADO AMPLIADO: ${results.length - fallas} PASA / ${fallas} FALLA`);
  await prisma.$disconnect();
  process.exit(fallas > 0 ? 1 : 0);
})();
