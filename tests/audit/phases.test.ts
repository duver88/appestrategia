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
  FASE0_DATA,
  FASE05_DATA,
} from "./helpers";
import { POST as postApprove } from "@/app/api/sections/approve/route";

const mockAuth = auth as unknown as Mock;

let project: { id: string };

async function draft(phaseId: string, data: unknown) {
  await prisma.section.upsert({
    where: { projectId_phaseId: { projectId: project.id, phaseId } },
    create: {
      projectId: project.id,
      phaseId,
      data: JSON.stringify(data),
      status: "DRAFT",
    },
    update: { data: JSON.stringify(data), status: "DRAFT" },
  });
}

const approve = (phaseId: string) =>
  postApprove(
    jsonRequest("/api/sections/approve", "POST", {
      projectId: project.id,
      phaseId,
    }),
  );

beforeAll(async () => {
  const a = await createClientWithUser("Cliente Fases");
  mockAuth.mockResolvedValue(sessionOf(a.user));
  project = await createProject(a.client.id, { currentPhase: "fase_0" });
});

describe("motor de fases (orden estricto)", () => {
  it("no aprueba fase N+1 sin N", async () => {
    await draft("fase_0_5", FASE05_DATA);
    const res = await approve("fase_0_5");
    expect(res.status).toBe(409);
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_0_5" } },
    });
    expect(section?.status).toBe("DRAFT"); // no se aprobó
  });

  it("aprobar avanza currentPhase", async () => {
    await draft("fase_0", FASE0_DATA);
    const res = await approve("fase_0");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { nextPhaseId: string };
    expect(body.nextPhaseId).toBe("fase_0_5");
    const updated = await prisma.project.findUnique({ where: { id: project.id } });
    expect(updated?.currentPhase).toBe("fase_0_5");
  });

  it("editar fase aprobada marca posteriores como revisar", async () => {
    // Aprobar fase_0_5 (ahora sí toca) para tener una fase posterior.
    const res05 = await approve("fase_0_5");
    expect(res05.status).toBe(200);

    // El cliente edita fase_0 (ya aprobada): vuelve a DRAFT y se re-aprueba.
    await draft("fase_0", { ...FASE0_DATA, precio: "1497 USD" });
    const res = await approve("fase_0");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { retroactive: boolean };
    expect(body.retroactive).toBe(true);

    // La fase posterior queda marcada "revisar" (no se borra)…
    const later = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_0_5" } },
    });
    expect(later?.needsReview).toBe(true);
    expect(later?.status).toBe("APPROVED");
    // …y el proyecto NO retrocede de fase.
    const updated = await prisma.project.findUnique({ where: { id: project.id } });
    expect(updated?.currentPhase).toBe("fase_1_0");
  });
});
