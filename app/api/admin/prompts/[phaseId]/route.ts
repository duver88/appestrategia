import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";
import { invalidatePromptCache } from "@/lib/prompts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  const { phaseId } = await params;

  const versions = await prisma.promptTemplate.findMany({
    where: { phaseId },
    orderBy: { version: "desc" },
  });
  if (versions.length === 0) {
    return Response.json({ error: "Plantilla no encontrada" }, { status: 404 });
  }
  return Response.json(
    versions.map((v) => ({
      version: v.version,
      isActive: v.isActive,
      content: v.content,
      createdAt: v.createdAt.toISOString(),
    })),
  );
}

const postSchema = z.union([
  // Guardar: crea versión nueva activa (nunca sobrescribe — historial sagrado).
  z.object({ action: z.literal("save"), content: z.string().min(1) }),
  // Restaurar: activa una versión anterior.
  z.object({ action: z.literal("activate"), version: z.number().int().min(1) }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  const { phaseId } = await params;

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (parsed.data.action === "save") {
    const last = await prisma.promptTemplate.findFirst({
      where: { phaseId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (last?.version ?? 0) + 1;
    await prisma.$transaction([
      prisma.promptTemplate.updateMany({
        where: { phaseId },
        data: { isActive: false },
      }),
      prisma.promptTemplate.create({
        data: {
          phaseId,
          version: nextVersion,
          content: parsed.data.content,
          isActive: true,
        },
      }),
    ]);
    // Aplica al SIGUIENTE mensaje de cualquier conversación, sin redeploy.
    invalidatePromptCache(phaseId);
    return Response.json({ version: nextVersion });
  }

  const target = await prisma.promptTemplate.findUnique({
    where: { phaseId_version: { phaseId, version: parsed.data.version } },
  });
  if (!target) {
    return Response.json({ error: "Versión no encontrada" }, { status: 404 });
  }
  await prisma.$transaction([
    prisma.promptTemplate.updateMany({
      where: { phaseId },
      data: { isActive: false },
    }),
    prisma.promptTemplate.update({
      where: { id: target.id },
      data: { isActive: true },
    }),
  ]);
  invalidatePromptCache(phaseId);
  return Response.json({ version: target.version });
}
