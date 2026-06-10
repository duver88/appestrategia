"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

interface Branding {
  agencyName?: string;
  defaultBrandColor?: string;
}

interface Smtp {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
}

export function SettingsForm() {
  const [expiredText, setExpiredText] = useState("");
  const [branding, setBranding] = useState<Branding>({});
  const [smtp, setSmtp] = useState<Smtp>({});
  const [enforcement, setEnforcement] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((s) => {
        setExpiredText((s.expired_screen_text as string) ?? "");
        setBranding((s.branding as Branding) ?? {});
        setSmtp((s.smtp as Smtp) ?? {});
        setEnforcement(Boolean(s.membership_enforcement));
        setLoaded(true);
      });
  }, []);

  async function put(key: string, value: unknown) {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("No se pudo guardar");
  }

  async function saveAll() {
    setBusy(true);
    setMsg(null);
    try {
      await put("expired_screen_text", expiredText);
      await put("branding", branding);
      await put("smtp", smtp);
      await put("membership_enforcement", enforcement);
      setMsg("Configuración guardada");
    } catch {
      setMsg("Error al guardar la configuración");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <p className="text-[13.5px] font-semibold" style={{ color: "var(--ink-400)" }}>
        Cargando…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <p className="eyebrow mb-1">Membresías</p>
        <h2 className="mb-3 text-[16px] font-extrabold">Gate de membresía</h2>
        <label className="flex items-center gap-3 text-[14.5px] font-bold">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={enforcement}
            onChange={(e) => setEnforcement(e.target.checked)}
          />
          Bloquear clientes con membresía vencida o suspendida
        </label>
        <p className="mt-2 text-[12px] font-semibold" style={{ color: "var(--warn-500)" }}>
          Activar SOLO cuando todos los clientes tengan fecha de vencimiento
          (scripts/backfill-memberships.js lo hace automáticamente).
        </p>
      </section>

      <section className="card p-6">
        <p className="eyebrow mb-1">Textos</p>
        <h2 className="mb-3 text-[16px] font-extrabold">
          Pantalla de membresía vencida
        </h2>
        <textarea
          className="input min-h-[120px] w-full"
          value={expiredText}
          onChange={(e) => setExpiredText(e.target.value)}
          aria-label="Texto de membresía vencida"
        />
      </section>

      <section className="card p-6">
        <p className="eyebrow mb-1">Branding del PDF</p>
        <h2 className="mb-3 text-[16px] font-extrabold">Identidad de la agencia</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-bold">Nombre</span>
            <input
              className="input"
              value={branding.agencyName ?? ""}
              onChange={(e) => setBranding({ ...branding, agencyName: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13.5px] font-bold">
              Color de marca por defecto
            </span>
            <input
              type="color"
              className="input h-11 w-24 cursor-pointer p-1"
              value={branding.defaultBrandColor ?? "#1F3A5F"}
              onChange={(e) =>
                setBranding({ ...branding, defaultBrandColor: e.target.value })
              }
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <p className="eyebrow mb-1">Email (opcional)</p>
        <h2 className="mb-3 text-[16px] font-extrabold">SMTP</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Host"
            value={smtp.host ?? ""}
            onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
          />
          <input
            className="input"
            placeholder="Puerto"
            type="number"
            value={smtp.port ?? ""}
            onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })}
          />
          <input
            className="input"
            placeholder="Usuario"
            value={smtp.user ?? ""}
            onChange={(e) => setSmtp({ ...smtp, user: e.target.value })}
          />
          <input
            className="input"
            placeholder="Contraseña"
            type="password"
            value={smtp.pass ?? ""}
            onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })}
          />
          <input
            className="input sm:col-span-2"
            placeholder="Remitente (From)"
            value={smtp.from ?? ""}
            onChange={(e) => setSmtp({ ...smtp, from: e.target.value })}
          />
        </div>
      </section>

      {msg && (
        <p className="card px-4 py-3 text-[13.5px] font-bold" role="status">
          {msg}
        </p>
      )}
      <button className="btn-primary" onClick={saveAll} disabled={busy}>
        <Save className="h-4 w-4" />
        {busy ? "Guardando…" : "Guardar configuración"}
      </button>
    </div>
  );
}
