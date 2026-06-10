// Backfill idempotente: asigna membershipExpiresAt = hoy + N días (30 por
// defecto, configurable: node scripts/backfill-memberships.js 45) a todo
// Client sin fecha. Si al terminar TODOS los clientes tienen fecha, activa
// el gate de membresía (Setting membership_enforcement = true).
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const days = parseInt(process.argv[2] || "30", 10);
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const result = await prisma.client.updateMany({
    where: { membershipExpiresAt: null },
    data: { membershipExpiresAt: expires },
  });
  console.log(`Membresías: ${result.count} clientes actualizados a +${days} días.`);

  const remaining = await prisma.client.count({
    where: { membershipExpiresAt: null },
  });
  if (remaining === 0) {
    await prisma.setting.upsert({
      where: { key: "membership_enforcement" },
      create: { key: "membership_enforcement", value: "true" },
      update: { value: "true" },
    });
    console.log("Gate de membresía ACTIVADO (todos los clientes tienen fecha).");
  } else {
    console.log(`Quedan ${remaining} clientes sin fecha; el gate sigue apagado.`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
