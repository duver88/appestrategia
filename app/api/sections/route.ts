import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import type { SectionDTO, SectionStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return Response.json({ error: "projectId requerido" }, { status: 400 });
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const sections = await prisma.section.findMany({
    where: { projectId },
    orderBy: { updatedAt: "asc" },
  });
  const dtos: SectionDTO[] = sections.map((s) => ({
    id: s.id,
    phaseId: s.phaseId,
    data: JSON.parse(s.data),
    status: s.status as SectionStatus,
    version: s.version,
    needsReview: s.needsReview,
    approvedAt: s.approvedAt?.toISOString() ?? null,
  }));
  return Response.json(dtos);
}
