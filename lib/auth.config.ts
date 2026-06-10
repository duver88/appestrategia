import type { NextAuthConfig } from "next-auth";

/**
 * Configuración edge-safe (sin Prisma): la usa el middleware.
 * El provider de credenciales (que sí toca la DB) se añade en lib/auth.ts.
 */
export const authConfig = {
  // La app corre detrás de un reverse proxy propio (Nginx en el VPS, M6):
  // el host lo controla la infraestructura, no el usuario.
  trustHost: true,
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.clientId = user.clientId;
        token.mustChangePassword = user.mustChangePassword;
      }
      // El cliente de change-password actualiza el flag sin re-login.
      if (trigger === "update" && session?.mustChangePassword === false) {
        token.mustChangePassword = false;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.uid as string) ?? "";
      session.user.role = (token.role as string) ?? "CLIENT";
      session.user.clientId = (token.clientId as string | null) ?? null;
      session.user.mustChangePassword = Boolean(token.mustChangePassword);
      return session;
    },
  },
} satisfies NextAuthConfig;
