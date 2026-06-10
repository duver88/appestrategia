// Remediación puntual: elimina del proyecto de Hernesto los mensajes de la
// fase_0_5 contaminados por la fase inventada ("Arquetipo") y deja un opener
// limpio del Diagnóstico del Eje. No toca secciones ni otras fases.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const OPENER = `Sección anterior aprobada. Ahora viene una corta pero importante: el diagnóstico del eje de posicionamiento.

Te lo explico simple: el eje es el ángulo desde el que tu marca va a hablar SIEMPRE. Hay tres caminos posibles — una creencia contraria (decir la verdad que tu mercado necesita oír y nadie dice), un proceso propio (tu forma distinta de hacer las cosas) o resultados (tus casos como argumento central).

Con lo que ya me contaste de tu negocio, voy a proponerte el eje que mejor te queda y por qué. Pero primero una pregunta: cuando piensas en lo que todo el mundo en tu mercado repite a tus clientes, ¿qué es eso que tú sabes por experiencia que está mal?`;

(async () => {
  const project = await prisma.project.findFirst({
    where: { client: { name: { contains: "ernesto" } } },
  });
  if (!project) throw new Error("Proyecto de Hernesto no encontrado");
  if (project.currentPhase !== "fase_0_5") {
    console.log(`Fase actual ${project.currentPhase} — no se toca nada.`);
    return;
  }
  const del = await prisma.message.deleteMany({
    where: { projectId: project.id, phaseId: "fase_0_5" },
  });
  await prisma.message.create({
    data: {
      projectId: project.id,
      phaseId: "fase_0_5",
      role: "assistant",
      content: OPENER,
    },
  });
  console.log(`Mensajes contaminados eliminados: ${del.count}. Opener limpio insertado.`);
  await prisma.$disconnect();
})();
