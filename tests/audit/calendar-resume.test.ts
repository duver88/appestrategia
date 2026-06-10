import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import {
  generateCalendarInWeeks,
  type GenerateCalendarOptions,
} from "@/lib/calendar/generate";
import { FASE6_WEEK_RANGES, fase6Schema } from "@/lib/schemas";
import { createClientWithUser, createProject } from "./helpers";
import type { LanguageModel } from "ai";

const WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const USOS = ["ATRACCION", "NUTRICION", "CONVERSION"] as const;
const FOMO = { descripcion: "Quedan 5 cupos", tipo: "Cupos", confirmedByClient: true };

function mkDays(weekIndex: number) {
  const [from, to] = FASE6_WEEK_RANGES[weekIndex];
  return Array.from({ length: to - from + 1 }, (_, k) => {
    const dia = from + k;
    return {
      dia,
      diaSemana: WEEK[(dia - 1) % 7],
      angulo: `Ángulo ${1 + ((dia - 1) % 12)}`,
      uso: USOS[(dia - 1) % 3],
      formato: `Formato ${1 + ((dia - 1) % 11)}`,
      hook: `Hook ${dia}`,
      ideaCentral: `Idea ${dia}`,
      magnet: null,
      cta: "Comenta «GUÍA»",
    };
  });
}

describe("reanudación del calendario por semanas", () => {
  it("con 2 semanas persistidas y un corte simulado, reintentar continúa desde la semana 3", async () => {
    const a = await createClientWithUser(`Resume ${Date.now()}`);
    const project = await createProject(a.client.id, { currentPhase: "fase_6" });

    // Corte simulado: el intento anterior dejó las semanas 1-2 persistidas.
    const week1 = mkDays(0);
    const week2 = mkDays(1);
    await prisma.section.create({
      data: {
        projectId: project.id,
        phaseId: "fase_6",
        status: "PARTIAL",
        data: JSON.stringify({
          __partial: true,
          fomo: FOMO,
          weeks: [week1, week2, null, null],
        }),
      },
    });

    const generatedWeeks: number[] = [];
    const opts: GenerateCalendarOptions = {
      projectId: project.id,
      clientId: a.client.id,
      model: null as unknown as LanguageModel,
      modelSpec: "test:fake",
      contexto: "Contexto de prueba",
      fomo: FOMO,
      onProgress: () => {},
      generateWeekFn: async ({ weekIndex }) => {
        generatedWeeks.push(weekIndex);
        return { dias: mkDays(weekIndex) };
      },
    };
    const res = await generateCalendarInWeeks(opts);

    expect(res.ok).toBe(true);
    // Solo se generaron las semanas 3 y 4 — las persistidas se reutilizaron.
    expect(generatedWeeks).toEqual([2, 3]);

    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    expect(section?.status).toBe("DRAFT");
    const data = fase6Schema.parse(JSON.parse(section!.data));
    expect(data.dias).toHaveLength(31);
    // Los días 1-14 son EXACTAMENTE los persistidos antes del corte.
    expect(data.dias.slice(0, 7)).toEqual(week1);
    expect(data.dias.slice(7, 14)).toEqual(week2);
  });
});
