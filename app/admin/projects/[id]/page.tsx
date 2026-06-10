import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleDot, Circle, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { phasesForMode } from "@/lib/state-machine/phases";
import { ProjectAdminActions } from "@/components/admin/ProjectAdminActions";

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      sections: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) notFound();

  const phases = phasesForMode(project.mode);
  const approvedPhases = phases.filter((p) =>
    project.sections.some((s) => s.phaseId === p.id && s.status === "APPROVED"),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/projects"
        className="mb-4 inline-flex items-center gap-1 text-[13.5px] font-bold"
        style={{ color: "var(--ink-400)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Proyectos
      </Link>
      <p className="eyebrow mb-1">
        Proyecto ·{" "}
        <Link href={`/admin/clients/${project.client.id}`} style={{ color: "var(--teal-700)" }}>
          {project.client.name}
        </Link>
      </p>
      <h1 className="mb-6 text-[28px] font-black tracking-tight">{project.title}</h1>

      <ProjectAdminActions
        projectId={project.id}
        modelProvider={project.modelProvider}
        archived={project.archivedAt !== null}
        helpRequested={project.helpRequested}
        approvedPhases={approvedPhases.map((p) => ({ id: p.id, title: p.title }))}
        pdfReady={project.status !== "IN_PROGRESS"}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px,1fr]">
        <section className="card h-fit p-5">
          <p className="eyebrow mb-3">Fases</p>
          <ul className="space-y-2">
            {phases.map((p) => {
              const s = project.sections.find((x) => x.phaseId === p.id);
              return (
                <li key={p.id} className="flex items-center gap-2 text-[13.5px] font-semibold">
                  {s?.needsReview ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--warn-500)" }} />
                  ) : s?.status === "APPROVED" ? (
                    <Check className="h-4 w-4 shrink-0" style={{ color: "var(--green-500)" }} />
                  ) : p.id === project.currentPhase ? (
                    <CircleDot className="h-4 w-4 shrink-0" style={{ color: "var(--teal-700)" }} />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0" style={{ color: "var(--line-200)" }} />
                  )}
                  <span className="min-w-0 truncate">{p.title}</span>
                  {s && (
                    <span className="ml-auto text-[11px] font-bold" style={{ color: "var(--ink-400)" }}>
                      v{s.version}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5">
          <p className="eyebrow mb-3">
            Conversación (solo lectura · {project.messages.length} mensajes)
          </p>
          <div className="max-h-[560px] space-y-3 overflow-y-auto pr-2">
            {project.messages.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl px-4 py-3 text-[13.5px] font-semibold leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "var(--navy-900)", color: "var(--white)", marginLeft: "15%" }
                    : { background: "var(--surface-50)", marginRight: "15%" }
                }
              >
                <p className="mb-1 text-[10.5px] font-extrabold uppercase tracking-[0.1em]" style={{ color: m.role === "user" ? "var(--navy-300)" : "var(--ink-400)" }}>
                  {m.role === "user" ? "Cliente" : "IA"} · {m.phaseId} ·{" "}
                  {m.createdAt.toLocaleString("es")}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {project.messages.length === 0 && (
              <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
                Sin mensajes.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
