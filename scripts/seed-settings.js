// Seed idempotente de Settings iniciales. No sobrescribe valores existentes.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULTS = {
  default_model: process.env.DEFAULT_MODEL || "anthropic:claude-sonnet-4-5",
  price_table: {
    "anthropic:claude-sonnet-4-5": { inputPerM: 3, outputPerM: 15 },
    "anthropic:claude-opus-4-8": { inputPerM: 15, outputPerM: 75 },
    "anthropic:claude-haiku-4-5": { inputPerM: 1, outputPerM: 5 },
    "openai:gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
    "openai:gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
    "deepseek:deepseek-chat": { inputPerM: 0.27, outputPerM: 1.1 },
  },
  expired_screen_text:
    "Tu membresía venció. Tu avance está guardado y no se pierde: escríbenos para renovar y seguir exactamente donde quedaste.\n\nContacto: WhatsApp de LIONSCORE.",
  // El gate de membresía arranca APAGADO: se activa al completar el backfill
  // (scripts/backfill-memberships.js) según el protocolo de despliegue.
  membership_enforcement: false,
  branding: { agencyName: "LIONSCORE AI", defaultBrandColor: "#1F3A5F" },
};

async function main() {
  let created = 0;
  for (const [key, value] of Object.entries(DEFAULTS)) {
    const existing = await prisma.setting.findUnique({ where: { key } });
    if (existing) continue;
    await prisma.setting.create({ data: { key, value: JSON.stringify(value) } });
    created++;
  }
  console.log(`Settings: ${created} creados, ${Object.keys(DEFAULTS).length - created} ya existían.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
