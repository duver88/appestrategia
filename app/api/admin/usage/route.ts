import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";

/** Resumen de consumo del mes: total, por cliente, proveedor, fase y día. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  // ?month=YYYY-MM (por defecto, el mes actual)
  const monthParam = req.nextUrl.searchParams.get("month");
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(year, (month ?? 1) - 1, 1);
  const end = new Date(year, month ?? 1, 1);

  const logs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: start, lt: end } },
  });
  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
  });
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const acc = (key: (l: (typeof logs)[number]) => string) => {
    const map = new Map<
      string,
      { costUsd: number; inputTokens: number; outputTokens: number; calls: number }
    >();
    for (const l of logs) {
      const k = key(l);
      const e = map.get(k) ?? { costUsd: 0, inputTokens: 0, outputTokens: 0, calls: 0 };
      e.costUsd += l.costUsd;
      e.inputTokens += l.inputTokens;
      e.outputTokens += l.outputTokens;
      e.calls++;
      map.set(k, e);
    }
    return [...map.entries()]
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd);
  };

  return Response.json({
    month: `${year}-${String(month).padStart(2, "0")}`,
    total: {
      costUsd: logs.reduce((s, l) => s + l.costUsd, 0),
      inputTokens: logs.reduce((s, l) => s + l.inputTokens, 0),
      outputTokens: logs.reduce((s, l) => s + l.outputTokens, 0),
      calls: logs.length,
    },
    byClient: acc((l) => l.clientId).map((e) => ({
      ...e,
      name: clientName.get(e.key) ?? e.key,
    })),
    byProvider: acc((l) => l.provider),
    byPhase: acc((l) => l.phaseId),
    byDay: acc((l) => String(l.createdAt.getDate()).padStart(2, "0")).sort(
      (a, b) => a.key.localeCompare(b.key),
    ),
  });
}
