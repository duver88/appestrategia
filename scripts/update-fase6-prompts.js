// Publica en DB (nueva versión activa) los prompts de fase_6 y modo_2
// actualizados a la tool generar_calendario. Idempotente: si la versión
// activa ya menciona la tool, no crea otra. Respeta el versionado (nunca
// sobrescribe versiones existentes).
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const TARGETS = ["fase_6_calendario", "modo_2_renovacion"];

(async () => {
  for (const phaseId of TARGETS) {
    const file = path.join(__dirname, "..", "prompts", `${phaseId}.md`);
    const content = fs.readFileSync(file, "utf8");
    const active = await prisma.promptTemplate.findFirst({
      where: { phaseId, isActive: true },
    });
    if (active?.content.includes("generar_calendario")) {
      console.log(`${phaseId}: la versión activa ya usa generar_calendario — sin cambios.`);
      continue;
    }
    const last = await prisma.promptTemplate.findFirst({
      where: { phaseId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (last?.version ?? 0) + 1;
    await prisma.$transaction([
      prisma.promptTemplate.updateMany({
        where: { phaseId },
        data: { isActive: false },
      }),
      prisma.promptTemplate.create({
        data: { phaseId, version: nextVersion, content, isActive: true },
      }),
    ]);
    console.log(`${phaseId}: publicada versión ${nextVersion} (activa).`);
  }
  await prisma.$disconnect();
})();
