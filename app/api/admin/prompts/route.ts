import { prisma } from "@/lib/db";
import { requireAdmin, isResponse } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const templates = await prisma.promptTemplate.findMany({
    orderBy: [{ phaseId: "asc" }, { version: "desc" }],
  });

  const byPhase = new Map<
    string,
    { activeVersion: number | null; versionCount: number; updatedAt: string }
  >();
  for (const t of templates) {
    const entry = byPhase.get(t.phaseId) ?? {
      activeVersion: null,
      versionCount: 0,
      updatedAt: t.createdAt.toISOString(),
    };
    entry.versionCount++;
    if (t.isActive) entry.activeVersion = t.version;
    if (t.createdAt.toISOString() > entry.updatedAt) {
      entry.updatedAt = t.createdAt.toISOString();
    }
    byPhase.set(t.phaseId, entry);
  }

  return Response.json(
    [...byPhase.entries()].map(([phaseId, info]) => ({ phaseId, ...info })),
  );
}
