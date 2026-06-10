import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const projects = await prisma.project.findMany({
    include: {
      client: { select: { id: true, name: true } },
      sections: { where: { status: "APPROVED" }, select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(
    projects.map((p) => ({
      id: p.id,
      title: p.title,
      mode: p.mode,
      status: p.status,
      currentPhase: p.currentPhase,
      clientId: p.client.id,
      clientName: p.client.name,
      modelProvider: p.modelProvider,
      approvedCount: p.sections.length,
      helpRequested: p.helpRequested,
      archivedAt: p.archivedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
}
