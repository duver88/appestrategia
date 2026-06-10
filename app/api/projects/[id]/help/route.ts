import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessClient, getSessionUser } from "@/lib/authz";

/** Botón "Necesito ayuda humana": marca el proyecto para el panel admin. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  await prisma.project.update({
    where: { id },
    data: { helpRequested: true },
  });
  return Response.json({ ok: true });
}
