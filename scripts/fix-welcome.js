// Backfill puntual: agrega el mensaje de bienvenida a proyectos sin mensajes.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const WELCOME = (name) =>
  `Hola, ${name}. Bienvenido al sistema de Marca Personal + Contenido + Ventas de LIONSCORE.

Vamos a construir tu sistema completo paso a paso: yo te hago las preguntas, tú respondes con lo que sabes de tu negocio, y en cada fase te muestro una propuesta que puedes aprobar o corregir. Nada avanza sin tu aprobación, y todo queda guardado: puedes cerrar esta ventana y retomar exactamente donde quedaste.

Empezamos por la base: la información de tu negocio. Cuando estés listo, dime "empecemos" o cuéntame directamente: ¿qué vendes hoy?`;

(async () => {
  const projects = await prisma.project.findMany({
    where: { messages: { none: {} } },
    include: { client: true },
  });
  for (const pr of projects) {
    await prisma.message.create({
      data: {
        projectId: pr.id,
        phaseId: pr.currentPhase,
        role: "assistant",
        content: WELCOME(pr.client.name),
      },
    });
    console.log(`bienvenida agregada: ${pr.id} (${pr.client.name})`);
  }
  if (projects.length === 0) console.log("todos los proyectos ya tienen mensajes");
  await prisma.$disconnect();
})();
