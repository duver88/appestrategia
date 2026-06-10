import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";

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

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, createdAt: true } },
      projects: {
        orderBy: { updatedAt: "desc" },
        include: { sections: { where: { status: "APPROVED" }, select: { id: true } } },
      },
    },
  });
  if (!client) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usage = await prisma.usageLog.aggregate({
    where: { clientId: id, createdAt: { gte: monthStart } },
    _sum: { costUsd: true, inputTokens: true, outputTokens: true },
  });

  return Response.json({
    id: client.id,
    name: client.name,
    business: client.business,
    email: client.user?.email ?? null,
    status: client.status,
    membershipExpiresAt: client.membershipExpiresAt?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    monthUsage: {
      costUsd: usage._sum.costUsd ?? 0,
      inputTokens: usage._sum.inputTokens ?? 0,
      outputTokens: usage._sum.outputTokens ?? 0,
    },
    projects: client.projects.map((p) => ({
      id: p.id,
      title: p.title,
      mode: p.mode,
      status: p.status,
      currentPhase: p.currentPhase,
      approvedCount: p.sections.length,
      helpRequested: p.helpRequested,
      pdfUrl: p.pdfUrl,
      archivedAt: p.archivedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  business: z.string().min(1).optional(),
  // Extender membresía: fecha nueva ISO, o días a sumar desde hoy.
  membershipExpiresAt: z.string().datetime().optional(),
  extendDays: z.number().int().min(1).max(730).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
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
  const { name, business, membershipExpiresAt, extendDays, status } = parsed.data;

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  let newExpiry: Date | undefined;
  if (membershipExpiresAt) {
    newExpiry = new Date(membershipExpiresAt);
  } else if (extendDays) {
    // Extiende desde el vencimiento futuro o desde hoy si ya venció.
    const base = Math.max(
      client.membershipExpiresAt?.getTime() ?? 0,
      Date.now(),
    );
    newExpiry = new Date(base + extendDays * 24 * 60 * 60 * 1000);
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(business ? { business } : {}),
      ...(newExpiry ? { membershipExpiresAt: newExpiry } : {}),
      ...(status ? { status } : {}),
    },
  });
  return Response.json({
    id: updated.id,
    membershipExpiresAt: updated.membershipExpiresAt?.toISOString() ?? null,
    status: updated.status,
  });
}

export async function DELETE(
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

  const client = await prisma.client.findUnique({
    where: { id },
    include: { projects: { select: { id: true } } },
  });
  if (!client) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  // Borrado en cascada (la UI exige doble confirmación antes de llamar aquí).
  const projectIds = client.projects.map((p) => p.id);
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.section.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.usageLog.deleteMany({ where: { clientId: id } }),
    prisma.user.deleteMany({ where: { clientId: id } }),
    prisma.project.deleteMany({ where: { clientId: id } }),
    prisma.client.delete({ where: { id } }),
  ]);
  return Response.json({ ok: true });
}
