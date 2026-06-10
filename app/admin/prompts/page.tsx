import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPromptsPage() {
  const templates = await prisma.promptTemplate.findMany({
    orderBy: [{ phaseId: "asc" }, { version: "desc" }],
  });
  const byPhase = new Map<string, { active: number | null; count: number; updated: Date }>();
  for (const t of templates) {
    const e = byPhase.get(t.phaseId) ?? { active: null, count: 0, updated: t.createdAt };
    e.count++;
    if (t.isActive) e.active = t.version;
    if (t.createdAt > e.updated) e.updated = t.createdAt;
    byPhase.set(t.phaseId, e);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="eyebrow mb-1">Panel · Prompts</p>
      <h1 className="mb-2 text-[30px] font-black tracking-tight">
        Plantillas de prompts
      </h1>
      <p className="mb-8 text-[14.5px] font-semibold" style={{ color: "var(--ink-600)" }}>
        Los cambios aplican al siguiente mensaje de cualquier conversación, sin
        redeploy. Cada guardado crea una versión nueva restaurable.
      </p>

      <div className="card overflow-hidden">
        <ul className="divide-y" style={{ borderColor: "var(--line-200)" }}>
          {[...byPhase.entries()].map(([phaseId, info]) => (
            <li key={phaseId}>
              <Link
                href={`/admin/prompts/${phaseId}`}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--surface-50)]"
              >
                <span className="flex items-center gap-3">
                  <FileCode2 className="h-4 w-4" style={{ color: "var(--ink-400)" }} />
                  <span className="font-mono text-[13.5px] font-bold">{phaseId}</span>
                </span>
                <span className="text-[12px] font-bold" style={{ color: "var(--ink-400)" }}>
                  v{info.active ?? "—"} activa · {info.count}{" "}
                  {info.count === 1 ? "versión" : "versiones"} ·{" "}
                  {info.updated.toLocaleDateString("es")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {byPhase.size === 0 && (
          <p className="p-6 text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
            Sin plantillas en DB. Corre: node scripts/seed-prompts.js
          </p>
        )}
      </div>
    </div>
  );
}
