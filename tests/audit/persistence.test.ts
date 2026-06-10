import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Proveedor mockeado que LANZA ERROR: simula caída del LLM.
vi.mock("@/lib/llm", () => ({
  getModel: vi.fn(async () => {
    throw new Error("proveedor caído (mock de auditoría)");
  }),
  getDefaultModelSpec: async () => "anthropic:claude-sonnet-4-5",
  DEFAULT_MODEL: "anthropic:claude-sonnet-4-5",
  invalidateCredentialCache: () => {},
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createClientWithUser, createProject, sessionOf, jsonRequest } from "./helpers";
import { POST as postChat } from "@/app/api/chat/route";

const mockAuth = auth as unknown as Mock;

let project: { id: string };

beforeAll(async () => {
  const a = await createClientWithUser("Cliente Persistencia");
  mockAuth.mockResolvedValue(sessionOf(a.user));
  project = await createProject(a.client.id);
});

describe("persistencia primero", () => {
  it("mensaje queda en DB aunque el LLM falle", async () => {
    const content = "Este mensaje no debe perderse jamás";
    await expect(
      postChat(
        jsonRequest("/api/chat", "POST", {
          projectId: project.id,
          message: content,
        }),
      ),
    ).rejects.toThrow();

    // El mensaje del usuario se persistió ANTES de llamar al proveedor.
    const saved = await prisma.message.findFirst({
      where: { projectId: project.id, role: "user", content },
    });
    expect(saved).not.toBeNull();
  });
});
