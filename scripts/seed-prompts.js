// Seed idempotente: migra /prompts/*.md a PromptTemplate (versión 1, activa).
// NO toca phaseIds que ya tengan alguna versión en DB.
// A partir de este seed, el runtime lee SIEMPRE de DB (fallback al archivo
// solo si no hay registro — transición segura).
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const PROMPTS_DIR = path.join(__dirname, "..", "prompts");

async function main() {
  const files = fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".md"));
  let created = 0;
  for (const file of files) {
    const phaseId = file.replace(/\.md$/, "");
    const existing = await prisma.promptTemplate.findFirst({ where: { phaseId } });
    if (existing) continue;
    await prisma.promptTemplate.create({
      data: {
        phaseId,
        version: 1,
        content: fs.readFileSync(path.join(PROMPTS_DIR, file), "utf8"),
        isActive: true,
      },
    });
    created++;
  }
  console.log(`Prompts: ${created} plantillas creadas, ${files.length - created} ya existían.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
