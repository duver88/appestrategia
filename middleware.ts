import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth");

  if (!session?.user) {
    if (isPublic) return NextResponse.next();
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const login = new URL("/login", req.nextUrl);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  // Panel super admin: primera capa de la doble verificación de rol
  // (la segunda vive en cada handler de /api/admin/*).
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (session.user.role !== "SUPER_ADMIN") {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Prohibido" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  // Cambio de contraseña obligatorio (primer login del super admin o cliente invitado).
  if (
    session.user.mustChangePassword &&
    !pathname.startsWith("/change-password") &&
    !pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl));
  }

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Todo excepto estáticos de Next. Los PDFs NO se sirven desde /public:
  // se descargan por el endpoint autenticado /api/pdf/[projectId].
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
