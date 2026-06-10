import { NextRequest } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";
import { getModel, getDefaultModelSpec } from "@/lib/llm";

export const maxDuration = 60;

// Modelo barato por proveedor para la llamada mínima de prueba.
const TEST_MODELS: Record<string, string> = {
  anthropic: "claude-haiku-4-5",
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
};

const bodySchema = z.object({
  provider: z.enum(["anthropic", "openai", "deepseek", "openai_compatible"]),
  model: z.string().optional(), // requerido para openai_compatible
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { provider, model } = parsed.data;

  let modelName = model ?? TEST_MODELS[provider];
  if (!modelName) {
    // openai_compatible sin modelo indicado: usa el del default si coincide.
    const def = await getDefaultModelSpec();
    const [defProvider, ...rest] = def.split(":");
    if (defProvider === provider) modelName = rest.join(":");
  }
  if (!modelName) {
    return Response.json(
      { error: "Indica el modelo a usar para la prueba" },
      { status: 400 },
    );
  }

  let ok = false;
  let message = "Conexión correcta";
  try {
    await generateText({
      model: await getModel(`${provider}:${modelName}`),
      prompt: "Responde solo: ok",
      maxOutputTokens: 8,
    });
    ok = true;
  } catch (err) {
    // Sin filtrar la key ni detalles sensibles en el mensaje.
    message =
      err instanceof Error && /401|403|key|auth/i.test(err.message)
        ? "Credencial rechazada por el proveedor"
        : "El proveedor no respondió";
  }

  await prisma.apiCredential.updateMany({
    where: { provider },
    data: { lastTestedAt: new Date(), lastTestOk: ok },
  });
  return Response.json({ ok, message });
}
