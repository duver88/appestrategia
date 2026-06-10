import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import { membershipBlocked } from "@/lib/membership";
import { phasesForMode } from "@/lib/state-machine/phases";
import { SectionContent } from "@/components/chat/SectionContent";
import { ReviewActions } from "@/components/review/ReviewActions";
import { PDF_REQUIRED_PHASES } from "@/lib/pdf/types";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
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
    include: { client: true, sections: { where: { status: "APPROVED" } } },
  });
  if (!project || !canAccessClient(user, project.clientId)) notFound();

  // En MODO_2 solo se revisa el calendario nuevo; el resto está en el Mes 1.
  const phases = phasesForMode(project.mode);
  const ordered = phases.map((p) => ({
    phase: p,
    section: project.sections.find((s) => s.phaseId === p.id),
  }));

  const approvedIds = new Set(project.sections.map((s) => s.phaseId));
  const ready =
    project.mode === "MODO_2"
      ? approvedIds.has("fase_6")
      : PDF_REQUIRED_PHASES.every((p) => approvedIds.has(p));

  return (
    <div className="min-h-dvh bg-surface-50">
      {/* Header navy con la acción principal de la pantalla */}
      <header
        className="px-4 py-10"
        style={{
          background: "linear-gradient(180deg, var(--navy-900), var(--navy-800))",
        }}
      >
        <div className="mx-auto max-w-[860px]">
          <Link
            href={`/project/${id}`}
            className="mb-6 inline-flex items-center gap-1 text-[13.5px] font-bold text-navy-300 transition-colors duration-150 ease-snap hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Volver al chat
          </Link>
          <p className="eyebrow eyebrow-on-navy mb-2">Revisión final</p>
          <h1 className="mb-1 text-[28px] font-black leading-[1.15] tracking-[-0.02em] text-white md:text-[32px]">
            {project.client.name}
          </h1>
          <p className="mb-8 text-[14.5px] font-semibold text-navy-300">
            {project.title}
          </p>
          <ReviewActions
            projectId={id}
            initialColor={project.brandColor ?? "#1F3A5F"}
            ready={ready}
          />
        </div>
      </header>

      {/* Documento como hoja blanca */}
      <main className="mx-auto max-w-[860px] px-4 py-10">
        <div className="space-y-6 rounded-2xl border border-line-200 bg-white p-6 shadow-card md:p-10">
          {ordered.map(({ phase, section }) => (
            <section
              key={phase.id}
              className="border-b border-line-200 pb-6 last:border-b-0 last:pb-0"
            >
              <p className="eyebrow mb-1.5">{phase.part}</p>
              <h2 className="mb-4 text-[20px] font-extrabold text-navy-900">
                {phase.title}
              </h2>
              {section ? (
                <SectionContent
                  phaseId={phase.id}
                  data={JSON.parse(section.data)}
                />
              ) : (
                <p className="text-[13.5px] font-bold text-warn-500">
                  Sección pendiente de aprobación — el PDF no puede generarse
                  sin ella.
                </p>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
