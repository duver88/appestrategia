import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";
import { encrypt, decrypt, maskKey } from "@/lib/crypto";
import { invalidateCredentialCache } from "@/lib/llm";

const PROVIDERS = ["anthropic", "openai", "deepseek", "openai_compatible"] as const;

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const rows = await prisma.apiCredential.findMany();
  // Las keys SOLO salen enmascaradas. Jamás en claro.
  return Response.json(
    PROVIDERS.map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      let masked: string | null = null;
      if (row) {
        try {
          masked = maskKey(decrypt(row.encryptedKey));
        } catch {
          masked = "····";
        }
      }
      return {
        provider,
        configured: Boolean(row),
        maskedKey: masked,
        baseUrl: row?.baseUrl ?? null,
        isActive: row?.isActive ?? false,
        lastTestedAt: row?.lastTestedAt?.toISOString() ?? null,
        lastTestOk: row?.lastTestOk ?? null,
        envFallback: Boolean(
          process.env[`${provider.toUpperCase()}_API_KEY`],
        ),
      };
    }),
  );
}

const putSchema = z.object({
  provider: z.enum(PROVIDERS),
  apiKey: z.string().min(8).optional(), // omitir = conservar la actual
  baseUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const parsed = putSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { provider, apiKey, baseUrl, isActive } = parsed.data;

  const existing = await prisma.apiCredential.findUnique({
    where: { provider },
  });
  if (!existing && !apiKey) {
    return Response.json(
      { error: "Falta la API key para crear la credencial" },
      { status: 400 },
    );
  }

  await prisma.apiCredential.upsert({
    where: { provider },
    create: {
      provider,
      encryptedKey: encrypt(apiKey!),
      baseUrl: baseUrl ?? null,
      isActive: isActive ?? true,
    },
    update: {
      ...(apiKey ? { encryptedKey: encrypt(apiKey), lastTestedAt: null, lastTestOk: null } : {}),
      ...(baseUrl !== undefined ? { baseUrl } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  // Efecto inmediato sin reiniciar.
  invalidateCredentialCache(provider);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const provider = req.nextUrl.searchParams.get("provider");
  if (!provider) {
    return Response.json({ error: "provider requerido" }, { status: 400 });
  }
  await prisma.apiCredential.deleteMany({ where: { provider } });
  invalidateCredentialCache(provider);
  return Response.json({ ok: true });
}
