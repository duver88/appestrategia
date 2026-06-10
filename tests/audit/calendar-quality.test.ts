import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import {
  generateCalendarInWeeks,
  type GenerateCalendarOptions,
} from "@/lib/calendar/generate";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { FASE6_WEEK_RANGES, fase6Schema } from "@/lib/schemas";
import {
  createClientWithUser,
  createProject,
  canonicalDay,
  validCalendar,
  CTAS_TEST,
} from "./helpers";
import type { Fase6Data } from "@/lib/schemas";
import type { LanguageModel } from "ai";

const FOMO = { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true };
const base = () => validCalendar() as unknown as Fase6Data;

describe("calidad del calendario (ajuste A2/A1)", () => {
  it("las tildes se preservan de la generación al documento final", async () => {
    const a = await createClientWithUser(`Tildes ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });
    const ACENTOS = "¿Cuántos teléfonos sonarán el miércoles? ¡Atención, dueño!";

    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto",
      fomo: FOMO,
      ctas: CTAS_TEST,
      personaVisible: "COMPLETA",
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex }) => {
        const [from, to] = FASE6_WEEK_RANGES[weekIndex];
        return {
          dias: Array.from({ length: to - from + 1 }, (_, k) => ({
            ...canonicalDay(from + k),
            ideaCentral: ACENTOS,
          })),
        };
      },
    };
    const res = await generateCalendarInWeeks(opts);
    expect(res.ok).toBe(true);

    // 1) El JSON persistido conserva los caracteres acentuados…
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    expect(section!.data).toContain("¿Cuántos teléfonos sonarán el miércoles?");
    // 2) …y el HTML del PDF también (á é í ó ú ñ ¿ ¡).
    const { renderModo1Html } = await import("@/lib/pdf/template");
    const { pdfSections } = await import("./helpers");
    const data = {
      clientName: "Cliente Ñandú",
      business: "Negocio",
      brandColor: "#1F3A5F",
      ...pdfSections(),
      fase_6: fase6Schema.parse(JSON.parse(section!.data)),
    } as never;
    const html = renderModo1Html(data);
    for (const ch of ["á", "é", "í", "ó", "ú", "ñ", "¿", "¡"]) {
      expect(html, `falta el carácter ${ch}`).toContain(ch);
    }
  });

  it("ángulo fuera del catálogo → rechazo", () => {
    const cal = base();
    (cal.dias[2] as { angulo: string }).angulo = "Perdida de leads por demora";
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("fuera del catálogo canónico de 18"))).toBe(true);
  });

  it("formato fuera del catálogo → rechazo", () => {
    const cal = base();
    (cal.dias[2] as { formato: string }).formato = "Video testimonial corto";
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("fuera del catálogo canónico de 19"))).toBe(true);
  });

  it("semana 1 sin conversión → rechazo", () => {
    const cal = base();
    for (const d of cal.dias.filter((x) => x.dia <= 7)) {
      if (d.uso === "CONVERSION") d.uso = "NUTRICION";
    }
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("semana 1") && e.includes("CONVERSIÓN"))).toBe(true);
  });

  it("CTA no canónico en conversión → rechazo", () => {
    const cal = base();
    const conv = cal.dias.find((d) => d.uso === "CONVERSION" && !d.magnet)!;
    conv.cta = "Compra ahora mismo aquí abajo";
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("CTA debe ser exactamente"))).toBe(true);
  });

  it("formato con cara en proyecto sin persona visible → rechazo", () => {
    const cal = base(); // contiene Talking Head, Selfie, etc.
    const errors = validateCalendar(cal, { personaVisible: "NINGUNA" });
    expect(
      errors.some((e) => e.includes("requiere mostrar la cara")),
    ).toBe(true);
  });
});
