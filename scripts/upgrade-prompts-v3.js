// Publica como NUEVA VERSIÓN ACTIVA los prompts del ajuste de calidad
// (frente B). Idempotente: si la versión activa ya es idéntica al archivo
// seed, no crea otra. Jamás sobrescribe versiones (historial restaurable).
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const TARGETS = [
  "master_rules",
  "fase_0_recopilacion",
  "fase_0_5_diagnostico_eje",
  "fase_1_0_validacion_tono",
  "fase_1_1_nicho",
  "fase_1_2_dolores_deseos",
  "fase_1_3_promesa",
  "fase_1_4_diferenciadores",
  "fase_1_5_customer_journey",
  "fase_1_6_vehiculo",
  "fase_1_7_entregables",
  "fase_2_1_eje_posicionamiento",
  "fase_2_2_brand_statement",
  "fase_2_3_banco_tesis",
  "fase_2_4_credibility_bank",
  "fase_3_perfiles_deseos",
  "fase_4_matriz_hooks",
  "fase_5_organic_magnets",
  "fase_6_calendario",
  "modo_2_renovacion",
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
