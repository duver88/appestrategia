import { redirect } from "next/navigation";
import { CalendarX } from "lucide-react";
import { getSessionUser } from "@/lib/authz";
import { membershipBlocked } from "@/lib/membership";
import { getSetting, DEFAULT_EXPIRED_TEXT } from "@/lib/settings";
import { SignOutButton } from "@/components/auth/SignOutButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Membresía vencida — LIONSCORE" };

export default async function MembershipExpiredPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Si la membresía está activa (p. ej. el admin ya la extendió), volver.
  if (!(await membershipBlocked(user))) redirect("/dashboard");

  const text = await getSetting<string>(
    "expired_screen_text",
    DEFAULT_EXPIRED_TEXT,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-line-200 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(245,165,36,0.12)]">
          <CalendarX className="h-7 w-7 text-warn-500" />
        </div>
        <h1 className="mb-3 text-[20px] font-extrabold text-navy-900">Tu membresía venció</h1>
        <p className="mb-6 whitespace-pre-line text-[14.5px] font-semibold leading-relaxed text-ink-600">
          {text}
        </p>
        <p className="mb-6 text-[12px] font-semibold text-ink-400">
          Todo tu avance está guardado tal como lo dejaste.
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}
