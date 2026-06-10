// Seed idempotente: migra las API keys del .env a ApiCredential (cifradas)
// para que nada deje de funcionar al pasar el runtime a leer de DB.
// Las env vars quedan como fallback de desarrollo.
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("./_crypto");

const prisma = new PrismaClient();

const ENV_KEYS = [
  ["anthropic", "ANTHROPIC_API_KEY"],
  ["openai", "OPENAI_API_KEY"],
  ["deepseek", "DEEPSEEK_API_KEY"],
];

async function main() {
  let created = 0;
  for (const [provider, envName] of ENV_KEYS) {
    const key = (process.env[envName] || "").trim();
    if (!key) continue;
    const existing = await prisma.apiCredential.findUnique({ where: { provider } });
    if (existing) continue;
    await prisma.apiCredential.create({
      data: { provider, encryptedKey: encrypt(key), isActive: true },
    });
    created++;
    console.log(`Credencial migrada: ${provider}`);
  }
  console.log(`Credenciales: ${created} migradas desde .env.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
