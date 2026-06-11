// CHECKLIST DORADO (ajuste #3 — VERIFICACIÓN punto 2) contra el PDF de
// muestra real + cruces en DB del proyecto de diagnóstico. Solo lectura.
// El texto extraído de un PDF trae artefactos (letter-spacing, mayúsculas):
// se busca de forma tolerante (sin espacios, case-insensitive).
const { PrismaClient } = require("@prisma/client");
const { PDFParse } = require("pdf-parse");
const fs = require("fs");

const prisma = new PrismaClient();
const squash = (s) => s.toLowerCase().replace(/\s+/g, "");

(async () => {
  const parser = new PDFParse({ data: fs.readFileSync("storage/pdfs/muestra-calidad.pdf") });
  const { text } = await parser.getText();
  const flat = squash(text);
  const has = (needle) => flat.includes(squash(needle));

  const project = await prisma.project.findFirst({ where: { title: "Diagnóstico fase_6" } });
  const sections = await prisma.section.findMany({
    where: { projectId: project.id, status: "APPROVED" },
  });
  const byPhase = Object.fromEntries(sections.map((s) => [s.phaseId, JSON.parse(s.data)]));
  const cal = byPhase.fase_6;
  const magnets = byPhase.fase_5.magnets;

  const results = [];
  const check = (nombre, ok, detalle = "") => {
    results.push({ nombre, ok, detalle });
    console.log(`${ok ? "PASA " : "FALLA"}  ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  };

  // 1. Tildes
  check("Tildes en el documento", /[áéíóúñ¿¡]/.test(text));
  // 2. Columna Ángulo (los ángulos canónicos en la tabla)
  check("Columna Ángulo con valores canónicos", has("Ángulo") && has("Venta Directa") && has("Dolor Emocional"));
  // 3. Encabezados de semana con estrategia y SIN "Semana 5"
  check(
    "4 semanas con etiqueta estratégica, sin 'Semana 5'",
    has("Semana 4") && !has("Semana 5") && has("Venta con urgencia real"),
    `etiquetas en datos: ${cal.etiquetasSemana?.length ?? 0}`,
  );
  // 4. Portada ficha técnica
  const ficha = ["CLIENTE", "METODOLOGÍA", "EJE", "VEHÍCULO", "CARA VISIBLE", "CALENDARIO", "MODO"];
  check(
    "Ficha técnica de portada completa",
    ficha.every(has) && has("Lionscore AI v2.2") && has("Diana Gómez"),
    ficha.filter((f) => !has(f)).join(", ") || "7/7 rótulos",
  );
  // 5. Cajas de propósito en todas las secciones
  const cajas = (text.match(/¿Para qué sirve esta sección\?/g) || []).length;
  check("Caja '¿Para qué sirve esta sección?' en todas las secciones", cajas >= 14 && !has("Cómo usar esta sección"), `${cajas} cajas`);
  // 6. Columna Formato / Persona
  const personasEnDias = cal.dias.filter((d) => d.persona).length;
  check("Columna Formato / Persona", has("Formato / Persona"), `${personasEnDias}/31 días con persona en datos`);
  // 7. Brand Statement: tres versiones incluida la Principal
  check(
    "Brand Statement con Principal + Agresiva + Comercial",
    has("Brand Statement") && has("Versión agresiva") && has("Versión comercial"),
  );
  // 8. Señal de que funciona
  check("Bloque 'Señal de que funciona'", has("Señal de que funciona"));
  // 9. Posicionamiento por proceso (donde aplique: eje del diag = CREENCIA_CONTRARIA)
  const eje = byPhase.fase_2_1?.tipo;
  check(
    "Posicionamiento por proceso (donde aplique)",
    eje === "PROCESO" || eje === "COMBINACION" ? has("Posicionamiento por proceso") : true,
    `eje=${eje} (no aplica si no es PROCESO/COMBINACION)`,
  );
  // 10. Cierre personalizado con cita destacada
  check(
    "Cierre personalizado con cita final (no plantilla)",
    !!cal.cierre?.citaFinal && has(cal.cierre.citaFinal.slice(0, 60)) && !has("no es una colección de ideas sueltas"),
    cal.cierre ? `cita: «${cal.cierre.citaFinal.slice(0, 70)}…»` : "SIN cierre en datos",
  );
  // 11. CTAs canónicos ≤4 palabras o keyword
  const malCta = cal.dias.filter(
    (d) => d.uso === "CONVERSION" && !d.magnet && d.cta.trim().split(/\s+/).length > 4,
  );
  check("CTAs de conversión ≤4 palabras o keyword de magnet", malCta.length === 0, `CTAs: ${cal.ctas.primario} / ${cal.ctas.secundario}`);
  // 12. Magnets ↔ calendario cuadrando día por día
  const diffs = [];
  for (const m of magnets) {
    const declarados = [...m.diasAplica].sort((a, b) => a - b).join(",");
    const asignados = cal.dias
      .filter((d) => d.magnet === m.codigo)
      .map((d) => d.dia)
      .sort((a, b) => a - b)
      .join(",");
    if (declarados !== asignados) diffs.push(`${m.codigo}: fase_5={${declarados}} cal={${asignados}}`);
  }
  check(
    "Magnets ↔ calendario: conjuntos exactos",
    diffs.length === 0,
    diffs.join("; ") || magnets.map((m) => `${m.codigo}={${m.diasAplica.join(",")}}`).join(" · "),
  );
  // 13. Matriz sin cruces nivel↔uso
  const cruces = byPhase.fase_4.hooks.filter(
    (h) =>
      (h.nivel <= 2 && (h.angulo !== "DOLOR" || h.uso !== "ATRACCION")) ||
      (h.nivel >= 3 && h.angulo !== "GANANCIA") ||
      (h.nivel === 5 && h.uso !== "CONVERSION") ||
      (h.nivel >= 3 && h.nivel < 5 && h.uso === "ATRACCION"),
  );
  check("Matriz de 30 hooks sin cruces nivel↔ángulo↔uso", cruces.length === 0, `${cruces.length} cruces`);
  // 14. Ninguna cifra de resultado sin respaldo o sin brackets
  const { confirmedBankCifras, buildWhitelist, collectStrings, unsupportedMetrics } = await import(
    "../lib/schemas/metric-validators.ts"
  ).catch(() => ({}));
  if (unsupportedMetrics) {
    const confirmadas = confirmedBankCifras(byPhase.fase_2_4);
    const whitelist = buildWhitelist([
      ...["fase_0", "fase_1_3", "fase_1_6", "fase_1_7"].flatMap((p) =>
        byPhase[p] ? collectStrings(byPhase[p]) : [],
      ),
      cal.fomo.confirmedByClient ? cal.fomo.descripcion : "",
    ]);
    const sinRespaldo = cal.dias.flatMap((d) => [
      ...unsupportedMetrics(d.hook, { confirmadas, whitelist }).map((c) => `Día ${d.dia} hook: ${c.literal}`),
      ...unsupportedMetrics(d.ideaCentral, { confirmadas, whitelist }).map((c) => `Día ${d.dia} idea: ${c.literal}`),
    ]);
    check("Ninguna cifra de resultado sin respaldo del bank o sin brackets", sinRespaldo.length === 0, sinRespaldo.slice(0, 3).join("; ") || "0 cifras huérfanas");
  } else {
    // Sin TS en runtime: chequeo equivalente con la misma regex base.
    const unidades = /(\d[\d.,]*)\s*(?:%|por\s?ciento)|\$\s?(\d[\d.,]*)|(\d[\d.,]*)\s+(citas?|leads?|clientes?|ventas?|cupos?|d[ií]as?|semanas?|meses?|años?|pacientes?)/gi;
    const aprobado = squash(
      JSON.stringify([byPhase.fase_0, byPhase.fase_1_3, byPhase.fase_1_6, byPhase.fase_1_7, byPhase.fase_2_4, cal.fomo.descripcion]),
    );
    const huerfanas = [];
    for (const d of cal.dias) {
      for (const campo of [d.hook, d.ideaCentral]) {
        const limpio = campo.replace(/\[[^\]]*\]/g, " ");
        for (const m of limpio.matchAll(unidades)) {
          const num = (m[1] ?? m[2] ?? m[3] ?? "").replace(/[^\d]/g, "");
          if (num && !aprobado.includes(num)) huerfanas.push(`Día ${d.dia}: ${m[0]}`);
        }
      }
    }
    check("Ninguna cifra de resultado sin respaldo del bank o sin brackets", huerfanas.length === 0, huerfanas.slice(0, 3).join("; ") || "0 cifras huérfanas");
  }
  // Extra: sin eco de instrucción en el contenido publicable (corrección
  // del owner sobre la observación 1: el placeholder se integra natural,
  // jamás lenguaje de sistema en hook/idea).
  const ECOS = ["sin inventar cifras", "según la regla", "brackets", "el servidor", "validación", "schema", "placeholder ["];
  const conEco = cal.dias.flatMap((d) =>
    [d.hook, d.ideaCentral]
      .filter((c) => {
        const low = c.toLowerCase();
        return ECOS.some((e) => low.includes(e));
      })
      .map((c) => `Día ${d.dia}: «${c.slice(0, 80)}…»`),
  );
  check("Sin eco de instrucción en hooks/ideas (placeholder integrado natural)", conEco.length === 0, conEco.slice(0, 3).join("; ") || "0 ecos");
  // Extra: ★ en semana 4 y leyenda
  check("★ en los días de la semana 4 + leyenda de colores", (text.match(/★/g) || []).length >= 10 && has("Leyenda:"));
  // Extra: sin "El Vehículo:" como título
  check("Título del método con nombre propio (sin 'El Vehículo:')", !has("El Vehículo:"));

  const fallas = results.filter((r) => !r.ok).length;
  console.log(`\nVEREDICTO CHECKLIST DORADO: ${results.length - fallas} PASA / ${fallas} FALLA`);
  await prisma.$disconnect();
  process.exit(fallas > 0 ? 1 : 0);
})();
