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
  params,
  FASE0_DATA,
} from "./helpers";

import { GET as getProject } from "@/app/api/projects/[id]/route";
import { GET as getSections } from "@/app/api/sections/route";
import { POST as postChat } from "@/app/api/chat/route";
import { GET as getPdf } from "@/app/api/pdf/[projectId]/route";

const mockAuth = auth as unknown as Mock;

let sessionA: ReturnType<typeof sessionOf>;
let projectB: { id: string };

beforeAll(async () => {
  const a = await createClientWithUser("Tenant A");
  const b = await createClientWithUser("Tenant B");
  sessionA = sessionOf(a.user);
  projectB = await createProject(b.client.id);
  await prisma.section.create({
    data: {
      projectId: projectB.id,
      phaseId: "fase_0",
      data: JSON.stringify(FASE0_DATA),
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });
  await prisma.message.create({
    data: {
      projectId: projectB.id,
      phaseId: "fase_0",
      role: "assistant",
      content: "Mensaje privado de B",
    },
  });
});

describe("aislamiento multi-tenant", () => {
  it("cliente A no lee proyecto de B", async () => {
    mockAuth.mockResolvedValue(sessionA);
    const res = await getProject(
      jsonRequest(`/api/projects/${projectB.id}`, "GET"),
      params({ id: projectB.id }),
    );
    expect(res.status).toBe(404);
  });

  it("cliente A no lee secciones de B", async () => {
    mockAuth.mockResolvedValue(sessionA);
    const res = await getSections(
      jsonRequest(`/api/sections?projectId=${projectB.id}`, "GET"),
    );
    expect(res.status).toBe(404);
  });

  it("cliente A no lee mensajes de B", async () => {
    // El historial de mensajes solo se sirve a través del chat del proyecto.
    mockAuth.mockResolvedValue(sessionA);
    const res = await postChat(
      jsonRequest("/api/chat", "POST", {
        projectId: projectB.id,
        message: "hola",
      }),
    );
    expect(res.status).toBe(404);
    // Y el intento NO debe haber persistido nada en el proyecto ajeno.
    const leaked = await prisma.message.findMany({
      where: { projectId: projectB.id, role: "user" },
    });
    expect(leaked).toHaveLength(0);
  });

  it("cliente A no descarga PDF de B", async () => {
    mockAuth.mockResolvedValue(sessionA);
    const res = await getPdf(
      jsonRequest(`/api/pdf/${projectB.id}`, "GET"),
      params({ projectId: projectB.id }),
    );
    expect(res.status).toBe(404);
  });
});
