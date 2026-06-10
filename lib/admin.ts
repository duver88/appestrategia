import { getSessionUser, type SessionUser } from "@/lib/authz";

/**
 * Segunda capa de la doble verificación de rol para /api/admin/*
 * (la primera está en middleware.ts). Devuelve el usuario admin o una
 * Response 401/403 lista para retornar.
 */
export async function requireAdmin(): Promise<SessionUser | Response> {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }
  return user;
}

export function isResponse(x: unknown): x is Response {
  return x instanceof Response;
}

/** Contraseña temporal legible para invitaciones y resets. */
export function tempPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
