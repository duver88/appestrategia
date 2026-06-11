import type { Fase6Data } from "./index";
import {
  metricErrors,
  hasUnbracketedNumbers,
  type MetricContext,
} from "./metric-validators";
import { crossValidateMagnets } from "./magnet-validators";
import {
  ANGULOS_18,
  FORMATOS_19,
  ORDEN_MASTER,
  FASE6_SEMANAS,
  allowedFormats,
  magnetKeyword,
  esConCara,
  PARCIAL_CARA_MAX_SEMANA,
  PARCIAL_CARA_MAX_MES,
  maxUsosMesFormato,
} from "@/lib/calendar/catalogs";

/**
 * Verificación obligatoria de la Parte 6 del master prompt v2.2.
 * Si falla, los errores se devuelven al modelo en el resultado de la tool
 * para que corrija — el cliente nunca ve un calendario inválido.
 */

export interface CalendarValidationContext {
  /** COMPLETA | PARCIAL | NINGUNA — filtra el catálogo de formatos. */
  personaVisible?: string;
  /**
   * Magnets de fase_5 para exigir la keyword exacta en sus días.
   * Ajuste #3 (A2): con diasAplica presente se exige además la igualdad
   * EXACTA de conjuntos día a día y se detectan keywords huérfanas.
   */
  magnets?: Array<{ codigo: string; ctaExacto: string; diasAplica?: number[] }>;
  /**
   * Ajuste #3 (A1): cifras confirmadas del bank + lista blanca de
   * parámetros aprobados. Si está presente, toda métrica de resultado en
   * hooks/ideas sin respaldo ni brackets es rechazo.
   */
  metricas?: MetricContext;
}

const norm = (s: string) => s.trim().toLowerCase();

export function validateCalendar(
  data: Fase6Data,
  ctx: CalendarValidationContext = {},
): string[] {
  const errors: string[] = [];
  const dias = [...data.dias].sort((a, b) => a.dia - b.dia);

  // ——— Reglas históricas del master (se mantienen intactas) ———
  const angulos = new Set(dias.map((d) => norm(d.angulo)));
  if (angulos.size < 10) {
    errors.push(`Solo hay ${angulos.size} ángulos distintos; se requieren al menos 10.`);
  }
  const formatos = new Set(dias.map((d) => norm(d.formato)));
  if (formatos.size < 8) {
    errors.push(`Solo hay ${formatos.size} formatos distintos; se requieren al menos 8.`);
  }
  for (let i = 2; i < dias.length; i++) {
    const a = norm(dias[i].angulo);
    if (a === norm(dias[i - 1].angulo) && a === norm(dias[i - 2].angulo)) {
      errors.push(
        `El ángulo "${dias[i].angulo}" se repite más de 2 veces seguidas (días ${dias[i - 2].dia}-${dias[i].dia}).`,
      );
    }
  }
  // Tope de usos por formato: 3 en general; los SIN CARA suben a 4 cuando
  // la persona no es COMPLETA (feasibilidad — ver catálogos).
  const persona = ctx.personaVisible ?? "COMPLETA";
  const formatoCount = new Map<string, number>();
  const formatoOriginal = new Map<string, string>();
  for (const d of dias) {
    const f = norm(d.formato);
    formatoCount.set(f, (formatoCount.get(f) ?? 0) + 1);
    formatoOriginal.set(f, d.formato);
  }
  for (const [f, count] of formatoCount) {
    const cap = maxUsosMesFormato(persona, formatoOriginal.get(f) ?? f);
    if (count > cap) {
      errors.push(`El formato "${f}" aparece ${count} veces; máximo ${cap}.`);
    }
  }
  // Ajuste #3 (B2) — gate TERNARIO: confirmado, pendiente con brackets, o
  // bloqueado. PENDIENTE_BRACKETS solo es válido si la descripción del FOMO
  // no contiene números concretos fuera de brackets.
  const fomoPendiente = data.fomo.estado === "PENDIENTE_BRACKETS";
  if (!data.fomo.confirmedByClient && !fomoPendiente) {
    errors.push(
      "El FOMO de la semana 4 no está confirmado por el cliente (fomo.confirmedByClient debe ser true antes de aprobar, o estado PENDIENTE_BRACKETS con los números en brackets).",
    );
  }
  if (fomoPendiente && hasUnbracketedNumbers(data.fomo.descripcion)) {
    errors.push(
      `FOMO en estado PENDIENTE_BRACKETS pero la descripción tiene números concretos fuera de brackets ("${data.fomo.descripcion}"): escríbelos como "[X] cupos", "[X]%", etc.`,
    );
  }

  // ——— A2.1 / A2.3: catálogos cerrados (18 ángulos / 19 formatos) ———
  const angSet = new Set<string>(ANGULOS_18.map(norm));
  const fmtAllowed = new Set(
    allowedFormats(ctx.personaVisible ?? "COMPLETA").map(norm),
  );
  const fmtAll = new Set<string>(FORMATOS_19.map(norm));
  for (const d of dias) {
    if (!angSet.has(norm(d.angulo))) {
      errors.push(
        `Día ${d.dia}: ángulo "${d.angulo}" fuera del catálogo canónico de 18 ángulos.`,
      );
    }
    if (!fmtAll.has(norm(d.formato))) {
      errors.push(
        `Día ${d.dia}: formato "${d.formato}" fuera del catálogo canónico de 19 formatos.`,
      );
    } else if (!fmtAllowed.has(norm(d.formato))) {
      errors.push(
        `Día ${d.dia}: formato "${d.formato}" requiere mostrar la cara y el proyecto es sin persona visible.`,
      );
    }
  }

  // ——— Adición 1: PARCIAL — formatos CON CARA con tope 2/semana y 8/mes ———
  if (ctx.personaVisible === "PARCIAL") {
    let caraMes = 0;
    for (let w = 0; w < FASE6_SEMANAS.length; w++) {
      const [from, to] = FASE6_SEMANAS[w];
      const caraSemana = dias.filter(
        (d) => d.dia >= from && d.dia <= to && esConCara(d.formato),
      ).length;
      caraMes += caraSemana;
      if (caraSemana > PARCIAL_CARA_MAX_SEMANA) {
        errors.push(
          `Semana ${w + 1}: ${caraSemana} días con formato CON CARA (máximo ${PARCIAL_CARA_MAX_SEMANA} por semana con persona visible PARCIAL).`,
        );
      }
    }
    if (caraMes > PARCIAL_CARA_MAX_MES) {
      errors.push(
        `${caraMes} días con formato CON CARA en el mes (máximo ${PARCIAL_CARA_MAX_MES} con persona visible PARCIAL).`,
      );
    }
  }

  // ——— A2.2: orden de ángulos del master con sustituciones limitadas ———
  // Máximo 2 sustituciones por semana, siempre dentro del MISMO uso del día.
  for (let w = 0; w < FASE6_SEMANAS.length; w++) {
    const [from, to] = FASE6_SEMANAS[w];
    let substitutions = 0;
    for (const d of dias.filter((x) => x.dia >= from && x.dia <= to)) {
      const master = ORDEN_MASTER[d.dia - 1];
      if (!master) continue;
      if (d.uso !== master.uso) {
        errors.push(
          `Día ${d.dia}: el uso debe ser ${master.uso} según el orden del master (recibido ${d.uso}).`,
        );
        continue;
      }
      if (norm(d.angulo) !== norm(master.angulo)) substitutions++;
    }
    if (substitutions > 2) {
      errors.push(
        `Semana ${w + 1}: ${substitutions} sustituciones de ángulo respecto al orden del master (máximo 2 por semana).`,
      );
    }
  }
  // Cerraduras explícitas: semana 1 con conversión; semana 4 con la
  // conversión como uso dominante.
  const week1 = dias.filter((d) => d.dia <= 7);
  if (!week1.some((d) => d.uso === "CONVERSION")) {
    errors.push("La semana 1 no tiene ningún día de CONVERSIÓN (prohibido).");
  }
  const week4 = dias.filter((d) => d.dia >= 22);
  const w4counts = { ATRACCION: 0, NUTRICION: 0, CONVERSION: 0 };
  for (const d of week4) w4counts[d.uso]++;
  if (
    week4.length > 0 &&
    (w4counts.CONVERSION < w4counts.ATRACCION ||
      w4counts.CONVERSION < w4counts.NUTRICION)
  ) {
    errors.push(
      `La semana 4 debe tener la CONVERSIÓN como uso dominante (actual: ${w4counts.CONVERSION}C/${w4counts.NUTRICION}N/${w4counts.ATRACCION}A).`,
    );
  }

  // ——— A2.4: CTAs canónicos y keywords de magnet ———
  if (!data.ctas?.primario || !data.ctas?.secundario) {
    errors.push(
      "Faltan los CTAs canónicos del proyecto (ctas.primario / ctas.secundario).",
    );
  } else {
    const canon = [norm(data.ctas.primario), norm(data.ctas.secundario)];
    for (const d of dias) {
      if (d.uso !== "CONVERSION" || d.magnet) continue;
      if (!canon.includes(norm(d.cta))) {
        errors.push(
          `Día ${d.dia} (conversión): el CTA debe ser exactamente "${data.ctas.primario}" o "${data.ctas.secundario}" (recibido: "${d.cta}").`,
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
        errors.push(`Día ${d.dia}: magnet "${d.magnet}" no existe en los Organic Magnets aprobados.`);
        continue;
      }
      const kw = magnetKeyword(m.ctaExacto);
      if (kw && !norm(d.cta).includes(norm(kw))) {
        errors.push(
          `Día ${d.dia}: el CTA debe usar la keyword exacta del magnet ${m.codigo} («${kw}»).`,
        );
      }
    }
  }

  // ——— B2.3 / A3.2: etiquetas estratégicas de semana ———
  if (!data.etiquetasSemana || data.etiquetasSemana.length !== 4) {
    errors.push("Faltan las 4 etiquetas estratégicas de semana (etiquetasSemana).");
  }

  // ——— Ajuste #3 (A2): igualdad exacta de conjuntos magnets↔calendario y
  // keywords huérfanas (solo cuando fase_5 trae diasAplica) ———
  if (ctx.magnets?.some((m) => m.diasAplica)) {
    errors.push(...crossValidateMagnets(dias, ctx.magnets, magnetKeyword));
  }

  // ——— Ajuste #3 (A1): cifras de resultado respaldadas o en brackets ———
  if (ctx.metricas) {
    for (const d of dias) {
      errors.push(...metricErrors(d.hook, `Día ${d.dia} (hook)`, ctx.metricas));
      errors.push(
        ...metricErrors(d.ideaCentral, `Día ${d.dia} (idea central)`, ctx.metricas),
      );
    }
  }

  // ——— Ajuste #3 (B5): si el cierre existe, la cita final no puede estar
  // vacía (los calendarios viejos sin cierre siguen siendo válidos) ———
  if (data.cierre && data.cierre.citaFinal.trim().length < 20) {
    errors.push("El cierre personalizado existe pero la cita final está vacía o es trivial.");
  }

  return errors;
}
