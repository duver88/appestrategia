import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    include: {
      client: { select: { id: true, name: true } },
      sections: { where: { status: "APPROVED" }, select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow mb-1">Panel · Proyectos</p>
      <h1 className="mb-8 text-[30px] font-black tracking-tight">
        Todos los proyectos
      </h1>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className="th">Proyecto</th>
              <th className="th">Cliente</th>
              <th className="th">Estado</th>
              <th className="th">Fase</th>
              <th className="th">Secciones</th>
              <th className="th">Modelo</th>
              <th className="th">Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} style={p.archivedAt ? { opacity: 0.5 } : undefined}>
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
                    {p.mode === "MODO_1" ? "Mes 1" : "Renovación"}
                    {p.archivedAt ? " · archivado" : ""}
                  </span>
                </td>
                <td className="td">
                  <Link href={`/admin/clients/${p.client.id}`} style={{ color: "var(--teal-700)" }}>
                    {p.client.name}
                  </Link>
                </td>
                <td className="td">{p.status}</td>
                <td className="td">{p.currentPhase}</td>
                <td className="td">{p.sections.length}</td>
                <td className="td font-mono text-[12px]">{p.modelProvider}</td>
                <td className="td">{p.updatedAt.toLocaleDateString("es")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
