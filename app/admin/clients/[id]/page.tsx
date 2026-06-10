import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/db";
import { ClientActions } from "@/components/admin/ClientActions";

export const dynamic = "force-dynamic";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          sections: { where: { status: "APPROVED" }, select: { id: true } },
        },
      },
    },
  });
  if (!client) notFound();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usage = await prisma.usageLog.aggregate({
    where: { clientId: id, createdAt: { gte: monthStart } },
    _sum: { costUsd: true, inputTokens: true, outputTokens: true },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/clients"
        className="mb-4 inline-flex items-center gap-1 text-[13.5px] font-bold"
        style={{ color: "var(--ink-400)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Clientes
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Cliente</p>
          <h1 className="text-[28px] font-black tracking-tight">{client.name}</h1>
          <p className="text-[14.5px] font-semibold" style={{ color: "var(--ink-600)" }}>
            {client.business} · {client.user?.email ?? "sin usuario"}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="eyebrow mb-1">Membresía</p>
          <p className="text-[16px] font-extrabold">
            {client.status === "SUSPENDED"
              ? "Suspendida"
              : client.membershipExpiresAt
                ? `Vence ${client.membershipExpiresAt.toLocaleDateString("es")}`
                : "Sin fecha"}
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow mb-1">Consumo del mes</p>
          <p className="text-[16px] font-extrabold">
            ${(usage._sum.costUsd ?? 0).toFixed(2)} USD
          </p>
          <p className="text-[12px] font-semibold" style={{ color: "var(--ink-400)" }}>
            {(usage._sum.inputTokens ?? 0).toLocaleString("es")} in ·{" "}
            {(usage._sum.outputTokens ?? 0).toLocaleString("es")} out
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow mb-1">Proyectos</p>
          <p className="text-[16px] font-extrabold">{client.projects.length}</p>
        </div>
      </div>

      <ClientActions
        clientId={client.id}
        status={client.status}
        membershipExpiresAt={client.membershipExpiresAt?.toISOString() ?? null}
      />

      <section className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">Proyecto</th>
              <th className="th">Estado</th>
              <th className="th">Fase</th>
              <th className="th">Secciones</th>
              <th className="th">PDF</th>
            </tr>
          </thead>
          <tbody>
            {client.projects.map((p) => (
              <tr key={p.id}>
                <td className="td">
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="font-bold"
                      style={{ color: "var(--teal-700)" }}
                    >
                      {p.title}
                    </Link>
                    {p.helpRequested && (
                      <span
                        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold"
                        style={{ background: "var(--cyan-soft)", color: "var(--navy-900)" }}
                      >
                        <LifeBuoy className="h-3.5 w-3.5" aria-hidden />
                        Ayuda
                      </span>
                    )}
                  </span>
                  <span className="block text-[12px] font-semibold" style={{ color: "var(--ink-400)" }}>
                    {p.mode === "MODO_1" ? "Mes 1 — Arquitectura" : "Renovación mensual"}
                    {p.archivedAt ? " · archivado" : ""}
                  </span>
                </td>
                <td className="td">{p.status}</td>
                <td className="td">{p.currentPhase}</td>
                <td className="td">{p.sections.length}</td>
                <td className="td">
                  {p.pdfUrl ? (
                    <a href={`/api/pdf/${p.id}`} className="font-bold" style={{ color: "var(--teal-700)" }}>
                      Descargar
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
