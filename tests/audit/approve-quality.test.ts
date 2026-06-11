import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createClientWithUser,
  createProject,
  sessionOf,
  jsonRequest,
  pdfSections,
  validCalendar,
} from "./helpers";
import { POST as postApprove } from "@/app/api/sections/approve/route";

const mockAuth = auth as unknown as Mock;

let projectId: string;

async function seedProject() {
  const a = await createClientWithUser(`Aprobación calidad ${Date.now()}`);
  mockAuth.mockResolvedValue(sessionOf(a.user));
  const project = await createProject(a.client.id, { currentPhase: "fase_6" });
  projectId = project.id;
  // Secciones previas aprobadas (las del fixture canónico del PDF + fase_0).
  const { FASE0_DATA } = await import("./helpers");
  const sections: Record<string, unknown> = { fase_0: FASE0_DATA, ...pdfSections() };
  delete sections.fase_6;
  for (const [phaseId, data] of Object.entries(sections)) {
    await prisma.section.create({
      data: {
        projectId,
        phaseId,
        data: JSON.stringify(data),
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
  }
}

async function draftFase6(data: unknown) {
  await prisma.section.upsert({
    where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
    create: { projectId, phaseId: "fase_6", data: JSON.stringify(data), status: "DRAFT" },
    update: { data: JSON.stringify(data), status: "DRAFT" },
  });
}

const approve = () =>
  postApprove(
    jsonRequest("/api/sections/approve", "POST", { projectId, phaseId: "fase_6" }),
  );

beforeAll(seedProject);

describe("A1/A2 — gate de aprobación del calendario (integración)", () => {
  it("métrica inventada sin respaldo del bank → 422 con día, cifra y vía de brackets", async () => {
    const cal = validCalendar();
    // El bank del fixture NO confirma "40" en ninguna métrica.
    cal.dias[25].hook = "Un consultorio perdía el 40% de sus leads. Ya no.";
    await draftFase6(cal);
    const res = await approve();
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Día 26");
    expect(body.error).toContain('"40%"');
    expect(body.error).toContain("brackets");
    // El borrador NO se aprobó.
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId, phaseId: "fase_6" } },
    });
    expect(section?.status).toBe("DRAFT");
  });

  it("la misma cifra en brackets con nota → aprobado (y avanza a REVIEW)", async () => {
    const cal = validCalendar();
    cal.dias[25].hook = "Un consultorio perdía el [X]% de sus leads. Ya no.";
    cal.dias[25].ideaCentral = "Placeholder hasta documentar con números reales.";
    await draftFase6(cal);
    const res = await approve();
    expect(res.status).toBe(200);
  });

  it("magnet movido respecto a fase_5 → 422 con diff legible", async () => {
    // Reabrir el proyecto en fase_6 para un segundo intento.
    await prisma.project.update({
      where: { id: projectId },
      data: { currentPhase: "fase_6", status: "IN_PROGRESS" },
    });
    const cal = validCalendar();
    const d2 = cal.dias.find((d) => d.dia === 2)!;
    d2.magnet = null;
    d2.cta = "Guarda esta idea";
    await draftFase6(cal);
    const res = await approve();
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("OM1");
    expect(body.error).toContain("fase_5");
  });
});
