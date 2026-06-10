import { generateObject, type LanguageModel } from "ai";
import { prisma } from "@/lib/db";
import {
  FASE6_WEEK_RANGES,
  fase6WeekSchema,
  fase6Schema,
  type Fase6Data,
} from "@/lib/schemas";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
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
export function validateWeek(
  dias: Dia[],
  weekIndex: number,
  otherDays: Dia[], // días de las demás semanas fijadas
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

  // Tope de formatos: ≤2 usos POR SEMANA y ≤3 EN EL MES (semana + resto).
  const otherFormats = usedCounts(otherDays, "formato");
  const weekFormats = usedCounts(dias, "formato");
  for (const [f, n] of weekFormats) {
    if (n > 2) {
      errors.push(
        `El formato "${f}" aparece ${n} veces EN ESTA SEMANA (máximo 2 por semana).`,
      );
      continue;
    }
    const total = n + (otherFormats.get(f) ?? 0);
    if (total > 3) {
      errors.push(
        `El formato "${f}" quedaría con ${total} usos en el mes (máximo 3): usa otros formatos en esta semana.`,
      );
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

// Catálogo de formatos estándar para construir cupos explícitos.
const FORMAT_CATALOG = [
  "reel",
  "carrusel",
  "historia",
  "video en directo",
  "post de texto",
  "encuesta",
  "testimonio en video",
  "demo del producto",
  "behind the scenes",
  "infografía",
  "nota de voz",
  "colaboración",
];

/** Cupos restantes por formato (mes: 3 − usados; semana: máx 2). */
function formatQuota(otherDays: Dia[]): Map<string, number> {
  const used = usedCounts(otherDays, "formato");
  const quota = new Map<string, number>();
  for (const f of FORMAT_CATALOG) {
    quota.set(f, Math.min(2, 3 - (used.get(f) ?? 0)));
  }
  for (const [f, n] of used) {
    if (!quota.has(f)) quota.set(f, Math.min(2, 3 - n));
  }
  return quota;
}

/** Distribución FACTIBLE de formatos para una semana (para reintentos). */
function feasibleFormatPlan(otherDays: Dia[], daysCount: number): string {
  const quota = [...formatQuota(otherDays).entries()]
    .filter(([, q]) => q > 0)
    .sort((a, b) => b[1] - a[1]);
  const plan: string[] = [];
  let remaining = daysCount;
  for (const [f, q] of quota) {
    if (remaining <= 0) break;
    const take = Math.min(q, remaining);
    plan.push(`${f}×${take}`);
    remaining -= take;
  }
  return plan.join(", ");
}

function weekPrompt(args: {
  weekIndex: number;
  contexto: string;
  fomo: CalendarFomo;
  otherDays: Dia[]; // días del RESTO del mes ya fijados (antes y después)
  prohibido?: string;
  extraErrors?: string[];
}): string {
  const { weekIndex, contexto, fomo, otherDays, prohibido, extraErrors } = args;
  const [from, to] = FASE6_WEEK_RANGES[weekIndex];
  const angulos = usedCounts(otherDays, "angulo");
  const formatos = usedCounts(otherDays, "formato");
  const quota = formatQuota(otherDays);
  const quotaLine = [...quota.entries()]
    .map(([f, q]) => (q > 0 ? `${f}(${q})` : `${f}(PROHIBIDO)`))
    .join(", ");
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
    `# CUPOS DE FORMATO PARA ESTA SEMANA (mecánicos: el servidor los verifica)`,
    `Cada formato indica cuántas veces puedes usarlo ESTA SEMANA: ${quotaLine}.`,
    `Suma de reglas: máximo 2 usos por formato POR SEMANA y 3 EN EL MES. No inventes usos por encima del cupo.`,
    extraErrors && extraErrors.length > 0
      ? `DISTRIBUCIÓN FACTIBLE SUGERIDA (puedes mover formatos entre días, pero respeta los totales): ${feasibleFormatPlan(otherDays, to - from + 1)}.`
      : ``,
    ``,
    `# REGLAS DURAS DE ESTA SEMANA (el servidor las verifica: si las violas, se rechaza)`,
    `- OBLIGATORIO: introduce al menos ${needAngles} ángulo(s) NUEVOS, no usados en el resto del mes. Un ángulo = un enfoque temático concreto (usa el banco de tesis: cada tesis es un ángulo distinto). Dentro de la semana, NO repitas ángulo en más de 2 días.`,
    needFormats > 0
      ? `- OBLIGATORIO: introduce al menos ${needFormats} formato(s) NUEVOS no usados en el resto del mes (elige del catálogo de cupos de arriba).`
      : `- Respeta los cupos de formato de arriba al pie de la letra.`,
    `- Ningún ángulo más de 2 días seguidos (cuenta las fronteras con las semanas vecinas).`,
    `- Mezcla usos ATRACCION/NUTRICION/CONVERSION; la prueba social usa SOLO casos del Credibility Bank del contexto.`,
    `- Los magnets se ofrecen con su CTA exacto en los días que apliquen (campo magnet = código del magnet o null).`,
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
      schema: fase6WeekSchema(weekIndex),
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
      const dias = (
        await genWeek({
          weekIndex: w,
          prompt: weekPrompt({
            weekIndex: w,
            contexto: opts.contexto,
            fomo,
            otherDays,
            prohibido: opts.prohibido,
            extraErrors: errors,
          }),
        })
      ).dias;
      onProgress({ semana: w + 1, de: 4, estado: "validando" });
      errors = validateWeek(dias, w, otherDays);
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
    };
    const globalErrors = validateCalendar(assembled);
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
