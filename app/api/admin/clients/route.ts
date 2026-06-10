import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdmin, isResponse, tempPassword } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const clients = await prisma.client.findMany({
    include: {
      user: { select: { email: true } },
      projects: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          currentPhase: true,
          status: true,
          helpRequested: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  return Response.json(
    clients.map((c) => {
      const latest = c.projects[0] ?? null;
      const expired =
        c.membershipExpiresAt !== null &&
        c.membershipExpiresAt.getTime() < now;
      return {
        id: c.id,
        name: c.name,
        business: c.business,
        email: c.user?.email ?? null,
        status: c.status === "SUSPENDED" ? "SUSPENDED" : expired ? "EXPIRED" : "ACTIVE",
        membershipExpiresAt: c.membershipExpiresAt?.toISOString() ?? null,
        currentPhase: latest?.currentPhase ?? null,
        lastActivityAt: latest?.updatedAt.toISOString() ?? c.createdAt.toISOString(),
        helpRequested: c.projects.some((p) => p.helpRequested),
        projectCount: c.projects.length,
      };
    }),
  );
}

const createSchema = z.object({
  name: z.string().min(1),
  business: z.string().min(1),
  email: z.string().email(),
  membershipDays: z.number().int().min(1).max(730).default(30),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (isResponse(admin)) return admin;
  // Tercera capa: el rol se re-verifica en el propio handler (regla SUPER_ADMIN).
  if (admin.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const { name, business, email, membershipDays } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return Response.json(
      { error: "Ya existe un usuario con ese email" },
      { status: 409 },
    );
  }

  const password = tempPassword();
  const client = await prisma.client.create({
    data: {
      name,
      business,
      membershipExpiresAt: new Date(
        Date.now() + membershipDays * 24 * 60 * 60 * 1000,
      ),
    },
  });
  await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      role: "CLIENT",
      clientId: client.id,
      mustChangePassword: true,
    },
  });

  // La contraseña temporal se muestra UNA vez para enviarla por WhatsApp/email.
  return Response.json(
    {
      id: client.id,
      email: normalizedEmail,
      tempPassword: password,
      inviteUrl: "/login",
    },
    { status: 201 },
  );
}
