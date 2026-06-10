import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getDefaultModelSpec } from "@/lib/llm";
import { ACTIVE_PHASES } from "@/lib/state-machine/phases";
import { getSessionUser } from "@/lib/authz";
import { requireActiveMembership } from "@/lib/membership";

// CLIENT: crea proyectos para su propia ficha (no envía datos de cliente).
// SUPER_ADMIN: puede crear cliente+proyecto de prueba indicando los datos.
const createSchema = z.object({
  title: z.string().min(1),
  clientName: z.string().min(1).optional(),
  business: z.string().min(1).optional(),
});

const WELCOME = (clientName: string) =>
  `Hola, ${clientName}. Bienvenido al sistema de Marca Personal + Contenido + Ventas de LIONSCORE.

Vamos a construir tu sistema completo paso a paso: yo te hago las preguntas, tú respondes con lo que sabes de tu negocio, y en cada fase te muestro una propuesta que puedes aprobar o corregir. Nada avanza sin tu aprobación, y todo queda guardado: puedes cerrar esta ventana y retomar exactamente donde quedaste.

Empezamos por la base: la información de tu negocio. Cuando estés listo, dime "empecemos" o cuéntame directamente: ¿qué vendes hoy?`;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const projects = await prisma.project.findMany({
    // Aislamiento multi-tenant: un cliente solo ve sus proyectos.
    where:
      user.role === "SUPER_ADMIN" ? {} : { clientId: user.clientId ?? "—" },
    include: { client: true, sections: { where: { status: "APPROVED" } } },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(
    projects.map((p) => ({
      id: p.id,
      title: p.title,
      mode: p.mode,
      status: p.status,
      clientName: p.client.name,
      approvedCount: p.sections.length,
      totalPhases: ACTIVE_PHASES.length,
      updatedAt: p.updatedAt,
    })),
  );
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const blocked = await requireActiveMembership(user);
  if (blocked) return blocked;
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { title, clientName, business } = parsed.data;

  let clientId: string;
  let welcomeName: string;
  if (user.role === "SUPER_ADMIN") {
    if (!clientName || !business) {
      return Response.json(
        { error: "Como admin indica nombre del cliente y negocio" },
        { status: 400 },
      );
    }
    const client = await prisma.client.create({
      data: { name: clientName, business },
    });
    clientId = client.id;
    welcomeName = clientName;
  } else {
    if (!user.clientId) {
      return Response.json(
        { error: "Tu cuenta no tiene ficha de cliente asociada" },
        { status: 403 },
      );
    }
    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
    });
    if (!client) {
      return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
    }
    clientId = client.id;
    welcomeName = client.name;
  }

  const firstPhase = ACTIVE_PHASES[0].id;
  const project = await prisma.project.create({
    data: {
      clientId,
      title,
      mode: "MODO_1",
      currentPhase: firstPhase,
      modelProvider: await getDefaultModelSpec(),
      messages: {
        create: {
          phaseId: firstPhase,
          role: "assistant",
          content: WELCOME(welcomeName),
        },
      },
    },
  });

  return Response.json({ id: project.id }, { status: 201 });
}
