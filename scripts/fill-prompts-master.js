// Rellena los seeds de /prompts con el TEXTO LITERAL del master v2.2
// (extraído del PDF del dueño), reemplazando los placeholders
// "[NOTA AGENCIA: pegar aquí...]" y preservando los bloques operativos
// (Salida, marcadores <!-- EJE:X -->, catálogos, pulido). Idempotente.
const { PDFParse } = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const PDF = "C:/Users/duver/Desktop/Proyectos/Buscar anuncios/master prompt v2_2 (2).pdf";
const DIR = path.join(__dirname, "..", "prompts");

const clean = (s) =>
  s
    .replace(/\n?-- \d+ of \d+ --\n?/g, "\n")
    .replace(/═+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

(async () => {
  const parser = new PDFParse({ data: fs.readFileSync(PDF) });
  const t = (await parser.getText()).text;
  const at = (label) => {
    const i = t.indexOf(label);
    if (i < 0) throw new Error(`No encontrado en el master: ${label}`);
    return i;
  };

  const O = {
    p0: at("PARTE 0 — RECOPILACIÓN"),
    p05: at("PARTE 0.5 — DIAGNÓSTICO"),
    p1: at("PARTE 1 — PROPUESTA ÚNICA"),
    s10: at("PASO 0 — VALIDACIÓN DE TONO"),
    s11: at("PASO 1.1 — NICHO"),
    s12: at("PASO 1.2 — DOLORES"),
    s13: at("PASO 1.3 — PROMESA"),
    s14: at("PASO 1.4 — DIFERENCIADORES"),
    s15: at("PASO 1.5 — CUSTOMER"),
    s16: at("PASO 1.6 — VEHÍCULO"),
    s17: at("PASO 1.7 — ENTREGABLES"),
    p2: at("PARTE 2 — POSICIONAMIENTO"),
    s22: at("PASO 2.2 — BRAND"),
    s23: at("PASO 2.3 — BANCO"),
    s24: at("PASO 2.4 — CREDIBILITY"),
    p3: at("PARTE 3 — PERFILES"),
    p4: at("PARTE 4 — MATRIZ"),
    p5: at("PARTE 5 — ORGANIC"),
    p6: at("PARTE 6 — CALENDARIO"),
    p7: at("PARTE 7 — FORMATO"),
    p8: at("PARTE 8 — REGLAS"),
    p9: at("PARTE 9 — MODO 1"),
    p10: at("PARTE 10 — APRENDIZAJES"),
  };

  const SECTIONS = {
    "fase_0_recopilacion.md": clean(t.slice(O.p0, O.p05)),
    "fase_0_5_diagnostico_eje.md": clean(t.slice(O.p05, O.p1)),
    "fase_1_0_validacion_tono.md": clean(t.slice(O.p1, O.s11)), // intro Parte 1 + Paso 0
    "fase_1_1_nicho.md": clean(t.slice(O.s11, O.s12)),
    "fase_1_2_dolores_deseos.md": clean(t.slice(O.s12, O.s13)),
    "fase_1_3_promesa.md": clean(t.slice(O.s13, O.s14)),
    "fase_1_4_diferenciadores.md": clean(t.slice(O.s14, O.s15)),
    "fase_1_5_customer_journey.md": clean(t.slice(O.s15, O.s16)),
    "fase_1_6_vehiculo.md": clean(t.slice(O.s16, O.s17)),
    "fase_1_7_entregables.md": clean(t.slice(O.s17, O.p2)),
    "fase_2_2_brand_statement.md": clean(t.slice(O.s22, O.s23)),
    "fase_2_3_banco_tesis.md": clean(t.slice(O.s23, O.s24)),
    "fase_2_4_credibility_bank.md": clean(t.slice(O.s24, O.p3)),
    "fase_3_perfiles_deseos.md": clean(t.slice(O.p3, O.p4)),
    "fase_4_matriz_hooks.md": clean(t.slice(O.p4, O.p5)),
    "fase_5_organic_magnets.md": clean(t.slice(O.p5, O.p6)),
    "fase_6_calendario.md": clean(t.slice(O.p6, O.p7)),
    "modo_2_renovacion.md": clean(t.slice(O.p9, O.p10)),
  };

  // Quita el bloque "> [NOTA AGENCIA...]" (una o varias líneas de blockquote).
  const stripNota = (content) =>
    content
      .split("\n")
      .filter((line, i, arr) => {
        if (!line.trim().startsWith(">")) return true;
        // ¿pertenece a un blockquote que contiene NOTA AGENCIA?
        let a = i;
        while (a > 0 && arr[a - 1].trim().startsWith(">")) a--;
        let b = i;
        while (b < arr.length - 1 && arr[b + 1].trim().startsWith(">")) b++;
        const block = arr.slice(a, b + 1).join("\n");
        return !block.includes("NOTA AGENCIA");
      })
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");

  const wrap = (literal) =>
    `## TEXTO LITERAL DEL MASTER v2.2\n${literal}\n`;

  for (const [file, literal] of Object.entries(SECTIONS)) {
    const fp = path.join(DIR, file);
    let c = fs.readFileSync(fp, "utf8");
    if (c.includes("TEXTO LITERAL DEL MASTER")) {
      console.log(`${file}: ya relleno.`);
      continue;
    }
    c = stripNota(c);
    // Insertar el literal tras la primera línea (el título # ...).
    const nl = c.indexOf("\n");
    c = c.slice(0, nl + 1) + "\n" + wrap(literal) + c.slice(nl + 1);
    fs.writeFileSync(fp, c, "utf8");
    console.log(`${file}: relleno con ${literal.length} chars del master.`);
  }

  // ——— fase_2_1: el literal se reparte DENTRO de los marcadores de eje ———
  {
    const fp = path.join(DIR, "fase_2_1_eje_posicionamiento.md");
    let c = fs.readFileSync(fp, "utf8");
    if (!c.includes("TEXTO LITERAL DEL MASTER")) {
      const s21 = t.slice(O.p2, O.s22);
      const iB = s21.indexOf("OPCIÓN B");
      const iC = s21.indexOf("OPCIÓN C");
      const intro = clean(s21.slice(0, s21.indexOf("OPCIÓN A")));
      const optA = clean(s21.slice(s21.indexOf("OPCIÓN A"), iB));
      const optB = clean(s21.slice(iB, iC));
      const optC = clean(s21.slice(iC));
      c = stripNota(c);
      const nl = c.indexOf("\n");
      c = c.slice(0, nl + 1) + "\n" + wrap(intro) + c.slice(nl + 1);
      const inject = (marker, text) => {
        const tag = `<!-- EJE:${marker} -->`;
        c = c.replace(tag, `${tag}\n### Texto literal del master (${marker})\n${text}\n`);
      };
      inject("CREENCIA_CONTRARIA", optA);
      inject("PROCESO", optB);
      inject("RESULTADO", optC);
      inject("COMBINACION", `${optA}\n\n${optB}`);
      fs.writeFileSync(fp, c, "utf8");
      console.log(`fase_2_1: literal repartido en los 4 bloques de eje.`);
    } else {
      console.log("fase_2_1: ya relleno.");
    }
  }

  // ——— master_rules: anexar Parte 8 (reglas) y Parte 10 (casos 01-02) ———
  {
    const fp = path.join(DIR, "master_rules.md");
    let c = fs.readFileSync(fp, "utf8");
    if (!c.includes("TEXTO LITERAL DEL MASTER")) {
      const p8 = clean(t.slice(O.p8, O.p9));
      const p10 = clean(t.slice(O.p10));
      c += `\n\n## TEXTO LITERAL DEL MASTER v2.2 — PARTE 8 (REGLAS DE POSICIONAMIENTO)\n${p8}\n\n## TEXTO LITERAL DEL MASTER v2.2 — PARTE 10 (APRENDIZAJES POR NICHO)\n${p10}\n`;
      fs.writeFileSync(fp, c, "utf8");
      console.log(`master_rules: anexadas Parte 8 (${p8.length}) y Parte 10 (${p10.length}).`);
    } else {
      console.log("master_rules: ya relleno.");
    }
  }
  console.log("LISTO.");
})();
