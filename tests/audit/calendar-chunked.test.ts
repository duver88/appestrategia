import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  generateCalendarInWeeks,
  type GenerateCalendarOptions,
} from "@/lib/calendar/generate";
import { FASE6_WEEK_RANGES, fase6Schema } from "@/lib/schemas";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { createClientWithUser, createProject } from "./helpers";
import type { LanguageModel } from "ai";

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const USOS = ["ATRACCION", "NUTRICION", "CONVERSION"] as const;
const FOMO = { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true };

type Dia = {
  dia: number;
  diaSemana: string;
  angulo: string;
  uso: (typeof USOS)[number];
  formato: string;
  hook: string;
  ideaCentral: string;
  magnet: string | null;
  cta: string;
};

/** Semana válida con el patrón global correcto (12 ángulos, 11 formatos). */
function mkDays(
  weekIndex: number,
  overrides?: { angulo?: (dia: number) => string; formato?: (dia: number) => string },
): Dia[] {
  const [from, to] = FASE6_WEEK_RANGES[weekIndex];
  return Array.from({ length: to - from + 1 }, (_, k) => {
    const dia = from + k;
    return {
      dia,
      diaSemana: WEEK[(dia - 1) % 7],
      angulo: overrides?.angulo?.(dia) ?? `Ángulo ${1 + ((dia - 1) % 12)}`,
      uso: USOS[(dia - 1) % 3],
      formato: overrides?.formato?.(dia) ?? `Formato ${1 + ((dia - 1) % 11)}`,
      hook: `Hook ${dia}`,
      ideaCentral: `Idea ${dia}`,
      magnet: null,
      cta: "Comenta «GUÍA»",
    };
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
    expect(validateCalendar(data)).toHaveLength(0);
  });

  it("una semana inválida se regenera sola sin regenerar las demás", async () => {
    const calls: number[] = [0, 0, 0, 0];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        calls[weekIndex]++;
        // Semana 2: el primer intento viola la regla local (3 ángulos seguidos).
        if (weekIndex === 1 && calls[1] === 1) {
          return { dias: mkDays(1, { angulo: () => "Ángulo Clavado" }) };
        }
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(true);
    expect(calls).toEqual([1, 2, 1, 1]); // solo la semana 2 se regeneró
  });

  it("la validación global regenera solo la semana culpable", async () => {
    const calls: number[] = [0, 0, 0, 0];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        calls[weekIndex]++;
        // Semana 4, intento 1: localmente válida, pero empuja "Formato 1"
        // a 4 usos en el MES (la regla global la atrapa al ensamblar).
        if (weekIndex === 3 && calls[3] === 1) {
          return {
            dias: mkDays(3, {
              formato: (dia) => (dia <= 23 ? "Formato 1" : `Formato ${1 + ((dia - 1) % 11)}`),
            }),
          };
        }
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(true);
    expect(calls).toEqual([1, 1, 1, 2]); // solo la semana 4 se regeneró
  });

  it("tras 2 reintentos fallidos devuelve error controlado", async () => {
    const calls: number[] = [0, 0, 0, 0];
    const res = await generateCalendarInWeeks(
      makeOpts(projectId, clientId, async ({ weekIndex }) => {
        calls[weekIndex]++;
        // La semana 1 SIEMPRE viola la regla local: jamás converge.
        if (weekIndex === 0) {
          return { dias: mkDays(0, { angulo: () => "Ángulo Clavado" }) };
        }
        return { dias: mkDays(weekIndex) };
      }),
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
    expect(calls[0]).toBe(3); // 1 generación + 2 reintentos, NUNCA bucle infinito
    expect(calls.slice(1)).toEqual([0, 0, 0]);

    // Sin borrador aprobable: el avance queda como PARTIAL (o inexistente).
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
    });
    expect(section?.status ?? "PARTIAL").not.toBe("DRAFT");
  });
});
