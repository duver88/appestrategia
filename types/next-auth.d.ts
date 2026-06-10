import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    clientId: string | null;
    mustChangePassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: string;
      clientId: string | null;
      mustChangePassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    clientId?: string | null;
    mustChangePassword?: boolean;
  }
}
