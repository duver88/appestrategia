// Seed idempotente del único SUPER_ADMIN (criterio: no existe registro de
// admins desde la UI). Ejecutar con: npm run db:seed
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.error(
      "Faltan SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD en .env — seed omitido.",
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super admin ya existe (${email}) — sin cambios.`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "Super Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
      // Cambio de contraseña obligatorio en el primer login.
      mustChangePassword: true,
    },
  });
  console.log(`Super admin creado: ${email} (debe cambiar la contraseña al entrar).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
