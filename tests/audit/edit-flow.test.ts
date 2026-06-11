import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Mock } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Modelo simulado PROGRAMABLE: cada test fija la secuencia de turnos
// (tool calls / texto) con __setScript — sin red.
vi.mock("@/lib/llm", async () => {
  const { MockLanguageModelV3 } = await import("ai/test");
  const { simulateReadableStream } = await import("ai");
  const usage = {
    inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 40, text: 40, reasoning: undefined },
  };
  let script: unknown[][] = [];
  let call = 0;
  const model = new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: (script[Math.min(call++, script.length - 1)] ?? []) as never,
      }),
    }),
  });
  const textTurn = (texto: string) => [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: texto },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: { unified: "stop", raw: "stop" }, usage },
  ];
  const toolTurn = (toolName: string, input: unknown) => [
    { type: "stream-start", warnings: [] },
    {
      type: "tool-call",
      toolCallId: `call-${Math.random().toString(36).slice(2, 8)}`,
      toolName,
      input: JSON.stringify(input),
    },
    { type: "finish", finishReason: { unified: "tool-calls", raw: "tool-calls" }, usage },
  ];
  return {
    getModel: async () => model,
    getDefaultModelSpec: async () => "anthropic:claude-sonnet-4-5",
    DEFAULT_MODEL: "anthropic:claude-sonnet-4-5",
    invalidateCredentialCache: () => {},
    __setScript: (turns: unknown[][]) => {
      script = turns;
      call = 0;
    },
    __textTurn: textTurn,
    __toolTurn: toolTurn,
  };
});

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createClientWithUser,
  createProject,
  sessionOf,
  jsonRequest,
  pdfSections,
} from "./helpers";
import { POST as postChat } from "@/app/api/chat/route";
import { rejectedToolErrors } from "@/lib/chat-tools";
import type { UIMessage } from "ai";

const mockAuth = auth as unknown as Mock;
type LlmMock = {
  __setScript: (turns: unknown[][]) => void;
  __textTurn: (t: string) => unknown[];
  __toolTurn: (name: string, input: unknown) => unknown[];
};
let llm: LlmMock;

let clientId: string;

beforeAll(async () => {
  const a = await createClientWithUser(`Edición ${Date.now()}`);
  clientId = a.client.id;
  mockAuth.mockResolvedValue(sessionOf(a.user));
  llm = (await import("@/lib/llm")) as unknown as LlmMock;
});

async function projectWithDraft(phaseId: string, draftData: unknown) {
  const project = await createProject(clientId, { currentPhase: phaseId });
  await prisma.section.create({
    data: {
      projectId: project.id,
      phaseId,
      data: JSON.stringify(draftData),
      status: "DRAFT",
    },
  });
  return project;
}

const sectionData = async (projectId: string, phaseId: string) => {
  const s = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId, phaseId } },
  });
  return JSON.parse(s!.data);
};

describe("hotfix flujo de edición — regresión", () => {
  it("(i) edición benigna vía tool: la card/DB refleja EXACTAMENTE el cambio pedido (diff mínimo)", async () => {
    const original = pdfSections().fase_1_4 as {
      diferenciadores: Array<Record<string, string>>;
    };
    const project = await projectWithDraft("fase_1_4", original);

    const editado = JSON.parse(JSON.stringify(original));
    editado.diferenciadores[0].titulo = "Coaching de verdad, no rutinas";
    llm.__setScript([
      llm.__toolTurn("propose_section", editado),
      llm.__textTurn("Hecho: cambié solo ese título. Revisa la tarjeta."),
    ]);

    const res = await postChat(
      jsonRequest("/api/chat", "POST", {
        projectId: project.id,
        message: "Cambia el título del primer diferenciador a 'Coaching de verdad, no rutinas'.",
      }),
    );
    expect(res.status).toBe(200);
    await res.text();

    const after = await sectionData(project.id, "fase_1_4");
    expect(after.diferenciadores[0].titulo).toBe("Coaching de verdad, no rutinas");
    // Diff mínimo: TODO lo demás idéntico al original.
    const sinTitulo = (d: typeof original) =>
      d.diferenciadores.map(({ titulo, ...resto }, i) => (i === 0 ? resto : { titulo, ...resto }));
    expect(sinTitulo(after)).toEqual(sinTitulo(original));
  });

  it("(ii) edición rechazada por validador: el motivo llega al stream y la sección NO se muta", async () => {
    const original = pdfSections().fase_4 as { hooks: Array<Record<string, unknown>> };
    const project = await projectWithDraft("fase_4", original);

    const conCifra = JSON.parse(JSON.stringify(original));
    conCifra.hooks[0].hook = "Este mes agendamos 18 citas automáticas para ti.";
    llm.__setScript([
      llm.__toolTurn("propose_section", conCifra),
      llm.__textTurn(
        "No apliqué el cambio porque: la cifra de 18 citas no está respaldada por un caso confirmado del Credibility Bank. Para usarla necesito que confirmemos ese caso, o la dejamos como [X] citas.",
      ),
    ]);

    const res = await postChat(
      jsonRequest("/api/chat", "POST", {
        projectId: project.id,
        message: "Cambia el hook 1 a: 'Este mes agendamos 18 citas automáticas para ti.'",
      }),
    );
    expect(res.status).toBe(200);
    const stream = await res.text();

    // El motivo del rechazo VIAJA en el stream (el cinturón de UI lo muestra).
    expect(stream).toContain("18 citas");
    expect(stream).toContain("no está respaldada");
    // Y la sección quedó intacta: ni el cambio rechazado ni mutaciones ajenas.
    const after = await sectionData(project.id, "fase_4");
    expect(after).toEqual(original);
  });

  it("(iii) cinturón de UI: ok:false visible salvo que un ok:true posterior lo resuelva", () => {
    const msg = (outputs: Array<{ ok: boolean; errors?: string[] }>): UIMessage =>
      ({
        id: "m1",
        role: "assistant",
        parts: outputs.map((output) => ({
          type: "tool-propose_section",
          state: "output-available",
          toolCallId: "c",
          output,
        })),
      }) as unknown as UIMessage;

    // Rechazo sin reintento exitoso → el motivo se muestra.
    expect(
      rejectedToolErrors(msg([{ ok: false, errors: ["la cifra no está respaldada"] }])),
    ).toEqual(["la cifra no está respaldada"]);
    // Rechazo seguido de ok:true (reintento que persistió) → no se muestra.
    expect(
      rejectedToolErrors(msg([{ ok: false, errors: ["x"] }, { ok: true }])),
    ).toEqual([]);
    // ok:true seguido de un NUEVO rechazo → el rechazo final sí se muestra.
    expect(
      rejectedToolErrors(msg([{ ok: true }, { ok: false, errors: ["y"] }])),
    ).toEqual(["y"]);
    // Mensaje de solo texto → nada.
    expect(
      rejectedToolErrors({
        id: "m2",
        role: "assistant",
        parts: [{ type: "text", text: "hola" }],
      } as unknown as UIMessage),
    ).toEqual([]);
  });

  it("(iv) las reglas del hotfix viven en los prompts/instrucciones (anti-regresión)", () => {
    const masterRules = fs.readFileSync(
      path.join(process.cwd(), "prompts", "master_rules.md"),
      "utf8",
    );
    expect(masterRules).toContain("No apliqué el cambio porque");
    expect(masterRules).toContain("ok=true");
    expect(masterRules).toContain("APROBADAS no se editan desde el chat");
    const route = fs.readFileSync(
      path.join(process.cwd(), "app", "api", "chat", "route.ts"),
      "utf8",
    );
    expect(route).toContain("DISCIPLINA DE EDICIÓN");
    expect(route).toContain("DIFF MÍNIMO");
    expect(route).toContain("No apliqué el cambio porque");
  });
});
