import type { Fase24Data } from "./index";

/**
 * Ajuste #3 — A1: toda MÉTRICA DE RESULTADO que aparezca en hooks o ideas
 * centrales debe estar respaldada por un caso CONFIRMADO del Credibility
 * Bank, ser un parámetro del negocio aprobado en fases previas (lista
 * blanca), o escribirse como placeholder con brackets ("[X]%", "$[X]").
 *
 * Corrección del owner (revisión del PDF de muestra): la detección cubre
 * monedas (€/EUR/USD/COP además de $), verbos de dinero ("facturar 5000",
 * "ganar X") y rangos ("de 800 a 5000"); y la lista blanca exige
 * coincidencia de NÚMERO + UNIDAD — "10 clientes en 90 días" (promesa
 * aprobada) NO autoriza "10 leads en un día".
 *
 * Diseño: se prefieren FALSOS POSITIVOS (el modelo reformula con brackets
 * o sin la cifra; el pipeline reintenta con el error literal) a falsos
 * negativos (cifra inventada publicada).
 */

/** Cifras detectadas/aprobadas: claves número|unidad + números sueltos. */
export interface CifraSet {
  /** "40|pct", "5000|money", "18|cita", "90|dia"… */
  keys: Set<string>;
  /** Números sueltos (autorizan SOLO cifras detectadas sin unidad). */
  bare: Set<string>;
}

export interface MetricContext {
  /** Cifras de casos CONFIRMADOS del bank (esPlaceholder=false, sin brackets). */
  confirmadas: CifraSet;
  /** Cifras de parámetros aprobados en fases previas (precio, promesa, etc.). */
  whitelist: CifraSet;
}

export const emptyCifraSet = (): CifraSet => ({ keys: new Set(), bare: new Set() });

export function cifraSetIsEmpty(s: CifraSet): boolean {
  return s.keys.size === 0 && s.bare.size === 0;
}

/** Unidades que convierten un número en una MÉTRICA DE RESULTADO. */
const UNIDADES_RESULTADO =
  /^(citas?|leads?|clientes?|ventas?|reuniones?|llamadas?|cupos?|d[ií]as?|semanas?|meses?|años?|kwp|pacientes?|cierres?|agendamientos?|seguidores?|alumnos?)$/i;

/** Clase normalizada de la unidad (singular, sin acentos relevantes). */
function unitClass(unit: string): string {
  const u = unit
    .toLowerCase()
    .replace(/í/g, "i")
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ñ/g, "n");
  if (/^d[i]as?$/.test(u)) return "dia";
  if (/^semanas?$/.test(u)) return "semana";
  if (/^meses$|^mes$/.test(u)) return "mes";
  if (/^anos?$/.test(u)) return "ano";
  return u.replace(/s$/, "");
}

/** Normaliza una cifra a su secuencia de dígitos ("$1.200.000" → "1200000"). */
export function normalizeCifra(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

/** Quita los segmentos en brackets: lo que está en "[…]" es placeholder válido. */
function stripBrackets(text: string): string {
  return text.replace(/\[[^\]]*\]/g, " ");
}

export interface CifraDetectada {
  /** Texto tal como aparece ("40%", "5000€", "18 citas", "de 800 a 5000"). */
  literal: string;
  /** Solo dígitos, para cruzar contra whitelist/bank. */
  normalizada: string;
  /** Clase de unidad ("pct", "money", "cita", "dia"…) o null si no tiene. */
  unidad: string | null;
}

/**
 * Extrae las cifras de RESULTADO de un texto (ya sin brackets):
 * porcentajes, montos (símbolo o código de moneda, antes o después),
 * verbos de dinero, números adyacentes a unidades de resultado y rangos
 * "de X a Y".
 */
export function extractResultMetrics(text: string): CifraDetectada[] {
  const clean = stripBrackets(text);
  const found: CifraDetectada[] = [];
  const push = (literal: string, num: string, unidad: string | null) => {
    const normalizada = normalizeCifra(num);
    if (normalizada) found.push({ literal: literal.trim(), normalizada, unidad });
  };
  // Porcentajes: "40%", "40 %", "40 por ciento".
  for (const m of clean.matchAll(/(\d[\d.,]*)\s*(?:%|por\s?ciento)/gi)) {
    push(`${m[1]}%`, m[1], "pct");
  }
  // Montos con símbolo/código ANTES: "$2.500.000", "€800", "USD 950".
  for (const m of clean.matchAll(/(?:\$|€|usd|eur|cop)\s?(\d[\d.,]*)/gi)) {
    push(m[0], m[1], "money");
  }
  // Montos con símbolo/código DESPUÉS: "800€", "5000 EUR", "950 USD".
  for (const m of clean.matchAll(/(\d[\d.,]*)\s?(?:€|usd|eur|cop|euros?|d[oó]lares?|pesos?)\b/gi)) {
    push(m[0], m[1], "money");
  }
  // Verbos de dinero: "facturar 5000", "gana 2.000", "vendió 300", "ahorró 90".
  for (const m of clean.matchAll(
    /(?:facturar|factur[oóa]|facturando|ganar|gan[oóa]|ganando|vender|vendi[oó]|vendiendo|ahorrar|ahorr[oóa]|cobrar|cobr[oóa])\s+(?:\$|€)?\s?(\d[\d.,]*)/gi,
  )) {
    push(m[0], m[1], "money");
  }
  // Número + unidad de resultado: "18 citas", "45 días", "10 leads".
  for (const m of clean.matchAll(/(\d[\d.,]*)\s+([a-záéíóúñ]+)/gi)) {
    if (UNIDADES_RESULTADO.test(m[2])) {
      push(`${m[1]} ${m[2]}`, m[1], unitClass(m[2]));
    }
  }
  // Rangos "de X a Y" (con o sin unidad/moneda pegada): ambos números.
  for (const m of clean.matchAll(/\bde\s+(?:\$|€)?\s?(\d[\d.,]*)\S*\s+a\s+(?:[a-záéíóúñ]+\s+)?(?:\$|€)?\s?(\d[\d.,]*)/gi)) {
    push(`de ${m[1]} a ${m[2]}`, m[1], null);
    push(`de ${m[1]} a ${m[2]}`, m[2], null);
  }
  return found;
}

/** Agrega las cifras de un texto a un CifraSet (claves + números sueltos). */
function addTextCifras(text: string, into: CifraSet): void {
  for (const c of extractResultMetrics(text)) {
    if (c.unidad) into.keys.add(`${c.normalizada}|${c.unidad}`);
    into.bare.add(c.normalizada);
  }
  // Todos los números del texto autorizan cifras SIN unidad (rangos, etc.).
  for (const m of stripBrackets(text).matchAll(/\d[\d.,]*/g)) {
    const n = normalizeCifra(m[0]);
    if (n) into.bare.add(n);
  }
}

/**
 * Cifras de los casos CONFIRMADOS del bank: esPlaceholder=false y campos
 * de métrica sin brackets (la disciplina B3 escribe la métrica pendiente
 * de un caso real con brackets — y entonces NO respalda nada).
 */
export function confirmedBankCifras(bank: Fase24Data | undefined): CifraSet {
  const out = emptyCifraSet();
  if (!bank) return out;
  for (const caso of bank.casos) {
    if (caso.esPlaceholder) continue;
    const campos = [caso.metrica, caso.resultado, caso.tiempo, caso.casoReal];
    if (campos.some((c) => /\[[^\]]*\]/.test(c))) continue;
    for (const campo of campos) addTextCifras(campo, out);
  }
  return out;
}

/**
 * Lista blanca desde los TEXTOS de secciones aprobadas de fundamentos
 * (precio, promesa, entregables, FOMO confirmado…). La coincidencia exige
 * número + unidad: "10 clientes" aprobado NO autoriza "10 leads".
 */
export function buildWhitelist(textosAprobados: string[]): CifraSet {
  const out = emptyCifraSet();
  for (const texto of textosAprobados) {
    if (texto) addTextCifras(texto, out);
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

function isSupported(c: CifraDetectada, set: CifraSet): boolean {
  if (c.unidad) return set.keys.has(`${c.normalizada}|${c.unidad}`);
  return set.bare.has(c.normalizada);
}

/**
 * Valida las cifras de resultado de UN texto. Devuelve las cifras SIN
 * respaldo (ni bank confirmado, ni whitelist con la MISMA unidad, ni brackets).
 */
export function unsupportedMetrics(
  text: string,
  ctx: MetricContext,
): CifraDetectada[] {
  return extractResultMetrics(text).filter(
    (c) => !isSupported(c, ctx.confirmadas) && !isSupported(c, ctx.whitelist),
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
      `${donde}: la cifra "${c.literal}" no está respaldada por un caso confirmado del Credibility Bank ni es un parámetro aprobado del negocio (la coincidencia exige número Y unidad) — escríbela como placeholder con brackets (ej. "[X]%", "$[X]", "[X] citas") o quita la cifra.`,
  );
}

/**
 * Corrección del owner (punto 3): tokens de eco de instrucción PROHIBIDOS
 * en cualquier texto visible del calendario/cierre. Los brackets [X]
 * siguen siendo válidos.
 */
const ECO_TOKENS = [
  "placeholder",
  "sin inventar cifras",
  "sin cifras inventadas",
  "según la regla",
  "el servidor",
];

export function echoErrors(text: string, donde: string): string[] {
  const low = text.toLowerCase();
  return ECO_TOKENS.filter((t) => low.includes(t)).map(
    (t) =>
      `${donde}: contiene lenguaje de instrucción/sistema ("${t}") — el texto se publica tal cual; integra la cifra en brackets de forma natural y elimina la meta-nota.`,
  );
}

/** Meses para la coherencia de mes (corrección del owner, punto 4). */
const MESES_NOMBRES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MES_RE = new RegExp(`\\b(${MESES_NOMBRES.join("|")})\\b`, "gi");

/**
 * Menciones de mes distintas al mes del calendario. `mes` en minúsculas
 * ("junio"). Devuelve errores por cada mes ajeno mencionado.
 */
export function monthErrors(text: string, donde: string, mes: string): string[] {
  const target = mes.toLowerCase();
  const out: string[] = [];
  for (const m of text.matchAll(MES_RE)) {
    if (m[1].toLowerCase() !== target) {
      out.push(
        `${donde}: menciona "${m[1]}" pero el calendario es de ${mes} — toda mención de mes usa el mes del calendario.`,
      );
    }
  }
  return out;
}
