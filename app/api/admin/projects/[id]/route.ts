import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";
import { phasesForMode } from "@/lib/state-machine/phases";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, business: true } },
      sections: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  return Response.json({
    id: project.id,
    title: project.title,
    mode: project.mode,
    status: project.status,
    currentPhase: project.currentPhase,
    modelProvider: project.modelProvider,
    helpRequested: project.helpRequested,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    client: project.client,
    phases: phasesForMode(project.mode).map((p) => {
      const s = project.sections.find((x) => x.phaseId === p.id);
      return {
        id: p.id,
        title: p.title,
        status: s?.status ?? null,
        version: s?.version ?? null,
        needsReview: s?.needsReview ?? false,
      };
    }),
    // Conversación en SOLO LECTURA para el panel.
    messages: project.messages.map((m) => ({
      id: m.id,
      phaseId: m.phaseId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  modelProvider: z
    .string()
    .regex(/^(anthropic|openai|deepseek|openai_compatible):.+$/)
    .optional(),
  archived: z.boolean().optional(),
  helpResolved: z.boolean().optional(), // limpiar el flag de ayuda
});

export async function PATCH(
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

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(parsed.data.modelProvider
        ? { modelProvider: parsed.data.modelProvider }
        : {}),
      ...(parsed.data.archived !== undefined
        ? { archivedAt: parsed.data.archived ? new Date() : null }
        : {}),
      ...(parsed.data.helpResolved ? { helpRequested: false } : {}),
    },
  });
  return Response.json({
    id: updated.id,
    modelProvider: updated.modelProvider,
    archivedAt: updated.archivedAt?.toISOString() ?? null,
    helpRequested: updated.helpRequested,
  });
}
