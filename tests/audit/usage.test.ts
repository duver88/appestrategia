import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Modelo simulado que devuelve texto + usage real (sin red).
vi.mock("@/lib/llm", async () => {
  const { MockLanguageModelV3 } = await import("ai/test");
  const { simulateReadableStream } = await import("ai");
  const usage = {
    inputTokens: {
      total: 120,
      noCache: 120,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: { total: 45, text: 45, reasoning: undefined },
  };
  const chunks: import("@ai-sdk/provider").LanguageModelV3StreamPart[] = [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "Perfecto, empecemos por tu negocio." },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
  ];
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({ chunks }),
    }),
  });
  return {
    getModel: async () => model,
    getDefaultModelSpec: async () => "anthropic:claude-sonnet-4-5",
    DEFAULT_MODEL: "anthropic:claude-sonnet-4-5",
    invalidateCredentialCache: () => {},
  };
});

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createClientWithUser, createProject, sessionOf, jsonRequest } from "./helpers";
import { POST as postChat } from "@/app/api/chat/route";

const mockAuth = auth as unknown as Mock;

let project: { id: string };
let clientId: string;

beforeAll(async () => {
  const a = await createClientWithUser("Cliente Consumo");
  clientId = a.client.id;
  mockAuth.mockResolvedValue(sessionOf(a.user));
  project = await createProject(clientId, {
    modelProvider: "anthropic:claude-sonnet-4-5",
  });
});

describe("registro de consumo", () => {
  it("una llamada al chat crea UsageLog con tokens y costo > 0", async () => {
    const res = await postChat(
      jsonRequest("/api/chat", "POST", {
        projectId: project.id,
        message: "Hola, empecemos",
      }),
    );
    expect(res.status).toBe(200);
    await res.text(); // consumir el stream completo → dispara onFinish

    // onFinish es asíncrono: esperar el registro hasta 5s.
    let log = null;
    for (let i = 0; i < 50 && !log; i++) {
      log = await prisma.usageLog.findFirst({
        where: { projectId: project.id },
      });
      if (!log) await new Promise((r) => setTimeout(r, 100));
    }
    expect(log).not.toBeNull();
    expect(log!.inputTokens).toBe(120);
    expect(log!.outputTokens).toBe(45);
    expect(log!.costUsd).toBeGreaterThan(0);
    expect(log!.clientId).toBe(clientId);
    expect(log!.provider).toBe("anthropic");
  });
});
