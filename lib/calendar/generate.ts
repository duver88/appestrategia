import { generateObject, type LanguageModel } from "ai";
import { prisma } from "@/lib/db";
import {
  FASE6_WEEK_RANGES,
  fase6WeekSchema,
  fase6Schema,
  type Fase6Data,
} from "@/lib/schemas";
import {
  validateCalendar,
  type CalendarValidationContext,
} from "@/lib/schemas/calendar-validators";
import {
  ORDEN_MASTER,
  ETIQUETAS_SEMANA_BASE,
  allowedFormats,
  magnetKeyword,
  esConCara,
  PARCIAL_CARA_MAX_SEMANA,
  PARCIAL_CARA_MAX_MES,
  maxUsosMesFormato,
  ANGULOS_ALTO_IMPACTO,
  GUIA_ANGULO_FORMATO,
} from "@/lib/calendar/catalogs";
import { getSetting, DEFAULT_PRICE_TABLE, type PriceEntry } from "@/lib/settings";

/**
 * Generación del calendario de 31 días POR SEMANAS (4 pasos secuenciales).
 *
 * Por qué: generar las 31 entradas en una sola llamada producía 3-4
 * regeneraciones COMPLETAS cuando fallaba una regla global (~2 min de
 * pantalla muda). Aquí cada semana es una llamada corta con su sub-schema
 * (raíz type:object), el contexto incluye los ángulos/formatos ya usados,
 * cada semana se persiste como avance parcial (Section status PARTIAL,
 * invisible para UI/aprobación/PDF) y, si la validación global falla, se
 * regenera SOLO la semana culpable con máximo 2 reintentos por semana.
 */

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_RETRIES_PER_WEEK = 2;
const MAX_OUTPUT_TOKENS_WEEK = 4000;

export interface CalendarFomo {
  descripcion: string;
  tipo: string;
  confirmedByClient: boolean;
}

export interface CalendarProgress {
  semana: number; // 1..4 (0 = ensamblado)
  de: number;
  estado: "generando" | "validando" | "reintentando" | "ensamblando" | "listo" | "error";
  detalle?: string;
}

type Dia = Fase6Data["dias"][number];

interface PartialData {
  __partial: true;
  fomo: CalendarFomo;
  weeks: Array<Dia[] | null>;
}

export interface GenerateCalendarOptions {
  projectId: string;
  clientId: string;
  model: LanguageModel;
  /** "proveedor:modelo" para UsageLog */
  modelSpec: string;
  /** Resumen del negocio (tono, promesa, tesis, casos, hooks, magnets). */
  contexto: string;
  fomo: CalendarFomo;
  /** Par canónico de CTAs de conversión del proyecto (B4). */
  ctas: { primario: string; secundario: string };
  /** COMPLETA | PARCIAL | NINGUNA — filtra el catálogo de formatos. */
  personaVisible?: string;
  /** Magnets aprobados (fase_5) para keywords exactas. */
  magnets?: Array<{ codigo: string; ctaExacto: string }>;
  /** MODO_2: hooks/ideas del mes anterior prohibidos. */
  prohibido?: string;
  onProgress: (p: CalendarProgress) => void;
  /** Inyectable en tests para controlar la generación sin red. */
  generateWeekFn?: (args: {
    weekIndex: number;
    prompt: string;
  }) => Promise<{ dias: Dia[] }>;
}

export type GenerateCalendarResult =
  | { ok: true; intentosPorSemana: number[] }
  | { ok: false; errors: string[]; intentosPorSemana: number[] };

function weekdayOf(dia: number): string {
  return WEEKDAYS[(dia - 1) % 7];
}

const norm = (s: string) => s.trim().toLowerCase();

function usedCounts(days: Dia[], key: "angulo" | "formato"): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of days) {
    const k = d[key].trim().toLowerCase();
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

// Diversidad mínima acumulada con k semanas fijadas (garantiza llegar a
// ≥10 ángulos y ≥8 formatos al cerrar el mes, semana a semana).
const MIN_ANGLES_BY_WEEKS = [4, 6, 8, 10];
const MIN_FORMATS_BY_WEEKS = [3, 5, 6, 8];

/**
 * Reglas locales de UNA semana, CONSCIENTES DEL MES: se evalúan contra
 * TODAS las demás semanas ya fijadas (anteriores Y posteriores), para que
 * regenerar una semana culpable nunca rompa los topes globales.
 */
export interface WeekValidationCtx {
  ctas?: { primario: string; secundario: string };
  magnets?: Array<{ codigo: string; ctaExacto: string }>;
  personaVisible?: string;
}

export function validateWeek(
  dias: Dia[],
  weekIndex: number,
  otherDays: Dia[], // días de las demás semanas fijadas
  ctx: WeekValidationCtx = {},
): string[] {
  const [from, to] = FASE6_WEEK_RANGES[weekIndex];
  const errors: string[] = [];
  const expected = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const got = dias.map((d) => d.dia);
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    errors.push(`Los días deben ser exactamente ${from}..${to} en orden (recibido: ${got.join(",")}).`);
  }

  // Ningún ángulo 3 veces en días CONSECUTIVOS del mes (incluye fronteras
  // con la semana anterior y la siguiente si ya están fijadas).
  const byDay = new Map<number, string>();
  for (const d of [...otherDays, ...dias]) {
    byDay.set(d.dia, d.angulo.trim().toLowerCase());
  }
  for (let day = 1; day <= 29; day++) {
    const a = byDay.get(day);
    if (a && a === byDay.get(day + 1) && a === byDay.get(day + 2)) {
      errors.push(`El ángulo "${a}" quedaría más de 2 veces seguidas (días ${day}-${day + 2}).`);
      break;
    }
  }

  // Tope de formatos: ≤2 usos POR SEMANA y tope mensual (semana + resto);
  // los SIN CARA suben a 4/mes cuando la persona no es COMPLETA (feasibilidad).
  const persona = ctx.personaVisible ?? "COMPLETA";
  const otherFormats = usedCounts(otherDays, "formato");
  const weekFormats = usedCounts(dias, "formato");
  for (const [f, n] of weekFormats) {
    if (n > 2) {
      errors.push(
        `El formato "${f}" aparece ${n} veces EN ESTA SEMANA (máximo 2 por semana).`,
      );
      continue;
    }
    const cap = maxUsosMesFormato(persona, f);
    const total = n + (otherFormats.get(f) ?? 0);
    if (total > cap) {
      errors.push(
        `El formato "${f}" quedaría con ${total} usos en el mes (máximo ${cap}): usa otros formatos en esta semana.`,
      );
    }
  }

  // Adición 1 — PARCIAL: formatos CON CARA ≤2 esta semana y ≤8 en el mes.
  if (ctx.personaVisible === "PARCIAL") {
    const caraSemana = dias.filter((d) => esConCara(d.formato)).length;
    const caraOtros = otherDays.filter((d) => esConCara(d.formato)).length;
    if (caraSemana > PARCIAL_CARA_MAX_SEMANA) {
      errors.push(
        `${caraSemana} días CON CARA en esta semana (máximo ${PARCIAL_CARA_MAX_SEMANA} con persona visible PARCIAL): usa formatos sin cara en el resto.`,
      );
    }
    if (caraSemana + caraOtros > PARCIAL_CARA_MAX_MES) {
      errors.push(
        `El mes quedaría con ${caraSemana + caraOtros} días CON CARA (máximo ${PARCIAL_CARA_MAX_MES} con persona visible PARCIAL).`,
      );
    }
  }

  // Orden del master: el USO de cada día es fijo; el ángulo admite máximo
  // 2 sustituciones por semana (dentro del catálogo, mismo uso).
  let substitutions = 0;
  for (const d of dias) {
    const master = ORDEN_MASTER[d.dia - 1];
    if (!master) continue;
    if (d.uso !== master.uso) {
      errors.push(
        `Día ${d.dia}: el uso debe ser ${master.uso} según el orden del master (recibido ${d.uso}).`,
      );
    } else if (norm(d.angulo) !== norm(master.angulo)) {
      substitutions++;
    }
  }
  if (substitutions > 2) {
    errors.push(
      `${substitutions} sustituciones de ángulo respecto al orden del master en esta semana (máximo 2): respeta el plan día a día.`,
    );
  }

  // CTAs canónicos (conversión sin magnet) y keywords de magnet.
  if (ctx.ctas) {
    const canon = [norm(ctx.ctas.primario), norm(ctx.ctas.secundario)];
    for (const d of dias) {
      if (d.uso === "CONVERSION" && !d.magnet && !canon.includes(norm(d.cta))) {
        errors.push(
          `Día ${d.dia} (conversión): el cta debe ser EXACTAMENTE "${ctx.ctas.primario}" o "${ctx.ctas.secundario}" (recibido: "${d.cta}").`,
        );
      }
    }
  }
  if (ctx.magnets) {
    const byCode = new Map(ctx.magnets.map((m) => [norm(m.codigo), m]));
    for (const d of dias) {
      if (!d.magnet) continue;
      const m = byCode.get(norm(d.magnet));
      if (!m) {
        errors.push(`Día ${d.dia}: magnet "${d.magnet}" no existe en los aprobados.`);
        continue;
      }
      const kw = magnetKeyword(m.ctaExacto);
      if (kw && !norm(d.cta).includes(norm(kw))) {
        errors.push(
          `Día ${d.dia}: el cta debe incluir la keyword exacta del magnet ${m.codigo} («${kw}»).`,
        );
      }
    }
  }

  // Diversidad acumulada: con k semanas fijadas deben existir los mínimos.
  const all = [...otherDays, ...dias];
  const k = new Set(all.map((d) => Math.min(3, Math.floor((d.dia - 1) / 7)))).size;
  const distinctAngles = usedCounts(all, "angulo").size;
  const distinctFormats = usedCounts(all, "formato").size;
  if (distinctAngles < MIN_ANGLES_BY_WEEKS[k - 1]) {
    errors.push(
      `Con ${k} semana(s) construidas hay solo ${distinctAngles} ángulos distintos (mínimo ${MIN_ANGLES_BY_WEEKS[k - 1]}): introduce ${MIN_ANGLES_BY_WEEKS[k - 1] - distinctAngles} ángulo(s) NUEVOS en esta semana.`,
    );
  }
  if (distinctFormats < MIN_FORMATS_BY_WEEKS[k - 1]) {
    errors.push(
      `Con ${k} semana(s) construidas hay solo ${distinctFormats} formatos distintos (mínimo ${MIN_FORMATS_BY_WEEKS[k - 1]}): introduce ${MIN_FORMATS_BY_WEEKS[k - 1] - distinctFormats} formato(s) NUEVOS en esta semana.`,
    );
  }
  return errors;
}

/** Presupuesto agregado de días CON CARA para una semana (PARCIAL). */
export function caraBudget(
  otherDays: Dia[],
  personaVisible: string,
): { semana: number; mes: number } {
  if (personaVisible !== "PARCIAL") {
    // COMPLETA: sin límite agregado · NINGUNA: el enum ya impide la cara.
    return { semana: Infinity, mes: Infinity };
  }
  const caraOtros = otherDays.filter((d) => esConCara(d.formato)).length;
  return {
    semana: PARCIAL_CARA_MAX_SEMANA,
    mes: Math.max(0, PARCIAL_CARA_MAX_MES - caraOtros),
  };
}

/**
 * Cupos restantes por formato del catálogo PERMITIDO (tope mensual por
 * formato − usados; semana máx 2). En PARCIAL, los formatos CON CARA
 * quedan además acotados por el presupuesto agregado de cara — el cupo
 * individual jamás promete más de lo que el agregado permite.
 */
function formatQuota(otherDays: Dia[], personaVisible: string): Map<string, number> {
  const used = usedCounts(otherDays, "formato");
  const budget = caraBudget(otherDays, personaVisible);
  const caraCap = Math.min(budget.semana, budget.mes);
  const quota = new Map<string, number>();
  for (const f of allowedFormats(personaVisible)) {
    let q = Math.min(
      2,
      maxUsosMesFormato(personaVisible, f) - (used.get(norm(f)) ?? 0),
    );
    if (esConCara(f)) q = Math.min(q, caraCap);
    quota.set(f, q);
  }
  return quota;
}

/**
 * Distribución FACTIBLE de formatos para una semana (para reintentos).
 * SIEMPRE satisfacible: prioriza sin-cara y nunca sugiere más días con
 * cara que el presupuesto agregado (el bug del caso Hernesto era
 * exactamente este plan sugiriendo distribuciones todo-cara en PARCIAL).
 */
export function feasibleFormatPlan(
  otherDays: Dia[],
  daysCount: number,
  personaVisible: string,
): string {
  const quota = [...formatQuota(otherDays, personaVisible).entries()].filter(
    ([, q]) => q > 0,
  );
  const sinCara = quota
    .filter(([f]) => !esConCara(f))
    .sort((a, b) => b[1] - a[1]);
  const conCara = quota
    .filter(([f]) => esConCara(f))
    .sort((a, b) => b[1] - a[1]);

  const budget = caraBudget(otherDays, personaVisible);
  let caraRestante = Math.min(budget.semana, budget.mes, daysCount);
  const plan: string[] = [];
  let remaining = daysCount;

  // Primero la cara permitida (es lo escaso y de mayor impacto)…
  for (const [f, q] of conCara) {
    if (remaining <= 0 || caraRestante <= 0) break;
    const take = Math.min(q, remaining, caraRestante);
    if (take > 0) {
      plan.push(`${f}×${take}`);
      remaining -= take;
      caraRestante -= take;
    }
  }
  // …y el resto SIEMPRE sin cara.
  for (const [f, q] of sinCara) {
    if (remaining <= 0) break;
    const take = Math.min(q, remaining);
    if (take > 0) {
      plan.push(`${f}×${take}`);
      remaining -= take;
    }
  }
  return plan.join(", ");
}

function weekPrompt(args: {
  weekIndex: number;
  contexto: string;
  fomo: CalendarFomo;
  ctas: { primario: string; secundario: string };
  personaVisible: string;
  magnets: Array<{ codigo: string; ctaExacto: string }>;
  otherDays: Dia[]; // días del RESTO del mes ya fijados (antes y después)
  prohibido?: string;
  extraErrors?: string[];
}): string {
  const {
    weekIndex,
    contexto,
    fomo,
    ctas,
    personaVisible,
    magnets,
    otherDays,
    prohibido,
    extraErrors,
  } = args;
  const [from, to] = FASE6_WEEK_RANGES[weekIndex];
  const angulos = usedCounts(otherDays, "angulo");
  const formatos = usedCounts(otherDays, "formato");
  const quota = formatQuota(otherDays, personaVisible);
  const quotaLine = [...quota.entries()]
    .map(([f, q]) => (q > 0 ? `${f}(${q})` : `${f}(PROHIBIDO)`))
    .join(", ");
  // Plan del master día a día para esta semana.
  const planLines = Array.from({ length: to - from + 1 }, (_, k) => {
    const dia = from + k;
    const m = ORDEN_MASTER[dia - 1];
    return `DÍA ${dia} (${weekdayOf(dia)}) — Ángulo: ${m.angulo} — USO: ${m.uso}`;
  }).join("\n");
  const magnetLines =
    magnets.length > 0
      ? magnets
          .map((m) => `${m.codigo} → keyword «${magnetKeyword(m.ctaExacto) ?? m.ctaExacto}»`)
          .join("; ")
      : "—";
  const byDay = new Map(otherDays.map((d) => [d.dia, d.angulo]));
  const boundary = [from - 2, from - 1, to + 1, to + 2]
    .filter((d) => byDay.has(d))
    .map((d) => `día ${d}: ${byDay.get(d)}`);

  // Mínimos de diversidad acumulada al quedar fijada esta semana.
  const k =
    new Set(otherDays.map((d) => Math.floor((d.dia - 1) / 7))).size + 1;
  const needAngles = Math.max(
    1,
    MIN_ANGLES_BY_WEEKS[Math.min(k, 4) - 1] - angulos.size,
  );
  const needFormats = Math.max(
    0,
    MIN_FORMATS_BY_WEEKS[Math.min(k, 4) - 1] - formatos.size,
  );

  return [
    `Construye SOLO la semana ${weekIndex + 1} del calendario de contenido de 31 días: los días ${from} a ${to} (incluidos), en orden, con diaSemana siguiendo el ciclo ${WEEKDAYS.join("/")} (el día ${from} es ${weekdayOf(from)}).`,
    ``,
    `# CONTEXTO DEL NEGOCIO (aprobado por el cliente)`,
    contexto,
    ``,
    `# FOMO REAL DEL MES (confirmado por el cliente)`,
    `${fomo.tipo}: ${fomo.descripcion}`,
    weekIndex === 3
      ? `Esta ES la semana 4: concentra la urgencia del FOMO real (sin inventar urgencias nuevas) y cierra el mes en el día 31.`
      : `El FOMO se concentra en la semana 4: en esta semana NO lo quemes; úsalo solo como horizonte.`,
    ``,
    `# ESTADO DEL RESTO DEL MES (días ya fijados)`,
    otherDays.length === 0
      ? `Aún no hay otros días generados: esta semana abre el mes.`
      : [
          `Ángulos ya usados (veces): ${[...angulos.entries()].map(([a, n]) => `${a}(${n})`).join(", ")}`,
          `Formatos ya usados (veces): ${[...formatos.entries()].map(([f, n]) => `${f}(${n})`).join(", ")}`,
          boundary.length > 0
            ? `Ángulos en la frontera de esta semana — ${boundary.join("; ")} (no formes 3 días seguidos con el mismo).`
            : ``,
        ]
          .filter(Boolean)
          .join("\n"),
    ``,
    `# PLAN DEL MASTER PARA ESTA SEMANA (ángulo y uso por día — OBLIGATORIO)`,
    planLines,
    `Puedes SUSTITUIR el ángulo en máximo 2 días de la semana (mismo USO del día, y solo con ángulos del catálogo). El USO de cada día NUNCA se cambia.`,
    ``,
    `# CATÁLOGOS CERRADOS (valores EXACTOS, el schema los rechaza si difieren)`,
    `Ángulos (18): Dolor Emocional, Problema, Errores, Enemigos, Dudas, Deseo, Storytelling, Autoridad, Prueba Social, Objeciones, Comparación, Controversia, Técnico, Vinculación, Oportunidad, Demostración, Venta Directa, Viral.`,
    `Formatos permitidos para este proyecto (persona visible: ${personaVisible}) con su cupo de ESTA SEMANA: ${quotaLine}.`,
    `Regla de cupos: máximo 2 usos por formato POR SEMANA; tope mensual 3 por formato (4 para los sin cara cuando la persona no es COMPLETA).`,
    personaVisible === "PARCIAL"
      ? [
          `PERSONA VISIBLE PARCIAL — PRESUPUESTO CON CARA (mecánico, el servidor lo verifica): esta semana puedes usar formatos con cara en MÁXIMO ${Math.min(caraBudget(otherDays, personaVisible).semana, caraBudget(otherDays, personaVisible).mes)} día(s) (quedan ${caraBudget(otherDays, personaVisible).mes} en el mes de ${PARCIAL_CARA_MAX_MES}).`,
          `Reserva esos días con cara para los de mayor impacto (${ANGULOS_ALTO_IMPACTO.join(", ")}); TODOS los demás días usan formatos sin cara: Broll+VO, Carrusel, Broll con Texto, Narración AI, Mixed Media, Meme, iPad/Miro, Pantalla Dividida.`,
        ].join("\n")
      : ``,
    `Guía orientativa ángulo→formato del master (úsala salvo mejor criterio): ${GUIA_ANGULO_FORMATO}.`,
    personaVisible !== "COMPLETA"
      ? `Si la guía sugiere un formato CON CARA y no te queda presupuesto, usa la alternativa sin cara más cercana (Comparación/Dudas → Pantalla Dividida · Viral/Deseo/Dolor → Broll+VO · Técnico/Demostración → iPad/Miro · resto → Carrusel o Broll con Texto).`
      : ``,
    extraErrors && extraErrors.length > 0
      ? `DISTRIBUCIÓN FACTIBLE SUGERIDA (puedes mover formatos entre días, pero respeta los totales): ${feasibleFormatPlan(otherDays, to - from + 1, personaVisible)}.`
      : ``,
    ``,
    `# CTAs (el servidor los verifica)`,
    `Días de CONVERSIÓN sin magnet: el campo cta es EXACTAMENTE "${ctas.primario}" o "${ctas.secundario}" — ni una palabra más.`,
    `Días con magnet (campo magnet = código): el cta usa la keyword exacta del magnet. Magnets disponibles: ${magnetLines}.`,
    ``,
    `# IDIOMA (regla dura)`,
    `Español impecable CON TODAS LAS TILDES y signos (Miércoles, teléfono, cuántos, qué, ¿…?, ¡…!). Revisa hook, ideaCentral y cta de cada día antes de emitir: un texto sin tildes se rechaza.`,
    ``,
    `# REGLAS DURAS ADICIONALES`,
    `- Ningún ángulo más de 2 días seguidos (cuenta las fronteras con las semanas vecinas).`,
    `- La prueba social usa SOLO casos del Credibility Bank del contexto.`,
    `- Hooks con brecha de curiosidad: las primeras 3-5 palabras cargan el peso y JAMÁS revelan el final.`,
    prohibido ? `\n# PROHIBIDO REPETIR (mes anterior)\n${prohibido}` : ``,
    extraErrors && extraErrors.length > 0
      ? `\n# CORRIGE ESTOS ERRORES DEL INTENTO ANTERIOR\n${extraErrors.map((e) => `- ${e}`).join("\n")}`
      : ``,
  ]
    .filter((s) => s !== ``)
    .join("\n");
}

/** Semana culpable según los errores de la validación global. */
export function pickCulpritWeek(errors: string[], weeks: Dia[][]): number {
  for (const err of errors) {
    const consec = err.match(/días (\d+)-(\d+)/);
    if (consec) {
      const day = parseInt(consec[2], 10);
      return FASE6_WEEK_RANGES.findIndex(([a, b]) => day >= a && day <= b);
    }
    const fmt = err.match(/formato "([^"]+)" aparece/);
    if (fmt) {
      const f = fmt[1].toLowerCase();
      for (let w = 3; w >= 0; w--) {
        if (weeks[w]?.some((d) => d.formato.trim().toLowerCase() === f)) return w;
      }
    }
  }
  // Falta de diversidad (ángulos/formatos distintos): regenerar la última semana.
  return 3;
}

async function logWeekUsage(
  opts: GenerateCalendarOptions,
  usage: { inputTokens?: number; outputTokens?: number } | undefined,
) {
  try {
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    const [provider, ...rest] = opts.modelSpec.split(":");
    const prices = await getSetting<Record<string, PriceEntry>>(
      "price_table",
      DEFAULT_PRICE_TABLE,
    );
    const price = prices[opts.modelSpec];
    const costUsd = price
      ? (inputTokens / 1e6) * price.inputPerM + (outputTokens / 1e6) * price.outputPerM
      : 0;
    await prisma.usageLog.create({
      data: {
        projectId: opts.projectId,
        clientId: opts.clientId,
        phaseId: "fase_6",
        provider,
        model: rest.join(":"),
        inputTokens,
        outputTokens,
        costUsd,
      },
    });
  } catch (err) {
    console.error("UsageLog de semana falló (no bloquea):", err);
  }
}

async function persistPartial(projectId: string, partial: PartialData) {
  await prisma.section.upsert({
    where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
    create: {
      projectId,
      phaseId: "fase_6",
      data: JSON.stringify(partial),
      status: "PARTIAL",
    },
    update: { data: JSON.stringify(partial), status: "PARTIAL" },
  });
}

export async function generateCalendarInWeeks(
  opts: GenerateCalendarOptions,
): Promise<GenerateCalendarResult> {
  const { projectId, fomo, onProgress } = opts;
  const intentosPorSemana = [0, 0, 0, 0];

  // ——— Reanudación: reutilizar semanas válidas ya persistidas ———
  const weeks: Array<Dia[] | null> = [null, null, null, null];
  const existing = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
  });
  if (existing?.status === "PARTIAL") {
    try {
      const prev = JSON.parse(existing.data) as PartialData;
      if (prev.__partial && Array.isArray(prev.weeks)) {
        for (let w = 0; w < 4; w++) {
          if (prev.weeks[w]) weeks[w] = prev.weeks[w];
        }
        // La semana 4 depende del FOMO: si cambió, se regenera.
        if (prev.fomo?.descripcion !== fomo.descripcion) weeks[3] = null;
      }
    } catch {
      // parcial corrupto → se regenera todo
    }
  }

  const defaultGen = async ({ weekIndex, prompt }: { weekIndex: number; prompt: string }) => {
    const result = await generateObject({
      model: opts.model,
      // Adición 1: con NINGUNA el enum de formato del schema se reduce a
      // los 8 sin cara — imposible emitir un formato con cara.
      schema: fase6WeekSchema(weekIndex, opts.personaVisible ?? "COMPLETA"),
      prompt,
      maxOutputTokens: MAX_OUTPUT_TOKENS_WEEK,
    });
    await logWeekUsage(opts, result.usage);
    return result.object as { dias: Dia[] };
  };
  const genWeek = opts.generateWeekFn ?? defaultGen;

  const generateOneWeek = async (
    w: number,
    extraErrors: string[],
  ): Promise<string[] | null> => {
    // TODAS las demás semanas fijadas (antes Y después): regenerar una
    // culpable jamás puede romper los topes del resto del mes.
    const otherDays = weeks
      .filter((_, i) => i !== w)
      .flatMap((x) => x ?? [])
      .sort((a, b) => a.dia - b.dia);
    let errors = extraErrors;
    for (let attempt = 0; attempt <= MAX_RETRIES_PER_WEEK; attempt++) {
      // Tope TOTAL por semana (incluye regeneraciones por la validación
      // global): 1 generación + MAX_RETRIES_PER_WEEK reintentos.
      if (intentosPorSemana[w] >= 1 + MAX_RETRIES_PER_WEEK) {
        return errors.length > 0 ? errors : ["Límite de reintentos de la semana alcanzado"];
      }
      if (attempt > 0 || errors.length > 0) {
        onProgress({ semana: w + 1, de: 4, estado: "reintentando", detalle: errors[0] });
      } else {
        onProgress({ semana: w + 1, de: 4, estado: "generando" });
      }
      intentosPorSemana[w]++;
      let dias: Dia[];
      try {
        dias = (
          await genWeek({
            weekIndex: w,
            prompt: weekPrompt({
              weekIndex: w,
              contexto: opts.contexto,
              fomo,
              ctas: opts.ctas,
              personaVisible: opts.personaVisible ?? "COMPLETA",
              magnets: opts.magnets ?? [],
              otherDays,
              prohibido: opts.prohibido,
              extraErrors: errors,
            }),
          })
        ).dias;
      } catch {
        // El schema con enums cerrados rechazó la salida del modelo.
        errors = [
          "La semana produjo ángulos o formatos fuera de los catálogos cerrados: usa los valores EXACTOS de las listas.",
        ];
        continue;
      }
      onProgress({ semana: w + 1, de: 4, estado: "validando" });
      errors = validateWeek(dias, w, otherDays, {
        ctas: opts.ctas,
        magnets: opts.magnets,
        personaVisible: opts.personaVisible,
      });
      if (errors.length === 0) {
        weeks[w] = dias;
        await persistPartial(projectId, { __partial: true, fomo, weeks });
        return null;
      }
    }
    return errors;
  };

  // ——— Paso 1-4: semanas secuenciales (saltando las ya válidas) ———
  for (let w = 0; w < 4; w++) {
    if (weeks[w]) continue;
    const failed = await generateOneWeek(w, []);
    if (failed) {
      onProgress({ semana: w + 1, de: 4, estado: "error", detalle: failed[0] });
      return { ok: false, errors: failed, intentosPorSemana };
    }
  }

  // ——— Ensamblado + validación global, regenerando SOLO la culpable ———
  for (;;) {
    onProgress({ semana: 4, de: 4, estado: "ensamblando" });
    const dias = weeks.flatMap((x) => x!);
    const assembled: Fase6Data = {
      fomo,
      dias,
      verificacion: {
        angulosDistintos: usedCounts(dias, "angulo").size,
        formatosDistintos: usedCounts(dias, "formato").size,
        fomoConfirmado: fomo.confirmedByClient,
        pruebaSocialConCasos: true,
      },
      // Etiquetas estratégicas (lógica semanal del master); la semana 4
      // muestra el FOMO en positivo — nunca "sin FOMO".
      etiquetasSemana: [
        ETIQUETAS_SEMANA_BASE[0],
        ETIQUETAS_SEMANA_BASE[1],
        ETIQUETAS_SEMANA_BASE[2],
        `${ETIQUETAS_SEMANA_BASE[3]} — FOMO: ${fomo.descripcion}`,
      ],
      ctas: opts.ctas,
    };
    const globalErrors = validateCalendar(assembled, {
      personaVisible: opts.personaVisible,
      magnets: opts.magnets,
    });
    if (globalErrors.length === 0) {
      const parsed = fase6Schema.parse(assembled); // defensa en profundidad
      await prisma.section.upsert({
        where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
        create: {
          projectId,
          phaseId: "fase_6",
          data: JSON.stringify(parsed),
          status: "DRAFT",
        },
        update: { data: JSON.stringify(parsed), status: "DRAFT" },
      });
      onProgress({ semana: 4, de: 4, estado: "listo" });
      return { ok: true, intentosPorSemana };
    }

    const culprit = pickCulpritWeek(globalErrors, weeks as Dia[][]);
    if (intentosPorSemana[culprit] > MAX_RETRIES_PER_WEEK) {
      // Nunca bucle infinito: error claro y el parcial queda para reanudar.
      onProgress({ semana: culprit + 1, de: 4, estado: "error", detalle: globalErrors[0] });
      return { ok: false, errors: globalErrors, intentosPorSemana };
    }
    weeks[culprit] = null;
    await persistPartial(projectId, { __partial: true, fomo, weeks });
    const failed = await generateOneWeek(culprit, globalErrors);
    if (failed) {
      onProgress({ semana: culprit + 1, de: 4, estado: "error", detalle: failed[0] });
      return { ok: false, errors: failed, intentosPorSemana };
    }
  }
}
