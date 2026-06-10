import { prisma } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import type { SessionUser } from "@/lib/authz";

/**
 * Gate de membresía (solo rutas de CLIENT). Se activa con el Setting
 * `membership_enforcement` — que el backfill enciende cuando TODOS los
 * clientes tienen membershipExpiresAt (protocolo de despliegue, paso 5).
 * Los datos del cliente NUNCA se tocan: al extender la fecha, todo vuelve.
 */
export async function membershipBlocked(user: SessionUser): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return false;
  if (!user.clientId) return false;

  const enforce = await getSetting<boolean>("membership_enforcement", false);
  if (!enforce) return false;

  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    select: { status: true, membershipExpiresAt: true },
  });
  if (!client) return false;
  if (client.status === "SUSPENDED") return true;
  return (
    client.membershipExpiresAt !== null &&
    client.membershipExpiresAt.getTime() < Date.now()
  );
}

/** Para endpoints de API: Response 403 con código MEMBERSHIP_EXPIRED, o null. */
export async function requireActiveMembership(
  user: SessionUser,
): Promise<Response | null> {
  if (await membershipBlocked(user)) {
    return Response.json(
      { error: "Tu membresía venció", code: "MEMBERSHIP_EXPIRED" },
      { status: 403 },
    );
  }
  return null;
}

/** Días restantes de membresía (para el banner de aviso), o null. */
export async function membershipDaysLeft(
  user: SessionUser,
): Promise<number | null> {
  if (user.role === "SUPER_ADMIN" || !user.clientId) return null;
  const client = await prisma.client.findUnique({
    where: { id: user.clientId },
    select: { membershipExpiresAt: true },
  });
  if (!client?.membershipExpiresAt) return null;
  return Math.ceil(
    (client.membershipExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );
}
