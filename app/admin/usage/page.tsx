import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmtUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

interface Bucket {
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

function accumulate<T>(items: T[], key: (i: T) => string, cost: (i: T) => Bucket) {
  const map = new Map<string, Bucket>();
  for (const item of items) {
    const k = key(item);
    const e = map.get(k) ?? { costUsd: 0, inputTokens: 0, outputTokens: 0, calls: 0 };
    const c = cost(item);
    e.costUsd += c.costUsd;
    e.inputTokens += c.inputTokens;
    e.outputTokens += c.outputTokens;
    e.calls += c.calls;
    map.set(k, e);
  }
  return map;
}

export default async function AdminUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const fmtMonth = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const [logs, clients] = await Promise.all([
    prisma.usageLog.findMany({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.client.findMany({ select: { id: true, name: true } }),
  ]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const toBucket = (l: (typeof logs)[number]): Bucket => ({
    costUsd: l.costUsd,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    calls: 1,
  });

  const total = logs.reduce((s, l) => s + l.costUsd, 0);
  const byClient = [...accumulate(logs, (l) => l.clientId, toBucket)].sort(
    (a, b) => b[1].costUsd - a[1].costUsd,
  );
  const byProvider = [...accumulate(logs, (l) => l.provider, toBucket)];
  const byPhase = [...accumulate(logs, (l) => l.phaseId, toBucket)].sort(
    (a, b) => b[1].costUsd - a[1].costUsd,
  );
  const byDay = accumulate(logs, (l) => String(l.createdAt.getDate()), toBucket);
  const daysInMonth = new Date(year, month, 0).getDate();
  const maxDay = Math.max(0.0001, ...[...byDay.values()].map((b) => b.costUsd));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Panel · Consumo</p>
          <h1 className="text-[30px] font-black tracking-tight">
            Consumo de API — {monthStr}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/usage?month=${fmtMonth(prevDate)}`} className="btn-ghost">
            ← {fmtMonth(prevDate)}
          </Link>
          {nextDate <= now && (
            <Link href={`/admin/usage?month=${fmtMonth(nextDate)}`} className="btn-ghost">
              {fmtMonth(nextDate)} →
            </Link>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <p className="eyebrow mb-2">Gasto total del mes</p>
          <p className="text-[28px] font-black">${total.toFixed(2)} USD</p>
        </div>
        <div className="card p-6">
          <p className="eyebrow mb-2">Llamadas</p>
          <p className="text-[28px] font-black">{logs.length}</p>
        </div>
        <div className="card p-6">
          <p className="eyebrow mb-2">Tokens</p>
          <p className="text-[16px] font-extrabold">
            {logs.reduce((s, l) => s + l.inputTokens, 0).toLocaleString("es")} in
          </p>
          <p className="text-[16px] font-extrabold">
            {logs.reduce((s, l) => s + l.outputTokens, 0).toLocaleString("es")} out
          </p>
        </div>
      </div>

      <div className="card mb-6 p-6">
        <p className="eyebrow mb-4">Gasto por día</p>
        <div className="flex h-32 items-end gap-1">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const b = byDay.get(String(i + 1));
            const h = b ? Math.max(4, (b.costUsd / maxDay) * 100) : 0;
            return (
              <div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${h}%`,
                  background: b ? "var(--navy-700)" : "var(--line-200)",
                  minHeight: b ? undefined : "2px",
                }}
                title={`Día ${i + 1}: ${b ? fmtUsd(b.costUsd) : "$0"}`}
              />
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold" style={{ color: "var(--ink-400)" }}>
          <span>1</span>
          <span>{daysInMonth}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <p className="eyebrow mb-4">Por cliente</p>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Cliente</th>
                <th className="th">Llamadas</th>
                <th className="th">Costo</th>
              </tr>
            </thead>
            <tbody>
              {byClient.map(([id, b]) => (
                <tr key={id}>
                  <td className="td">{clientName.get(id) ?? id}</td>
                  <td className="td">{b.calls}</td>
                  <td className="td">{fmtUsd(b.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {byClient.length === 0 && (
            <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
              Sin consumo este mes.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="eyebrow mb-4">Por proveedor</p>
            {byProvider.map(([prov, b]) => (
              <div key={prov} className="mb-2 flex items-center justify-between text-[13.5px] font-semibold">
                <span>{prov}</span>
                <span>{fmtUsd(b.costUsd)}</span>
              </div>
            ))}
            {byProvider.length === 0 && (
              <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
                Sin datos.
              </p>
            )}
          </div>
          <div className="card p-6">
            <p className="eyebrow mb-4">Por fase (qué consume más)</p>
            {byPhase.slice(0, 8).map(([phase, b]) => (
              <div key={phase} className="mb-2 flex items-center justify-between text-[13.5px] font-semibold">
                <span>{phase}</span>
                <span>{fmtUsd(b.costUsd)}</span>
              </div>
            ))}
            {byPhase.length === 0 && (
              <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
                Sin datos.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
