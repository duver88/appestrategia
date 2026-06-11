// Vigilante del reintento de Hernesto (solo lectura). Sondea la DB cada 15s
// hasta ~9.5 min y termina en cuanto hay veredicto:
//   EXITO  → sección fase_6 en DRAFT con 31 días
//   FALLO  → mensaje nuevo del asistente sin DRAFT (se imprime el texto)
//   PARCIAL→ progreso de semanas persistido (sigue vigilando)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEADLINE = Date.now() + 9.5 * 60 * 1000;

(async () => {
  const project = await prisma.project.findFirst({
    where: { client: { name: { contains: "ernesto" } } },
  });
  const baseMsgs = await prisma.message.count({
    where: { projectId: project.id, phaseId: "fase_6" },
  });
  const baseUsage = await prisma.usageLog.count({
    where: { projectId: project.id, phaseId: "fase_6" },
  });
  console.log(
    `vigilando ${project.id} (fase ${project.currentPhase}) · mensajes=${baseMsgs} · llamadas=${baseUsage}`,
  );

  let lastState = "";
  while (Date.now() < DEADLINE) {
    const section = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    const usage = await prisma.usageLog.count({
      where: { projectId: project.id, phaseId: "fase_6" },
    });
    const msgs = await prisma.message.count({
      where: { projectId: project.id, phaseId: "fase_6" },
    });

    if (section?.status === "DRAFT") {
      const d = JSON.parse(section.data);
      console.log(
        `VEREDICTO: EXITO — borrador de ${d.dias?.length} días (llamadas nuevas: ${usage - baseUsage}). Cara/semana y catálogos validados por el servidor.`,
      );
      process.exit(0);
    }
    const state = `partial=${section?.status === "PARTIAL" ? JSON.parse(section.data).weeks?.filter(Boolean).length : 0} usage=${usage} msgs=${msgs}`;
    if (state !== lastState) {
      console.log(`actividad: ${state}`);
      lastState = state;
    }
    // Mensaje nuevo del asistente SIN borrador y sin actividad de semanas
    // posterior → probable fallo: mostrar el texto para diagnóstico.
    if (msgs > baseMsgs && usage > baseUsage) {
      const last = await prisma.message.findFirst({
        where: { projectId: project.id, phaseId: "fase_6", role: "assistant" },
        orderBy: { createdAt: "desc" },
      });
      if (last && !section?.status?.includes("DRAFT")) {
        // Espera 30s extra por si el draft llega justo después del mensaje.
        await new Promise((r) => setTimeout(r, 30000));
        const again = await prisma.section.findUnique({
          where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
        });
        if (again?.status === "DRAFT") continue;
        console.log(`VEREDICTO: FALLO PROBABLE — último mensaje del asistente:`);
        console.log(last.content.slice(0, 500));
        console.log(`(parcial: ${again?.status ?? "ninguno"} · llamadas nuevas: ${usage - baseUsage})`);
        process.exit(2);
      }
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log(
    `SIN VEREDICTO en la ventana: Hernesto aún no reintentó o sigue en curso (estado: ${lastState || "sin actividad"}).`,
  );
  process.exit(3);
})();
