import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAccessClient, getSessionUser } from "@/lib/authz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { sections: { where: { status: "APPROVED" }, select: { id: true } } },
  });
  // Aislamiento multi-tenant: recurso ajeno = 404 (sin filtrar existencia).
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  return Response.json({
    id: project.id,
    title: project.title,
    mode: project.mode,
    status: project.status,
    currentPhase: project.currentPhase,
    brandColor: project.brandColor,
    approvedCount: project.sections.length,
    updatedAt: project.updatedAt.toISOString(),
  });
}

const patchSchema = z.object({
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const updated = await prisma.project.update({
    where: { id },
    data: parsed.data,
  });
  return Response.json({ id: updated.id, brandColor: updated.brandColor });
}
