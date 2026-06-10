import { describe, it, expect, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/crypto";
import { ADMIN_SESSION, jsonRequest } from "./helpers";
import { GET as getCredentials, PUT as putCredential } from "@/app/api/admin/credentials/route";

const mockAuth = auth as unknown as Mock;

describe("cifrado de API keys", () => {
  it("roundtrip encrypt/decrypt", () => {
    const plain = "sk-test-roundtrip-1234567890abcdef";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("dos cifrados de la misma key difieren (IV aleatorio)", () => {
    const plain = "sk-test-misma-key-9876543210";
    const a = encrypt(plain);
    const b = encrypt(plain);
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(plain);
    expect(decrypt(b)).toBe(plain);
  });

  it("la respuesta JSON de credenciales no contiene la key en claro", async () => {
    mockAuth.mockResolvedValue(ADMIN_SESSION);
    const secretKey = "sk-test-jamas-en-claro-XYZ987654321";

    const put = await putCredential(
      jsonRequest("/api/admin/credentials", "PUT", {
        provider: "deepseek",
        apiKey: secretKey,
      }),
    );
    expect(put.status).toBe(200);

    const res = await getCredentials();
    expect(res.status).toBe(200);
    // Aserción sobre el body COMPLETO serializado: ni rastro de la key.
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain(secretKey);
    expect(raw).toContain("····"); // enmascarada
  });
});
