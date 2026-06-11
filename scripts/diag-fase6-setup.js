// DIAGNÓSTICO fase_6 (solo datos de prueba; no toca código de producto).
// Crea cliente+usuario+proyecto en fase_6 con las 17 fases previas aprobadas.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const EMAIL = "diag-fase6@test.local";
const PASS = "diag-pass-1234";

// Reutiliza las SECTIONS válidas del seed e2e (mismas formas de schema).
const seedSrc = fs.readFileSync(path.join(__dirname, "e2e-seed.js"), "utf8");
const cut = seedSrc.indexOf("async function clean");
const dataSrc = seedSrc
  .slice(0, cut)
  .replace(/const \{ PrismaClient \}[\s\S]*?bcryptjs"\);/, "")
  .replace(/const prisma = new PrismaClient\(\);/, "");
const SECTIONS = new Function(`${dataSrc}; return SECTIONS;`)();

// Persona visible configurable: node scripts/diag-fase6-setup.js PARCIAL
const persona = process.argv[2] || "COMPLETA";
SECTIONS.fase_0 = {
  ...SECTIONS.fase_0,
  personaVisible: persona,
  // Ajuste #3 (A4): nombre de la cara visible (ficha técnica + persona/día).
  nombreCaraVisible: persona === "NINGUNA" ? null : "Diana Gómez",
};

(async () => {
  // Limpieza idempotente
  const old = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (old?.clientId) {
    const ps = await prisma.project.findMany({ where: { clientId: old.clientId } });
    for (const p of ps) {
      await prisma.message.deleteMany({ where: { projectId: p.id } });
      await prisma.section.deleteMany({ where: { projectId: p.id } });
      await prisma.usageLog.deleteMany({ where: { projectId: p.id } });
    }
    await prisma.user.delete({ where: { id: old.id } });
    await prisma.project.deleteMany({ where: { clientId: old.clientId } });
    await prisma.client.delete({ where: { id: old.clientId } });
  }

  const client = await prisma.client.create({
    data: {
      name: "Diag Fase6",
      business: "Mentoría fitness (diagnóstico)",
      membershipExpiresAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Diag Fase6",
      passwordHash: await bcrypt.hash(PASS, 12),
      role: "CLIENT",
      clientId: client.id,
    },
  });

  // Todas las fases previas aprobadas; fase_6 pendiente (es la actual).
  const prior = Object.fromEntries(
    Object.entries(SECTIONS).filter(([k]) => k !== "fase_6"),
  );
  const project = await prisma.project.create({
    data: {
      clientId: client.id,
      title: "Diagnóstico fase_6",
      mode: "MODO_1",
      currentPhase: "fase_6",
      modelProvider: "deepseek:deepseek-chat",
      sections: {
        create: Object.entries(prior).map(([phaseId, data]) => ({
          phaseId,
          data: JSON.stringify(data),
          status: "APPROVED",
          approvedAt: new Date(),
        })),
      },
      messages: {
        create: {
          phaseId: "fase_6",
          role: "assistant",
          content:
            "Llegamos a la última fase: el calendario de 31 días. Antes de la semana 4 necesito que confirmes el FOMO real del mes. ¿Cuál es?",
        },
      },
    },
  });
  console.log(JSON.stringify({ email: EMAIL, pass: PASS, projectId: project.id }));
  await prisma.$disconnect();
})();
