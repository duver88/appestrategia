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
import { setSetting } from "@/lib/settings";
import {
  createClientWithUser,
  createProject,
  sessionOf,
  jsonRequest,
  params,
  FASE0_DATA,
} from "./helpers";

import { POST as postChat } from "@/app/api/chat/route";
import { POST as postApprove } from "@/app/api/sections/approve/route";
import { GET as getPdf } from "@/app/api/pdf/[projectId]/route";

const mockAuth = auth as unknown as Mock;

let session: ReturnType<typeof sessionOf>;
let clientId: string;
let project: { id: string };

async function expectExpired(res: Response) {
  expect(res.status).toBe(403);
  const body = (await res.json()) as { code?: string };
  expect(body.code).toBe("MEMBERSHIP_EXPIRED");
}

beforeAll(async () => {
  await setSetting("membership_enforcement", true);
  const a = await createClientWithUser("Cliente Vencido");
  clientId = a.client.id;
  session = sessionOf(a.user);
  project = await createProject(clientId);
  await prisma.section.create({
    data: {
      projectId: project.id,
      phaseId: "fase_0",
      data: JSON.stringify(FASE0_DATA),
      status: "DRAFT",
    },
  });
  // Vencer la membresía.
  await prisma.client.update({
    where: { id: clientId },
    data: { membershipExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  mockAuth.mockResolvedValue(session);
});

describe("gate de membresía", () => {
  it("cliente vencido recibe MEMBERSHIP_EXPIRED en chat", async () => {
    const res = await postChat(
      jsonRequest("/api/chat", "POST", { projectId: project.id, message: "hola" }),
    );
    await expectExpired(res);
  });

  it("cliente vencido recibe MEMBERSHIP_EXPIRED en secciones", async () => {
    const res = await postApprove(
      jsonRequest("/api/sections/approve", "POST", {
        projectId: project.id,
        phaseId: "fase_0",
      }),
    );
    await expectExpired(res);
  });

  it("cliente vencido recibe MEMBERSHIP_EXPIRED en PDF", async () => {
    const res = await getPdf(
      jsonRequest(`/api/pdf/${project.id}`, "GET"),
      params({ projectId: project.id }),
    );
    await expectExpired(res);
  });

  it("al extender fecha recupera acceso y datos", async () => {
    await prisma.client.update({
      where: { id: clientId },
      data: { membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });
    // Recupera acceso: la misma operación bloqueada ahora funciona…
    const res = await postApprove(
      jsonRequest("/api/sections/approve", "POST", {
        projectId: project.id,
        phaseId: "fase_0",
      }),
    );
    expect(res.status).toBe(200);
    // …y sus datos siguen intactos (la sección sobrevivió al bloqueo).
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_0" } },
    });
    expect(section?.status).toBe("APPROVED");
    expect(JSON.parse(section!.data).queVende).toBe(FASE0_DATA.queVende);
  });
});
