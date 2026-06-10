import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProjectView } from "@/components/project/ProjectView";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import { membershipBlocked } from "@/lib/membership";
import type { MessageDTO, SectionDTO, SectionStatus, MessageRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (await membershipBlocked(user)) redirect("/membership-expired");

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { client: true, sections: true },
  });
  if (!project || !canAccessClient(user, project.clientId)) notFound();

  // Al reanudar se recarga la conversación de la fase activa.
  const messages = await prisma.message.findMany({
    where: { projectId: id, phaseId: project.currentPhase },
    orderBy: { createdAt: "asc" },
  });

  const messageDtos: MessageDTO[] = messages.map((m) => ({
    id: m.id,
    phaseId: m.phaseId,
    role: m.role as MessageRole,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  const sectionDtos: SectionDTO[] = project.sections.map((s) => ({
    id: s.id,
    phaseId: s.phaseId,
    data: JSON.parse(s.data),
    status: s.status as SectionStatus,
    version: s.version,
    needsReview: s.needsReview,
    approvedAt: s.approvedAt?.toISOString() ?? null,
  }));

  return (
    <ProjectView
      project={{
        id: project.id,
        title: project.title,
        status: project.status,
        currentPhase: project.currentPhase,
        clientName: project.client.name,
        mode: project.mode,
        helpRequested: project.helpRequested,
      }}
      initialMessages={messageDtos}
      initialSections={sectionDtos}
    />
  );
}
