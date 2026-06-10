import Link from "next/link";
import { LifeBuoy, CalendarClock, Users, UserX, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)} USD`;
}

export default async function AdminHomePage() {
  const now = new Date();
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [clients, expiring, helpProjects, usage] = await Promise.all([
    prisma.client.findMany({ select: { status: true, membershipExpiresAt: true } }),
    prisma.client.findMany({
      where: {
        status: "ACTIVE",
        membershipExpiresAt: { gte: now, lte: in7days },
      },
      orderBy: { membershipExpiresAt: "asc" },
      include: { user: { select: { email: true } } },
    }),
    prisma.project.findMany({
      where: { helpRequested: true },
      include: { client: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.usageLog.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costUsd: true },
      _count: true,
    }),
  ]);

  const active = clients.filter(
    (c) =>
      c.status === "ACTIVE" &&
      (!c.membershipExpiresAt || c.membershipExpiresAt > now),
  ).length;
  const expired = clients.filter(
    (c) =>
      c.status === "SUSPENDED" ||
      (c.membershipExpiresAt !== null && c.membershipExpiresAt <= now),
  ).length;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-1">Panel · Resumen</p>
      <h1 className="mb-8 text-[30px] font-black tracking-tight">
        Estado del negocio
      </h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Clientes activos", value: String(active), icon: Users, tint: "var(--cyan-soft)", color: "var(--teal-700)" },
          { label: "Vencidos o suspendidos", value: String(expired), icon: UserX, tint: "rgba(245,165,36,.12)", color: "var(--warn-500)" },
          { label: "Pidieron ayuda", value: String(helpProjects.length), icon: LifeBuoy, tint: "rgba(229,72,77,.1)", color: "var(--danger-500)" },
          { label: "Gasto de API del mes", value: fmtUsd(usage._sum.costUsd ?? 0), icon: Wallet, tint: "var(--surface-50)", color: "var(--ink-600)" },
        ].map(({ label, value, icon: Icon, tint, color }) => (
          <div key={label} className="card p-6">
            <span
              className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: tint }}
            >
              <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
            </span>
            <p className="text-[26px] font-black leading-none tracking-tight">
              {value}
            </p>
            <p className="eyebrow mt-2">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" style={{ color: "var(--warn-500)" }} />
            <h2 className="text-[20px] font-extrabold">Por vencer en 7 días</h2>
          </div>
          {expiring.length === 0 ? (
            <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
              Ningún cliente vence esta semana.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--line-200)" }}>
              {expiring.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="text-[14.5px] font-bold"
                      style={{ color: "var(--teal-700)" }}
                    >
                      {c.name}
                    </Link>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--ink-400)" }}>
                      {c.user?.email}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-bold" style={{ color: "var(--warn-500)" }}>
                    {c.membershipExpiresAt?.toLocaleDateString("es")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" style={{ color: "var(--danger-500)" }} />
            <h2 className="text-[20px] font-extrabold">Pidieron ayuda humana</h2>
          </div>
          {helpProjects.length === 0 ? (
            <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
              Sin solicitudes pendientes.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--line-200)" }}>
              {helpProjects.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="text-[14.5px] font-bold"
                      style={{ color: "var(--teal-700)" }}
                    >
                      {p.client.name}
                    </Link>
                    <p className="text-[12px] font-semibold" style={{ color: "var(--ink-400)" }}>
                      {p.title} · fase {p.currentPhase}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                    style={{ background: "rgba(229,72,77,.1)", color: "var(--danger-500)" }}
                  >
                    Pendiente
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
