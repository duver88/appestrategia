// Ajuste #3 (frente B) — publica como NUEVA VERSIÓN ACTIVA los prompts
// tocados por el ajuste v3.1 reconciliado. Clon del patrón v3: idempotente
// (si la versión activa ya es idéntica al seed, no crea otra) y jamás
// sobrescribe versiones (historial restaurable desde el panel).
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const TARGETS = [
  "master_rules", // B3 transversal + B6.2 voz única
  "fase_0_recopilacion", // A4.1: nombreCaraVisible (pregunta 13b)
  "fase_1_4_diferenciadores", // B6.1: pulido de concordancia
  "fase_2_2_brand_statement", // B1: Principal con ejemplo dorado de Luxor
  "fase_2_4_credibility_bank", // B3: disciplina de brackets por caso
  "fase_4_matriz_hooks", // A3: estructura obligatoria + cifras
  "fase_5_organic_magnets", // A2.3: reglas de diasAplica
  "fase_6_calendario", // B2: gate ternario + cifras + magnets fijos
  "modo_2_renovacion", // B2: vía de brackets en renovación
];

(async () => {
  for (const phaseId of TARGETS) {
    const file = path.join(__dirname, "..", "prompts", `${phaseId}.md`);
    const content = fs.readFileSync(file, "utf8");
    const active = await prisma.promptTemplate.findFirst({
      where: { phaseId, isActive: true },
    });
    if (active && active.content === content) {
      console.log(`${phaseId}: ya al día (v${active.version}).`);
      continue;
    }
    const last = await prisma.promptTemplate.findFirst({
      where: { phaseId },
      orderBy: { version: "desc" },
    });
    const nextVersion = (last?.version ?? 0) + 1;
    await prisma.$transaction([
      prisma.promptTemplate.updateMany({ where: { phaseId }, data: { isActive: false } }),
      prisma.promptTemplate.create({
        data: { phaseId, version: nextVersion, content, isActive: true },
      }),
    ]);
    console.log(`${phaseId}: publicada v${nextVersion} (antes activa: v${active?.version ?? "—"}, restaurable).`);
  }
  await prisma.$disconnect();
})();
