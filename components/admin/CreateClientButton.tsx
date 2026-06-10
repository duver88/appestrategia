"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check } from "lucide-react";

export function CreateClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, business, email, membershipDays: days }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? "No se pudo crear el cliente");
      setLoading(false);
      return;
    }
    setInvite({ email: body.email, tempPassword: body.tempPassword });
    setLoading(false);
    router.refresh();
  }

  function copyInvite() {
    if (!invite) return;
    const text = `Acceso a tu sistema LIONSCORE:\n${window.location.origin}/login\nEmail: ${invite.email}\nContraseña temporal: ${invite.tempPassword}\n(Se te pedirá cambiarla al entrar.)`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function close() {
    setOpen(false);
    setInvite(null);
    setName("");
    setBusiness("");
    setEmail("");
    setError(null);
  }

  if (!open) {
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Nuevo cliente
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,17,48,.5)" }}
      role="dialog"
      aria-modal="true"
    >
      <div className="card w-full max-w-md p-6" style={{ boxShadow: "var(--shadow-pop)" }}>
        {invite ? (
          <>
            <p className="eyebrow mb-1">Invitación lista</p>
            <h2 className="mb-4 text-[20px] font-extrabold">Envía estos datos al cliente</h2>
            <div className="mb-4 rounded-xl p-4 text-[13.5px] font-semibold" style={{ background: "var(--surface-50)" }}>
              <p>Email: {invite.email}</p>
              <p>
                Contraseña temporal:{" "}
                <span className="font-mono font-bold">{invite.tempPassword}</span>
              </p>
              <p className="mt-2 text-[12px]" style={{ color: "var(--ink-400)" }}>
                Se muestra una sola vez. Al entrar se le pedirá cambiarla.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={copyInvite}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar invitación"}
              </button>
              <button className="btn-navy" onClick={close}>
                Listo
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="eyebrow mb-1">Clientes</p>
            <h2 className="mb-4 text-[20px] font-extrabold">Nuevo cliente</h2>
            <label className="mb-3 block">
              <span className="mb-1 block text-[13.5px] font-bold">Nombre</span>
              <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-[13.5px] font-bold">Negocio</span>
              <input className="input" required value={business} onChange={(e) => setBusiness(e.target.value)} />
            </label>
            <label className="mb-3 block">
              <span className="mb-1 block text-[13.5px] font-bold">Email</span>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-[13.5px] font-bold">Membresía (días)</span>
              <input
                className="input"
                type="number"
                min={1}
                max={730}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </label>
            {error && (
              <p className="mb-3 text-[13.5px] font-bold" style={{ color: "var(--danger-500)" }} role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={close} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn-navy" disabled={loading}>
                {loading ? "Creando…" : "Crear e invitar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
