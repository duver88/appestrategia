import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import {
  generateCalendarInWeeks,
  type GenerateCalendarOptions,
} from "@/lib/calendar/generate";
import { FASE6_WEEK_RANGES, fase6Schema, fase6FomoToolSchema } from "@/lib/schemas";
import {
  createClientWithUser,
  createProject,
  canonicalDay,
  validCalendar,
  validCierre,
  CTAS_TEST,
} from "./helpers";
import type { Fase6Data } from "@/lib/schemas";
import type { LanguageModel } from "ai";

describe("B2 — gate ternario del FOMO", () => {
  const base = () => validCalendar() as unknown as Fase6Data;

  it("sin confirmar y sin estado → bloqueado (comportamiento histórico)", () => {
    const cal = base();
    cal.fomo.confirmedByClient = false;
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("no está confirmado"))).toBe(true);
  });

  it("PENDIENTE_BRACKETS con números en brackets → aprobable", () => {
    const cal = base();
    cal.fomo = {
      descripcion: "[X] cupos de implementación | [X]% de descuento",
      tipo: "Cupos + descuento",
      confirmedByClient: false,
      estado: "PENDIENTE_BRACKETS",
    };
    cal.etiquetasSemana![3] =
      "Venta con urgencia real — FOMO: [X] cupos (★ completa los brackets antes de publicar)";
    expect(validateCalendar(cal)).toHaveLength(0);
  });

  it("PENDIENTE_BRACKETS con números concretos sin brackets → rechazo", () => {
    const cal = base();
    cal.fomo = {
      descripcion: "10 cupos de implementación",
      tipo: "Cupos",
      confirmedByClient: false,
      estado: "PENDIENTE_BRACKETS",
    };
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("fuera de brackets"))).toBe(true);
  });

  it("el schema de la tool acepta estado y mantiene el tope de 4 palabras del CTA (A5)", () => {
    const ok = fase6FomoToolSchema.safeParse({
      fomo: {
        descripcion: "[X] cupos",
        tipo: "Cupos",
        confirmedByClient: false,
        estado: "PENDIENTE_BRACKETS",
      },
      ctas: CTAS_TEST,
    });
    expect(ok.success).toBe(true);
    // Anti-ejemplo de Luxor: "Escríbenos y te contamos todo" (5+ palabras).
    const largo = fase6FomoToolSchema.safeParse({
      fomo: { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true },
      ctas: { primario: "Ingresa ya", secundario: "Escríbenos y te contamos todo" },
    });
    expect(largo.success).toBe(false);
    // Estado fuera del enum → rechazo.
    const malEstado = fase6FomoToolSchema.safeParse({
      fomo: {
        descripcion: "x",
        tipo: "Cupos",
        confirmedByClient: false,
        estado: "PENDIENTE",
      },
      ctas: CTAS_TEST,
    });
    expect(malEstado.success).toBe(false);
  });
});

describe("B5 — cierre personalizado como sub-entregable de fase_6", () => {
  it("el pipeline genera el cierre y lo persiste en el DRAFT", async () => {
    const a = await createClientWithUser(`Cierre ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });
    let cierrePromptVisto = "";
    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto del negocio",
      fomo: { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true },
      ctas: CTAS_TEST,
      personaVisible: "COMPLETA",
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex }) => {
        const [from, to] = FASE6_WEEK_RANGES[weekIndex];
        return {
          dias: Array.from({ length: to - from + 1 }, (_, k) => canonicalDay(from + k)),
        };
      },
      generateCierreFn: async ({ prompt }) => {
        cierrePromptVisto = prompt;
        return validCierre();
      },
    };
    const res = await generateCalendarInWeeks(opts);
    expect(res.ok).toBe(true);
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    const data = fase6Schema.parse(JSON.parse(section!.data));
    expect(data.cierre?.citaFinal).toContain("El mercado no necesita");
    // El prompt del cierre exige el patrón de la cita y prohíbe inventar.
    expect(cierrePromptVisto).toContain("El mercado no necesita");
    expect(cierrePromptVisto).toContain("diferenciadores");
  });

  it("si el cierre no puede generarse, el calendario NO queda como DRAFT", async () => {
    const a = await createClientWithUser(`CierreFail ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });
    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto",
      fomo: { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true },
      ctas: CTAS_TEST,
      personaVisible: "COMPLETA",
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex }) => {
        const [from, to] = FASE6_WEEK_RANGES[weekIndex];
        return {
          dias: Array.from({ length: to - from + 1 }, (_, k) => canonicalDay(from + k)),
        };
      },
      generateCierreFn: async () => {
        throw new Error("proveedor caído");
      },
    };
    const res = await generateCalendarInWeeks(opts);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors[0]).toContain("cierre");
    }
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    expect(section?.status).not.toBe("DRAFT"); // el parcial queda para reanudar
  });

  it("calendarios viejos sin cierre siguen siendo válidos; cierre con cita vacía no", () => {
    const cal = validCalendar() as unknown as Fase6Data;
    expect(validateCalendar(cal)).toHaveLength(0); // sin cierre → válido
    cal.cierre = { ...validCierre(), citaFinal: "                    " };
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("cita final"))).toBe(true);
  });
});
