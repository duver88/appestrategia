import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import { requireActiveMembership } from "@/lib/membership";

const bodySchema = z.object({
  parentId: z.string().min(1),
  title: z.string().min(1),
});

const WELCOME_MODO2 = (clientName: string) =>
  `Hola de nuevo, ${clientName}. Empezamos la renovación mensual.

Tu arquitectura de marca (posicionamiento, promesa, método, hooks…) ya está construida y la heredamos del Mes 1: este mes solo vamos a crear tu calendario nuevo de 31 días, sin repetir ninguna idea del mes pasado.

Para empezar bien, cuéntame: ¿qué contenidos o hooks funcionaron mejor el mes pasado? ¿Y cuál es la urgencia real de este mes (cupos, fecha límite, bonus, subida de precio…)?`;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const blocked = await requireActiveMembership(user);
  if (blocked) return blocked;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { parentId, title } = parsed.data;

  const parent = await prisma.project.findUnique({
    where: { id: parentId },
    include: {
      client: true,
      sections: { where: { status: "APPROVED", phaseId: "fase_6" } },
    },
  });
  if (!parent || !canAccessClient(user, parent.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  if (parent.mode !== "MODO_1") {
    return Response.json(
      { error: "La renovación se crea desde el proyecto Mes 1" },
      { status: 400 },
    );
  }
  if (parent.sections.length === 0) {
    return Response.json(
      { error: "El Mes 1 debe tener el calendario aprobado antes de renovar" },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      clientId: parent.clientId,
      title,
      mode: "MODO_2",
      parentId: parent.id,
      currentPhase: "fase_6",
      modelProvider: parent.modelProvider,
      brandColor: parent.brandColor,
      messages: {
        create: {
          phaseId: "fase_6",
          role: "assistant",
          content: WELCOME_MODO2(parent.client.name),
        },
      },
    },
  });

  return Response.json({ id: project.id }, { status: 201 });
}
