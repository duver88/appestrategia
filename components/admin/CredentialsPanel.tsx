"use client";

import { useCallback, useEffect, useState } from "react";
import { PlugZap, Save, CheckCircle2, XCircle } from "lucide-react";

interface Credential {
  provider: string;
  configured: boolean;
  maskedKey: string | null;
  baseUrl: string | null;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  envFallback: boolean;
}

interface PriceEntry {
  inputPerM: number;
  outputPerM: number;
}

const PROVIDER_LABEL: Record<string, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  deepseek: "DeepSeek",
  openai_compatible: "Compatible OpenAI (URL custom)",
};

export function CredentialsPanel() {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      fetch("/api/admin/credentials").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ]);
    setCreds(c);
    setSettings(s);
    setUrlInputs(
      Object.fromEntries(
        (c as Credential[]).map((x) => [x.provider, x.baseUrl ?? ""]),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(provider: string) {
    setBusy(provider);
    setMsg(null);
    const apiKey = keyInputs[provider]?.trim();
    const baseUrl =
      provider === "openai_compatible" ? urlInputs[provider]?.trim() || null : undefined;
    const res = await fetch("/api/admin/credentials", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        ...(apiKey ? { apiKey } : {}),
        ...(baseUrl !== undefined ? { baseUrl } : {}),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${PROVIDER_LABEL[provider]}: guardado (efecto inmediato)` : body?.error);
    setKeyInputs((k) => ({ ...k, [provider]: "" }));
    setBusy(null);
    void load();
  }

  async function test(provider: string) {
    setBusy(`test-${provider}`);
    setMsg(null);
    const res = await fetch("/api/admin/credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(`${PROVIDER_LABEL[provider]}: ${body?.message ?? "sin respuesta"}`);
    setBusy(null);
    void load();
  }

  async function saveDefaultModel(value: string) {
    setSettings((s) => ({ ...s, default_model: value }));
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "default_model", value }),
    });
    setMsg("Modelo por defecto guardado");
  }

  async function savePrice(model: string, field: keyof PriceEntry, value: number) {
    const table = { ...((settings.price_table as Record<string, PriceEntry>) ?? {}) };
    table[model] = { ...table[model], [field]: value };
    setSettings((s) => ({ ...s, price_table: table }));
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "price_table", value: table }),
    });
  }

  const priceTable = (settings.price_table as Record<string, PriceEntry>) ?? {};

  return (
    <div className="space-y-6">
      {msg && (
        <p className="card px-4 py-3 text-[13.5px] font-bold" role="status">
          {msg}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {creds.map((c) => (
          <div key={c.provider} className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Proveedor</p>
                <h2 className="text-[16px] font-extrabold">
                  {PROVIDER_LABEL[c.provider]}
                </h2>
              </div>
              {c.lastTestOk !== null &&
                (c.lastTestOk ? (
                  <CheckCircle2 className="h-5 w-5" style={{ color: "var(--green-500)" }} />
                ) : (
                  <XCircle className="h-5 w-5" style={{ color: "var(--danger-500)" }} />
                ))}
            </div>
            <p className="mb-3 text-[13.5px] font-semibold" style={{ color: "var(--ink-600)" }}>
              {c.configured ? (
                <>Key guardada: <span className="font-mono">{c.maskedKey}</span></>
              ) : c.envFallback ? (
                "Sin key en DB (usando fallback del .env)"
              ) : (
                "Sin configurar"
              )}
              {c.lastTestedAt && (
                <span className="block text-[12px]" style={{ color: "var(--ink-400)" }}>
                  Última prueba: {new Date(c.lastTestedAt).toLocaleString("es")}
                </span>
              )}
            </p>
            <input
              className="input mb-2"
              type="password"
              placeholder={c.configured ? "Nueva key (dejar vacío para conservar)" : "API key"}
              value={keyInputs[c.provider] ?? ""}
              onChange={(e) =>
                setKeyInputs((k) => ({ ...k, [c.provider]: e.target.value }))
              }
              autoComplete="off"
            />
            {c.provider === "openai_compatible" && (
              <input
                className="input mb-2"
                type="url"
                placeholder="Base URL (https://...)"
                value={urlInputs[c.provider] ?? ""}
                onChange={(e) =>
                  setUrlInputs((u) => ({ ...u, [c.provider]: e.target.value }))
                }
              />
            )}
            <div className="flex gap-2">
              <button
                className="btn-navy"
                disabled={busy !== null || (!keyInputs[c.provider]?.trim() && !c.configured)}
                onClick={() => save(c.provider)}
              >
                <Save className="h-4 w-4" />
                {busy === c.provider ? "Guardando…" : "Guardar"}
              </button>
              <button
                className="btn-ghost"
                disabled={busy !== null || (!c.configured && !c.envFallback)}
                onClick={() => test(c.provider)}
              >
                <PlugZap className="h-4 w-4" />
                {busy === `test-${c.provider}` ? "Probando…" : "Probar conexión"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <p className="eyebrow mb-1">Modelo por defecto global</p>
        <h2 className="mb-3 text-[16px] font-extrabold">
          Se aplica a los proyectos nuevos
        </h2>
        <select
          className="input max-w-sm"
          value={(settings.default_model as string) ?? ""}
          onChange={(e) => void saveDefaultModel(e.target.value)}
        >
          {Object.keys(priceTable).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto p-6">
        <p className="eyebrow mb-1">Tabla de precios</p>
        <h2 className="mb-4 text-[16px] font-extrabold">
          USD por millón de tokens (alimenta el cálculo de costos)
        </h2>
        <table className="w-full min-w-[480px]">
          <thead>
            <tr>
              <th className="th">Modelo</th>
              <th className="th">Entrada</th>
              <th className="th">Salida</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(priceTable).map(([model, p]) => (
              <tr key={model}>
                <td className="td font-mono text-[12.5px]">{model}</td>
                <td className="td">
                  <input
                    className="input h-9 w-24"
                    type="number"
                    step="0.01"
                    defaultValue={p.inputPerM}
                    onBlur={(e) => void savePrice(model, "inputPerM", Number(e.target.value))}
                    aria-label={`Precio de entrada de ${model}`}
                  />
                </td>
                <td className="td">
                  <input
                    className="input h-9 w-24"
                    type="number"
                    step="0.01"
                    defaultValue={p.outputPerM}
                    onBlur={(e) => void savePrice(model, "outputPerM", Number(e.target.value))}
                    aria-label={`Precio de salida de ${model}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
