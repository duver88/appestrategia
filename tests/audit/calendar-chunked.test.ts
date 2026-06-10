import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  generateCalendarInWeeks,
  type GenerateCalendarOptions,
} from "@/lib/calendar/generate";
import { FASE6_WEEK_RANGES, fase6Schema } from "@/lib/schemas";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { createClientWithUser, createProject, canonicalDay, CTAS_TEST } from "./helpers";
import type { LanguageModel } from "ai";

// FIXTURES ACTUALIZADAS AL CATÁLOGO CANÓNICO (ajuste de calidad A2):
// los días siguen el orden exacto del master; las aserciones originales
// (regeneración selectiva, tope de reintentos, error controlado) se
// mantienen intactas.

const FOMO = { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true };

type Dia = ReturnType<typeof canonicalDay>;

function mkDays(weekIndex: number, override?: (d: Dia) => Dia): Dia[] {
  const [from, to] = FASE6_WEEK_RANGES[weekIndex];
  return Array.from({ length: to - from + 1 }, (_, k) => {
    const d = canonicalDay(from + k);
    return override ? override(d) : d;
  });
}

function makeOpts(
  projectId: string,
  clientId: string,
  genFn: GenerateCalendarOptions["generateWeekFn"],
): GenerateCalendarOptions {
  return {
    projectId,
    clientId,
    model: null as unknown as LanguageModel, // no se usa con generateWeekFn
    modelSpec: "test:fake",
    contexto: "Contexto de prueba",
    fomo: FOMO,
    ctas: CTAS_TEST,
    personaVisible: "COMPLETA",
    onProgress: () => {},
    generateWeekFn: genFn,
  };
}

let projectId: string;
let clientId: string;

beforeEach(async () => {
  const a = await createClientWithUser(`Chunked ${Date.now()}`);
  clientId = a.client.id;
  projectId = (await createProject(clientId, { currentPhase: "fase_6" })).id;
});

describe("generación del calendario por semanas", () => {
  it("el ensamblado de 4 semanas produce un calendario que pasa la validación global", async () => {
    const calls: number[] = [0, 0, 0, 0];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        calls[weekIndex]++;
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(true);
    expect(calls).toEqual([1, 1, 1, 1]);

    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
    });
    expect(section?.status).toBe("DRAFT");
    const data = fase6Schema.parse(JSON.parse(section!.data));
    expect(data.dias).toHaveLength(31);
    expect(data.etiquetasSemana).toHaveLength(4);
    expect(data.ctas?.primario).toBe(CTAS_TEST.primario);
    expect(validateCalendar(data)).toHaveLength(0);
  });

  it("una semana inválida se regenera sola sin regenerar las demás", async () => {
    const calls: number[] = [0, 0, 0, 0];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        calls[weekIndex]++;
        // Semana 2, intento 1: viola la regla local (mismo ángulo 3 días
        // seguidos y sustituciones por encima del máximo).
        if (weekIndex === 1 && calls[1] === 1) {
          return { dias: mkDays(1, (d) => ({ ...d, angulo: "Errores" as const })) };
        }
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(true);
    expect(calls).toEqual([1, 2, 1, 1]); // solo la semana 2 se regeneró
  });

  it("un parcial heredado que viola reglas globales regenera solo la semana culpable", async () => {
    // Parcial persistido (p. ej. de una versión vieja) donde las semanas
    // 1-2 acumulan "Broll con Texto" 5 veces (las semanas 3-4 canónicas no
    // lo usan): la global lo atrapa al ensamblar y SOLO la semana culpable
    // se regenera.
    const w1 = mkDays(0, (d) =>
      d.dia <= 2 ? { ...d, formato: "Broll con Texto" as const } : d,
    );
    const w2 = mkDays(1, (d) =>
      d.dia <= 9 ? { ...d, formato: "Broll con Texto" as const } : d,
    );
    await prisma.section.create({
      data: {
        projectId,
        phaseId: "fase_6",
        status: "PARTIAL",
        data: JSON.stringify({ __partial: true, fomo: FOMO, weeks: [w1, w2, null, null] }),
      },
    });
    const generated: number[] = [];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        generated.push(weekIndex);
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(true);
    // Genera 3 y 4 (faltantes) y LUEGO solo la semana 2 (culpable global).
    expect(generated).toEqual([2, 3, 1]);
  });

  it("tras 2 reintentos fallidos devuelve error controlado", async () => {
    const calls: number[] = [0, 0, 0, 0];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        calls[weekIndex]++;
        // La semana 1 SIEMPRE viola las reglas: jamás converge.
        if (weekIndex === 0) {
          return { dias: mkDays(0, (d) => ({ ...d, angulo: "Errores" as const })) };
        }
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
    expect(calls[0]).toBe(3); // 1 generación + 2 reintentos, NUNCA bucle infinito
    expect(calls.slice(1)).toEqual([0, 0, 0]);

    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
    });
    expect(section?.status ?? "PARTIAL").not.toBe("DRAFT");
  });
});
