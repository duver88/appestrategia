import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ACTIVE_PHASES } from "@/lib/state-machine/phases";
import { NewProjectForm } from "@/components/dashboard/NewProjectForm";
import { RenewButton } from "@/components/dashboard/RenewButton";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/authz";
import { membershipBlocked, membershipDaysLeft } from "@/lib/membership";
import { CalendarClock, FolderOpen, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function StatusChip({ status }: { status: string }) {
  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-extrabold text-navy-700">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> En curso
      </span>
    );
  }
  if (status === "REVIEW") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(245,165,36,0.12)] px-2.5 py-1 text-[11px] font-extrabold text-navy-900">
        <span className="h-1.5 w-1.5 rounded-full bg-warn-500" /> En revisión
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(46,194,126,0.12)] px-2.5 py-1 text-[11px] font-extrabold text-navy-900">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Completado
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (await membershipBlocked(user)) redirect("/membership-expired");
  const daysLeft = await membershipDaysLeft(user);

  const projects = await prisma.project.findMany({
    // Aislamiento multi-tenant: un cliente solo ve sus proyectos.
    where:
      user.role === "SUPER_ADMIN" ? {} : { clientId: user.clientId ?? "—" },
    include: { client: true, sections: { where: { status: "APPROVED" } } },
    orderBy: { updatedAt: "desc" },
  });

  const firstName = (user.name ?? "").split(" ")[0];

  return (
    <div className="min-h-dvh bg-surface-50">
      {/* Topbar simple */}
      <div className="border-b border-line-200 bg-white">
        <div className="mx-auto flex h-[60px] max-w-5xl items-center justify-between px-5">
          <p className="text-[17px] font-black tracking-tight text-navy-900">
            LIONSCORE<span className="text-cyan-400">·</span>
          </p>
          <div className="flex items-center gap-2">
            {user.role === "SUPER_ADMIN" && (
              <Link
                href="/admin"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-line-200 px-3 text-[12px] font-extrabold text-navy-900 transition-colors duration-150 ease-snap hover:bg-surface-50"
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Panel admin
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 py-12">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-2">Tus proyectos</p>
            <h1 className="text-[30px] font-black leading-[1.15] tracking-[-0.02em] text-navy-900 md:text-[34px]">
              {firstName ? `Hola, ${firstName}.` : "Tu sistema"}
              <span className="block text-ink-400">
                Sigamos construyendo tu marca.
              </span>
            </h1>
          </div>
          <NewProjectForm isAdmin={user.role === "SUPER_ADMIN"} />
        </header>

        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 5 && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-line-200 bg-white px-5 py-4 shadow-card">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(245,165,36,0.12)]">
              <CalendarClock className="h-4 w-4 text-warn-500" strokeWidth={2} />
            </span>
            <p className="text-[13.5px] font-bold text-navy-900">
              {daysLeft === 0
                ? "Tu membresía vence hoy."
                : `Tu membresía vence en ${daysLeft} ${daysLeft === 1 ? "día" : "días"}.`}{" "}
              <span className="font-semibold text-ink-600">
                Escríbenos para renovarla y no perder acceso.
              </span>
            </p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-line-200 bg-white px-8 py-16 text-center shadow-card">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-50">
              <FolderOpen className="h-5 w-5 text-ink-400" strokeWidth={2} />
            </span>
            <p className="mb-1 text-[16px] font-extrabold text-navy-900">
              Todavía no hay proyectos
            </p>
            <p className="text-[14.5px] font-semibold text-ink-600">
              Crea el primero con «Nuevo Mes 1» y empieza la conversación.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const total = p.mode === "MODO_2" ? 1 : ACTIVE_PHASES.length;
              const done = p.sections.length;
              const pct = Math.round((done / total) * 100);
              return (
                <div
                  key={p.id}
                  className="lift flex flex-col rounded-2xl border border-line-200 bg-white p-6 shadow-card"
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <p className="eyebrow pt-1">
                      {p.mode === "MODO_1" ? "Mes 1 · Arquitectura" : "Renovación"}
                    </p>
                    <StatusChip status={p.status} />
                  </div>
                  <h2 className="truncate text-[17px] font-extrabold text-navy-900">
                    {p.client.name}
                  </h2>
                  <p className="mb-5 truncate text-[13.5px] font-semibold text-ink-600">
                    {p.title}
                  </p>
                  <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold">
                    <span className="text-ink-600">
                      {done} de {total} secciones
                    </span>
                    <span className="text-navy-900">{pct}%</span>
                  </div>
                  <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-line-200">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Link href={`/project/${p.id}`} className="flex-1">
                      <Button variant="navy" size="sm" className="w-full">
                        {p.status === "IN_PROGRESS" ? "Continuar" : "Abrir"}
                      </Button>
                    </Link>
                    {p.status === "REVIEW" && (
                      <Link href={`/project/${p.id}/review`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          Revisión
                        </Button>
                      </Link>
                    )}
                  </div>
                  {p.mode === "MODO_1" && p.status !== "IN_PROGRESS" && (
                    <div className="mt-2">
                      <RenewButton parentId={p.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
