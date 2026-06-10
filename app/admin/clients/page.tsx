import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/db";
import { CreateClientButton } from "@/components/admin/CreateClientButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: "rgba(46,194,126,.12)", color: "var(--green-500)", label: "Activo" },
  EXPIRED: { bg: "rgba(245,165,36,.12)", color: "var(--warn-500)", label: "Vencido" },
  SUSPENDED: { bg: "rgba(229,72,77,.12)", color: "var(--danger-500)", label: "Suspendido" },
};

export default async function AdminClientsPage() {
  const now = Date.now();
  const clients = await prisma.client.findMany({
    include: {
      user: { select: { email: true } },
      projects: {
        orderBy: { updatedAt: "desc" },
        select: { currentPhase: true, helpRequested: true, updatedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Panel · Clientes</p>
          <h1 className="text-[30px] font-black tracking-tight">Clientes</h1>
        </div>
        <CreateClientButton />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr>
              <th className="th">Cliente</th>
              <th className="th">Email</th>
              <th className="th">Estado</th>
              <th className="th">Vence</th>
              <th className="th">Fase actual</th>
              <th className="th">Última actividad</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const latest = c.projects[0];
              const expired =
                c.membershipExpiresAt !== null &&
                c.membershipExpiresAt.getTime() < now;
              const status =
                c.status === "SUSPENDED" ? "SUSPENDED" : expired ? "EXPIRED" : "ACTIVE";
              const st = STATUS_STYLE[status];
              const help = c.projects.some((p) => p.helpRequested);
              return (
                <tr key={c.id}>
                  <td className="td">
                    <span className="flex items-center gap-2">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-bold"
                        style={{ color: "var(--teal-700)" }}
                      >
                        {c.name}
                      </Link>
                      {help && (
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
                      {c.business}
                    </span>
                  </td>
                  <td className="td">{c.user?.email ?? "—"}</td>
                  <td className="td">
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="td">
                    {c.membershipExpiresAt?.toLocaleDateString("es") ?? "—"}
                  </td>
                  <td className="td">{latest?.currentPhase ?? "—"}</td>
                  <td className="td">
                    {(latest?.updatedAt ?? c.createdAt).toLocaleDateString("es")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="p-6 text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
            Sin clientes todavía. Crea el primero con «Nuevo cliente».
          </p>
        )}
      </div>
    </div>
  );
}
