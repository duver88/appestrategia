import type { Fase5Data } from "./index";
import { MAGNET_MAX_PCT_MES, MAGNET_MIN_DIAS } from "@/lib/calendar/catalogs";

/**
 * Ajuste #3 — A2: los Organic Magnets declaran sus días (diasAplica) y el
 * calendario debe respetarlos EXACTAMENTE. Esta validación corre al aprobar
 * fase_5 (donde el conflicto aún se puede corregir): evidencia Hernesto —
 * fase_5 aprobada con días solapados (2 magnets el mismo día ×5) y todos
 * los diasAplica en los días 1-17, imposible de cumplir por el calendario.
 */

export interface MagnetLimits {
  maxPctMes: number; // ningún OM > este % de los días con magnet del mes
  minDias: number; // todo OM definido aparece al menos estos días
}

export const DEFAULT_MAGNET_LIMITS: MagnetLimits = {
  maxPctMes: MAGNET_MAX_PCT_MES,
  minDias: MAGNET_MIN_DIAS,
};

export function validateMagnets(
  data: Fase5Data,
  limits: MagnetLimits = DEFAULT_MAGNET_LIMITS,
): string[] {
  const errors: string[] = [];
  const dayOwner = new Map<number, string>();
  let totalDias = 0;

  for (const m of data.magnets) {
    const dias = [...new Set(m.diasAplica)];
    if (dias.length !== m.diasAplica.length) {
      errors.push(`${m.codigo}: tiene días repetidos en diasAplica.`);
    }
    for (const d of dias) {
      if (d < 1 || d > 31) {
        errors.push(`${m.codigo}: el día ${d} está fuera del mes (1-31).`);
        continue;
      }
      const owner = dayOwner.get(d);
      if (owner) {
        errors.push(
          `Día ${d}: asignado a ${owner} y a ${m.codigo} — cada día del calendario admite UN solo magnet; los diasAplica deben ser disjuntos.`,
        );
      } else {
        dayOwner.set(d, m.codigo);
      }
    }
    totalDias += dias.length;
    if (dias.length < limits.minDias) {
      errors.push(
        `${m.codigo}: aparece ${dias.length} día(s); todo magnet definido debe aplicarse al menos ${limits.minDias} días en el mes.`,
      );
    }
  }

  const maxDias = Math.floor(totalDias * limits.maxPctMes);
  for (const m of data.magnets) {
    const n = new Set(m.diasAplica).size;
    if (totalDias > 0 && n > maxDias) {
      errors.push(
        `${m.codigo}: concentra ${n} de ${totalDias} días con magnet (${Math.round((n / totalDias) * 100)}%); el máximo es ${Math.round(limits.maxPctMes * 100)}% — redistribuye hacia los magnets con menos días.`,
      );
    }
  }
  return errors;
}

/**
 * A2.1 — igualdad EXACTA de conjuntos entre los diasAplica aprobados y los
 * días del calendario que asignan cada magnet, con diff legible.
 * A2.2 — keyword huérfana: día cuyo CTA usa la keyword de un magnet pero
 * con la columna Magnet vacía.
 */
export function crossValidateMagnets(
  dias: Array<{ dia: number; magnet: string | null; cta: string }>,
  magnets: Array<{ codigo: string; ctaExacto: string; diasAplica?: number[] }>,
  magnetKeyword: (cta: string) => string | null,
): string[] {
  const errors: string[] = [];
  const norm = (s: string) => s.trim().toLowerCase();

  const assigned = new Map<string, Set<number>>();
  for (const d of dias) {
    if (!d.magnet) continue;
    const code = norm(d.magnet);
    if (!assigned.has(code)) assigned.set(code, new Set());
    assigned.get(code)!.add(d.dia);
  }

  const declaredByDay = new Map<number, string>();
  for (const m of magnets) {
    if (!m.diasAplica) continue; // fase_5 antigua sin días: sin cross-check
    const declared = new Set(m.diasAplica);
    for (const d of declared) declaredByDay.set(d, m.codigo);
    const got = assigned.get(norm(m.codigo)) ?? new Set<number>();
    const faltan = [...declared].filter((d) => !got.has(d)).sort((a, b) => a - b);
    const sobran = [...got].filter((d) => !declared.has(d)).sort((a, b) => a - b);
    if (faltan.length > 0 || sobran.length > 0) {
      const parts: string[] = [];
      if (faltan.length > 0) {
        parts.push(`fase_5 declara ${m.codigo} en los días ${faltan.join(", ")} y el calendario no lo asigna ahí`);
      }
      if (sobran.length > 0) {
        parts.push(`el calendario asigna ${m.codigo} en los días ${sobran.join(", ")} que fase_5 no declara`);
      }
      errors.push(
        `Magnet ${m.codigo}: los días no cuadran con los aprobados en fase_5 — ${parts.join("; ")}. Conjunto declarado: {${[...declared].sort((a, b) => a - b).join(", ")}}.`,
      );
    }
  }

  // Keyword huérfana: CTA con keyword de magnet en un día sin magnet.
  const keywords = magnets
    .map((m) => ({ codigo: m.codigo, kw: magnetKeyword(m.ctaExacto) }))
    .filter((x): x is { codigo: string; kw: string } => !!x.kw);
  for (const d of dias) {
    if (d.magnet) continue;
    for (const { codigo, kw } of keywords) {
      if (norm(d.cta).includes(norm(kw))) {
        errors.push(
          `Día ${d.dia}: el CTA usa la keyword «${kw}» de ${codigo} pero la columna Magnet está vacía — asigna el magnet o cambia el CTA.`,
        );
        break;
      }
    }
  }
  return errors;
}
