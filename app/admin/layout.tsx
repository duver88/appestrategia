import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionUser } from "@/lib/authz";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defensa en profundidad: el middleware ya filtra, esto es la segunda capa.
  const user = await getSessionUser();
  if (!user || user.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="admin-root flex min-h-dvh">
      <aside className="navy-glow on-navy sticky top-0 flex h-dvh w-[248px] shrink-0 flex-col overflow-y-auto px-4 py-7">
        <p
          className="mb-9 px-3 text-[18px] font-black tracking-tight"
          style={{ color: "var(--white)" }}
        >
          LIONSCORE<span style={{ color: "var(--cyan-400)" }}>·</span>
          <span className="eyebrow eyebrow-on-navy mt-1 block">
            Panel de la agencia
          </span>
        </p>
        <AdminNav />
        <div
          className="mt-6 space-y-3 border-t pt-5"
          style={{ borderColor: "var(--navy-700)" }}
        >
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 text-[13px] font-bold transition-colors duration-150"
            style={{ color: "var(--navy-300)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Vista de cliente
          </Link>
          <div className="px-1">
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-10 py-10">{children}</main>
    </div>
  );
}
