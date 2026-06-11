import type { Fase24Data } from "./index";

/**
 * Ajuste #3 — A1: toda MÉTRICA DE RESULTADO que aparezca en hooks o ideas
 * centrales debe estar respaldada por un caso CONFIRMADO del Credibility
 * Bank, ser un parámetro del negocio aprobado en fases previas (lista
 * blanca), o escribirse como placeholder con brackets ("[X]%", "$[X]").
 *
 * Evidencia que motiva la regla (caso Hernesto): calendario aprobado con
 * "perdía el 40% de sus leads", "18 citas automáticas" y "hace 45 días"
 * mientras el bank tenía 7/7 casos en "Pendiente de confirmar".
 *
 * Diseño: se prefieren FALSOS POSITIVOS (el modelo reformula con brackets
 * o sin la cifra; el pipeline reintenta con el error literal) a falsos
 * negativos (cifra inventada publicada).
 */

export interface MetricContext {
  /** Cifras de casos CONFIRMADOS del bank (esPlaceholder=false, sin brackets). */
  confirmadas: Set<string>;
  /** Cifras de parámetros aprobados en fases previas (precio, promesa, etc.). */
  whitelist: Set<string>;
}

/** Unidades que convierten un número en una MÉTRICA DE RESULTADO. */
const UNIDADES_RESULTADO =
  /^(citas?|leads?|clientes?|ventas?|reuniones?|llamadas?|cupos?|d[ií]as?|semanas?|meses?|años?|kwp|pacientes?|cierres?|agendamientos?)$/i;

/** Normaliza una cifra a su secuencia de dígitos ("$1.200.000" → "1200000"). */
export function normalizeCifra(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** Quita los segmentos en brackets: lo que está en "[…]" es placeholder válido. */
function stripBrackets(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ");
}

export interface CifraDetectada {
  /** Texto tal como aparece ("40%", "$2.500.000", "18 citas"). */
  literal: string;
  /** Solo dígitos, para cruzar contra whitelist/bank. */
  normalizada: string;
}

/**
 * Extrae las cifras de RESULTADO de un texto (ya sin brackets):
 * porcentajes, montos y números adyacentes a unidades de resultado.
 */
export function extractResultMetrics(text: string): CifraDetectada[] {
  const clean = stripBrackets(text);
  const found: CifraDetectada[] = [];
  // Porcentajes: "40%", "40 %", "40 por ciento".
  for (const m of clean.matchAll(/(\d[\d.,]*)\s*(?:%|por\s?ciento)/gi)) {
    found.push({ literal: `${m[1]}%`, normalizada: normalizeCifra(m[1]) });
  }
  // Montos: "$2.500.000", "$ 950".
  for (const m of clean.matchAll(/\$\s?(\d[\d.,]*)/g)) {
    found.push({ literal: `$${m[1]}`, normalizada: normalizeCifra(m[1]) });
  }
  // Número + unidad de resultado: "18 citas", "45 días", "500 leads".
  for (const m of clean.matchAll(/(\d[\d.,]*)\s+([a-záéíóúñ]+)/gi)) {
    if (UNIDADES_RESULTADO.test(m[2])) {
      found.push({
        literal: `${m[1]} ${m[2]}`,
        normalizada: normalizeCifra(m[1]),
      });
    }
  }
  return found;
}

/**
 * Cifras de los casos CONFIRMADOS del bank: esPlaceholder=false y campos
 * de métrica sin brackets (la disciplina B3 escribe la métrica pendiente
 * de un caso real con brackets — y entonces NO respalda nada).
 */
export function confirmedBankCifras(bank: Fase24Data | undefined): Set<string> {
  const out = new Set<string>();
  if (!bank) return out;
  for (const caso of bank.casos) {
    if (caso.esPlaceholder) continue;
    const campos = [caso.metrica, caso.resultado, caso.tiempo, caso.casoReal];
    if (campos.some((c) => /\[[^\]]*\]/.test(c))) continue;
    for (const campo of campos) {
      for (const m of campo.matchAll(/\d[\d.,]*/g)) {
        const n = normalizeCifra(m[0]);
        if (n) out.add(n);
      }
    }
  }
  return out;
}

/**
 * Lista blanca de cifras desde los TEXTOS de secciones aprobadas de
 * fundamentos (precio, promesa, entregables, FOMO confirmado…): cualquier
 * número que el cliente ya aprobó como parámetro del negocio.
 */
export function buildWhitelist(textosAprobados: string[]): Set<string> {
  const out = new Set<string>();
  for (const texto of textosAprobados) {
    if (!texto) continue;
    for (const m of texto.matchAll(/\d[\d.,]*/g)) {
      const n = normalizeCifra(m[0]);
      if (n) out.add(n);
    }
  }
  return out;
}

/** Junta recursivamente todos los strings de un JSON aprobado. */
export function collectStrings(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, into);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, into);
  }
  return into;
}

/**
 * Valida las cifras de resultado de UN texto. Devuelve las cifras SIN
 * respaldo (ni bank confirmado, ni whitelist, ni brackets).
 */
export function unsupportedMetrics(
  text: string,
  ctx: MetricContext,
): CifraDetectada[] {
  return extractResultMetrics(text).filter(
    (c) =>
      c.normalizada.length > 0 &&
      !ctx.confirmadas.has(c.normalizada) &&
      !ctx.whitelist.has(c.normalizada),
  );
}

/** ¿El texto contiene números concretos FUERA de brackets? (gate B2). */
export function hasUnbracketedNumbers(text: string): boolean {
  return /\d/.test(stripBrackets(text));
}

/**
 * Error legible para el modelo/agencia por cada cifra sin respaldo.
 * `donde` = "Día 26 (hook)" o "Hook 14 de la matriz".
 */
export function metricErrors(
  text: string,
  donde: string,
  ctx: MetricContext,
): string[] {
  return unsupportedMetrics(text, ctx).map(
    (c) =>
      `${donde}: la cifra "${c.literal}" no está respaldada por un caso confirmado del Credibility Bank ni es un parámetro aprobado del negocio — escríbela como placeholder con brackets (ej. "[X]%", "$[X]", "[X] citas") o quita la cifra.`,
  );
}
