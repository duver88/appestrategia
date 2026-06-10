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

describe("adición 1 — listas canónicas y filtrado", () => {
  it("formato/ángulo fuera del enum → rechazo del schema", async () => {
    const { fase6DiaSchema, fase6WeekSchema } = await import("@/lib/schemas");
    const dia = canonicalDay(1);
    expect(
      fase6DiaSchema.safeParse({ ...dia, angulo: "Perdida de leads" }).success,
    ).toBe(false);
    expect(
      fase6DiaSchema.safeParse({ ...dia, formato: "Video testimonial corto" }).success,
    ).toBe(false);
    // NINGUNA reduce el ENUM del schema de semana a los 8 sin cara.
    const semanaNinguna = fase6WeekSchema(0, "NINGUNA");
    const conCara = Array.from({ length: 7 }, (_, k) => ({
      ...canonicalDay(k + 1),
      formato: "Talking Head",
    }));
    expect(semanaNinguna.safeParse({ dias: conCara }).success).toBe(false);
  });

  it("proyecto NINGUNA genera solo formatos SIN CARA", async () => {
    const { FORMATOS_SIN_CARA, esConCara } = await import("@/lib/calendar/catalogs");
    const a = await createClientWithUser(`SinCara ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });
    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto",
      fomo: FOMO,
      ctas: CTAS_TEST,
      personaVisible: "NINGUNA",
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex }) => {
        const [from, to] = FASE6_WEEK_RANGES[weekIndex];
        return {
          dias: Array.from({ length: to - from + 1 }, (_, k) => {
            const dia = from + k;
            return {
              ...canonicalDay(dia),
              formato: FORMATOS_SIN_CARA[(dia - 1) % FORMATOS_SIN_CARA.length],
            };
          }),
        };
      },
    };
    const res = await generateCalendarInWeeks(opts);
    expect(res.ok).toBe(true);
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    const data = fase6Schema.parse(JSON.parse(section!.data));
    expect(data.dias.every((d) => !esConCara(d.formato))).toBe(true);
    // Y el ensamblado pasó la validación global con el contexto NINGUNA
    // (tope mensual relajado a 4 por la infeasibilidad 8×3=24<31).
    expect(validateCalendar(data, { personaVisible: "NINGUNA" })).toHaveLength(0);
  });

  it("proyecto PARCIAL respeta el tope 2/semana–8/mes de formatos con cara", () => {
    const cal = base();
    // Forzar 3 días CON CARA en la semana 1 (sin romper otros topes).
    cal.dias[0].formato = "Talking Head";
    cal.dias[1].formato = "Selfie";
    cal.dias[2].formato = "Vlog";
    const errors = validateCalendar(cal, { personaVisible: "PARCIAL" });
    expect(
      errors.some((e) => e.includes("CON CARA") && e.includes("semana")),
    ).toBe(true);
    // Y un mes con más de 8 días con cara también se rechaza.
    const mesErrors = validateCalendar(base(), { personaVisible: "PARCIAL" });
    // base() canónico cicla los 19 formatos → tiene >8 con cara en el mes.
    expect(mesErrors.some((e) => e.includes("máximo 8"))).toBe(true);
  });
});
