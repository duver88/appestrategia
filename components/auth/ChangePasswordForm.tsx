"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";
import { Button } from "@/components/ui/button";

function FormInner() {
  const router = useRouter();
  const { update } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      setError("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "No se pudo cambiar la contraseña.");
      setLoading(false);
      return;
    }
    // Refresca el JWT para limpiar el flag mustChangePassword.
    await update({ mustChangePassword: false });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line-200 bg-white p-6 shadow-card"
    >
      <label className="mb-3 block">
        <span className="mb-1.5 block text-[13.5px] font-bold text-navy-900">
          Contraseña actual
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="field"
        />
      </label>
      <label className="mb-3 block">
        <span className="mb-1.5 block text-[13.5px] font-bold text-navy-900">
          Contraseña nueva
        </span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="field"
        />
      </label>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-[13.5px] font-bold text-navy-900">
          Repite la contraseña nueva
        </span>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field"
        />
      </label>
      {error && (
        <p className="mb-3 text-[13.5px] font-bold text-danger-500" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  return (
    <SessionProvider>
      <FormInner />
    </SessionProvider>
  );
}
