import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse, tempPassword } from "@/lib/admin";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { clientId: id } });
  if (!user) {
    return Response.json(
      { error: "El cliente no tiene usuario" },
      { status: 404 },
    );
  }

  const password = tempPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
    },
  });
  // Se muestra una vez para enviársela al cliente.
  return Response.json({ tempPassword: password });
}
