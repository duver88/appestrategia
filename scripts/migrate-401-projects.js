// Adición 3b: proyectos cuyo modelProvider apunta a un proveedor SIN
// credencial en DB ni env (causa de los 401 en logs) → migrarlos al
// default_model vigente. Idempotente; imprime el antes/después uno a uno.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const setting = await prisma.setting.findUnique({ where: { key: "default_model" } });
  const target = setting ? JSON.parse(setting.value) : "deepseek:deepseek-chat";
  const creds = await prisma.apiCredential.findMany({ where: { isActive: true } });
  const okProviders = new Set(creds.map((c) => c.provider));
  for (const p of ["anthropic", "openai", "deepseek"]) {
    if (process.env[`${p.toUpperCase()}_API_KEY`]?.trim()) okProviders.add(p);
  }

  const projects = await prisma.project.findMany({
    include: { client: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`default_model vigente: ${target}`);
  console.log(`proveedores con credencial: ${[...okProviders].join(", ") || "ninguno"}\n`);

  for (const pr of projects) {
    const provider = pr.modelProvider.split(":")[0];
    if (okProviders.has(provider)) {
      console.log(`SIN CAMBIO  ${pr.id} · "${pr.title}" (${pr.client.name}) · ${pr.modelProvider} — proveedor operativo`);
      continue;
    }
    await prisma.project.update({
      where: { id: pr.id },
      data: { modelProvider: target },
    });
    console.log(`MIGRADO     ${pr.id} · "${pr.title}" (${pr.client.name}) · ${pr.modelProvider} → ${target}`);
  }
  await prisma.$disconnect();
})();
