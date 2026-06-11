import { describe, it, expect } from "vitest";
import { validateMagnets } from "@/lib/schemas/magnet-validators";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { generateCalendarInWeeks, type GenerateCalendarOptions } from "@/lib/calendar/generate";
import { FASE6_WEEK_RANGES, fase6Schema } from "@/lib/schemas";
import { prisma } from "@/lib/db";
import {
  createClientWithUser,
  createProject,
  canonicalDay,
  validCalendar,
  validCierre,
  pdfSections,
  CTAS_TEST,
  MAGNET_PLAN,
} from "./helpers";
import type { Fase5Data, Fase6Data } from "@/lib/schemas";
import type { LanguageModel } from "ai";

const fase5 = () => pdfSections().fase_5 as Fase5Data;
const magnetsCtx = () =>
  fase5().magnets.map((m) => ({
    codigo: m.codigo,
    ctaExacto: m.ctaExacto,
    diasAplica: m.diasAplica,
  }));

describe("A2 — validación de fase_5 (distribución de magnets)", () => {
  it("el fixture canónico pasa", () => {
    expect(validateMagnets(fase5())).toHaveLength(0);
  });

  it("días solapados entre magnets → rechazo (caso Hernesto)", () => {
    const data = fase5();
    data.magnets[1].diasAplica = [...data.magnets[0].diasAplica]; // OM2 pisa a OM1
    const errors = validateMagnets(data);
    expect(errors.some((e) => e.includes("disjuntos"))).toBe(true);
  });

  it("magnet con un solo día → rechazo", () => {
    const data = fase5();
    data.magnets[0].diasAplica = [1];
    const errors = validateMagnets(data);
    expect(errors.some((e) => e.includes("al menos 2"))).toBe(true);
  });

  it("OM concentrando más del 30% de los días con magnet → rechazo (anti-patrón OM5 de Luxor)", () => {
    const data = fase5();
    data.magnets[4].diasAplica = [12, 13, 14, 15, 16, 17, 18, 19, 20]; // 9 de 17
    const errors = validateMagnets(data);
    expect(errors.some((e) => e.includes("OM5") && e.includes("30%"))).toBe(true);
  });
});

describe("A2 — cruce magnets↔calendario al validar fase_6", () => {
  const base = () => validCalendar() as unknown as Fase6Data;

  it("el fixture canónico cuadra día por día", () => {
    expect(validateCalendar(base(), { magnets: magnetsCtx() })).toHaveLength(0);
  });

  it("mismatch de días → rechazo con diff legible", () => {
    const cal = base();
    // OM1 declara los días 1 y 2; lo movemos del día 2 al 4.
    const d2 = cal.dias.find((d) => d.dia === 2)!;
    d2.magnet = null;
    d2.cta = "Guarda esta idea";
    const d4 = cal.dias.find((d) => d.dia === 4)!;
    d4.magnet = "OM1";
    d4.cta = "Comenta «CLAVE1» y te lo envío";
    const errors = validateCalendar(cal, { magnets: magnetsCtx() });
    expect(
      errors.some(
        (e) => e.includes("OM1") && e.includes("días 2") && e.includes("días 4"),
      ),
    ).toBe(true);
  });

  it("keyword huérfana (CTA con keyword y columna Magnet vacía) → rechazo", () => {
    const cal = base();
    const d15 = cal.dias.find((d) => d.dia === 15)!; // día sin magnet declarado
    d15.cta = "Comenta «CLAVE1» y te envío la lista";
    const errors = validateCalendar(cal, { magnets: magnetsCtx() });
    expect(
      errors.some((e) => e.includes("Día 15") && e.includes("CLAVE1") && e.includes("vacía")),
    ).toBe(true);
  });

  it("fase_5 antigua sin diasAplica en el ctx → sin cross-check (retrocompatible)", () => {
    const cal = base();
    const legacy = magnetsCtx().map(({ codigo, ctaExacto }) => ({ codigo, ctaExacto }));
    expect(validateCalendar(cal, { magnets: legacy })).toHaveLength(0);
  });
});

describe("A2 — el pipeline recibe el plan de magnets y converge", () => {
  it("genera asignando EXACTAMENTE los diasAplica declarados (y el prompt los fija)", async () => {
    const a = await createClientWithUser(`Magnets ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });
    const byDay = new Map(
      MAGNET_PLAN.flatMap((m) => m.dias.map((d) => [d, m] as const)),
    );
    const prompts: string[] = [];
    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto",
      fomo: { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true },
      ctas: CTAS_TEST,
      personaVisible: "COMPLETA",
      magnets: magnetsCtx(),
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex, prompt }) => {
        prompts.push(prompt);
        const [from, to] = FASE6_WEEK_RANGES[weekIndex];
        return {
          dias: Array.from({ length: to - from + 1 }, (_, k) => {
            const dia = from + k;
            const base = canonicalDay(dia);
            const m = byDay.get(dia);
            return m
              ? { ...base, magnet: m.codigo, cta: `Comenta «${m.keyword}» y te lo envío` }
              : base;
          }),
        };
      },
      generateCierreFn: async () => validCierre(),
    };
    const res = await generateCalendarInWeeks(opts);
    expect(res.ok).toBe(true);
    // El prompt de la semana 1 fija el plan por día (días 1-7: OM1/OM2/OM3).
    expect(prompts[0]).toContain("Magnet: OM1");
    expect(prompts[0]).toContain("SIN magnet");
    // Y el calendario persistido cuadra con fase_5.
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    const data = fase6Schema.parse(JSON.parse(section!.data));
    for (const m of MAGNET_PLAN) {
      const asignados = data.dias.filter((d) => d.magnet === m.codigo).map((d) => d.dia);
      expect(asignados.sort((x, y) => x - y)).toEqual(m.dias);
    }
  });

  it("una semana que ignora el plan de magnets se rechaza y reintenta", async () => {
    const a = await createClientWithUser(`MagnetsBad ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });
    const byDay = new Map(
      MAGNET_PLAN.flatMap((m) => m.dias.map((d) => [d, m] as const)),
    );
    let intentosSemana1 = 0;
    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto",
      fomo: { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true },
      ctas: CTAS_TEST,
      personaVisible: "COMPLETA",
      magnets: magnetsCtx(),
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex }) => {
        const [from, to] = FASE6_WEEK_RANGES[weekIndex];
        const ignorarPlan = weekIndex === 0 && ++intentosSemana1 === 1;
        return {
          dias: Array.from({ length: to - from + 1 }, (_, k) => {
            const dia = from + k;
            const base = canonicalDay(dia);
            if (ignorarPlan) return base; // primer intento: sin magnets
            const m = byDay.get(dia);
            return m
              ? { ...base, magnet: m.codigo, cta: `Comenta «${m.keyword}» y te lo envío` }
              : base;
          }),
        };
      },
      generateCierreFn: async () => validCierre(),
    };
    const res = await generateCalendarInWeeks(opts);
    expect(res.ok).toBe(true);
    expect(intentosSemana1).toBe(2); // el servidor rechazó el intento sin plan
  });
});
