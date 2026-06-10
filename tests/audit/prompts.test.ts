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
import { getActivePrompt } from "@/lib/prompts";
import { ADMIN_SESSION, jsonRequest, params } from "./helpers";
import { GET as getVersions, POST as postPrompt } from "@/app/api/admin/prompts/[phaseId]/route";

const mockAuth = auth as unknown as Mock;
const PHASE = "audit_test_prompt";

beforeAll(async () => {
  mockAuth.mockResolvedValue(ADMIN_SESSION);
  await prisma.promptTemplate.deleteMany({ where: { phaseId: PHASE } });
  await prisma.promptTemplate.create({
    data: { phaseId: PHASE, version: 1, content: "contenido v1", isActive: true },
  });
});

describe("versionado de prompts", () => {
  it("guardar crea versión N+1 activa", async () => {
    const res = await postPrompt(
      jsonRequest(`/api/admin/prompts/${PHASE}`, "POST", {
        action: "save",
        content: "contenido v2",
      }),
      params({ phaseId: PHASE }),
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { version: number }).version).toBe(2);

    const list = await getVersions(
      jsonRequest(`/api/admin/prompts/${PHASE}`, "GET"),
      params({ phaseId: PHASE }),
    );
    const versions = (await list.json()) as Array<{ version: number; isActive: boolean }>;
    expect(versions.find((v) => v.version === 2)?.isActive).toBe(true);
    expect(versions.find((v) => v.version === 1)?.isActive).toBe(false);
  });

  it("restaurar reactiva versión anterior", async () => {
    const res = await postPrompt(
      jsonRequest(`/api/admin/prompts/${PHASE}`, "POST", {
        action: "activate",
        version: 1,
      }),
      params({ phaseId: PHASE }),
    );
    expect(res.status).toBe(200);
    const active = await prisma.promptTemplate.findFirst({
      where: { phaseId: PHASE, isActive: true },
    });
    expect(active?.version).toBe(1);
  });

  it("getActivePrompt refleja el cambio", async () => {
    // Tras restaurar v1:
    expect(await getActivePrompt(PHASE)).toBe("contenido v1");
    // Guardar v3 → aplica al siguiente uso, sin redeploy:
    await postPrompt(
      jsonRequest(`/api/admin/prompts/${PHASE}`, "POST", {
        action: "save",
        content: "contenido v3",
      }),
      params({ phaseId: PHASE }),
    );
    expect(await getActivePrompt(PHASE)).toBe("contenido v3");
  });
});
