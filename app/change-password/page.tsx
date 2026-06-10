import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata = { title: "Cambiar contraseña — LIONSCORE" };

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-black tracking-[-0.02em] text-navy-900">
            LIONSCORE<span className="text-cyan-400">·</span>
          </h1>
          <p className="text-[14.5px] font-semibold text-ink-600">
            Por seguridad, elige una contraseña nueva antes de continuar.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
