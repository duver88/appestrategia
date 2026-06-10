import { auth } from "@/lib/auth";

export interface SessionUser {
  id: string;
  role: string;
  clientId: string | null;
  name?: string | null;
  email?: string | null;
}

/** Usuario de la sesión actual, o null si no hay sesión. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/**
 * Aislamiento multi-tenant: un CLIENT solo accede a recursos de su propio
 * clientId; el SUPER_ADMIN accede a todo.
 */
export function canAccessClient(
  user: SessionUser,
  clientId: string,
): boolean {
  return user.role === "SUPER_ADMIN" || user.clientId === clientId;
}
