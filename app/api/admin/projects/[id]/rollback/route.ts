import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";
import { phasesForMode } from "@/lib/state-machine/phases";

const bodySchema = z.object({ phaseId: z.string().min(1) });

/**
 * Retroceder una fase: la sección vuelve a DRAFT y el proyecto a esa fase
 * (para cuando un cliente aprobó algo por error). No borra nada.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  const { id } = await params;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { phaseId } = parsed.data;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const phases = phasesForMode(project.mode);
  if (!phases.some((p) => p.id === phaseId)) {
    return Response.json(
      { error: `Fase desconocida para este modo: ${phaseId}` },
      { status: 400 },
    );
  }

  const section = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId: id, phaseId } },
  });
  if (!section || section.status !== "APPROVED") {
    return Response.json(
      { error: "Esa fase no tiene sección aprobada" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.section.update({
      where: { id: section.id },
      data: { status: "DRAFT" },
    }),
    prisma.project.update({
      where: { id },
      data: { currentPhase: phaseId, status: "IN_PROGRESS" },
    }),
  ]);
  return Response.json({ ok: true, currentPhase: phaseId });
}
