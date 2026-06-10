import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";
import { setSetting } from "@/lib/settings";

const EDITABLE_KEYS = [
  "default_model",
  "price_table",
  "expired_screen_text",
  "branding",
  "smtp",
  "membership_enforcement",
  "welcome_text",
  "contact_text",
] as const;

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const rows = await prisma.setting.findMany();
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return Response.json(out);
}

const putSchema = z.object({
  key: z.enum(EDITABLE_KEYS),
  value: z.unknown(),
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
    return Response.json({ error: "Clave de setting inválida" }, { status: 400 });
  }
  await setSetting(parsed.data.key, parsed.data.value);
  return Response.json({ ok: true });
}
