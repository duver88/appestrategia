"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Save, History, Eye, PencilLine, RotateCcw } from "lucide-react";

interface Version {
  version: number;
  isActive: boolean;
  content: string;
  createdAt: string;
}

export function PromptEditor({ phaseId }: { phaseId: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [content, setContent] = useState("");
  const [view, setView] = useState<"edit" | "preview" | "history">("edit");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/prompts/${phaseId}`);
    if (!res.ok) {
      setMsg("Plantilla no encontrada en DB (corre el seed de prompts)");
      return;
    }
    const data: Version[] = await res.json();
    setVersions(data);
    const active = data.find((v) => v.isActive) ?? data[0];
    setContent(active?.content ?? "");
    setDirty(false);
  }, [phaseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/prompts/${phaseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", content }),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(
      res.ok
        ? `Guardado como versión ${body.version} (activa desde el siguiente mensaje)`
        : (body?.error ?? "Error al guardar"),
    );
    setBusy(false);
    void load();
  }

  async function activate(version: number) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/prompts/${phaseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate", version }),
    });
    setMsg(res.ok ? `Versión ${version} restaurada como activa` : "Error al restaurar");
    setBusy(false);
    void load();
  }

  const activeVersion = versions.find((v) => v.isActive)?.version;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className={view === "edit" ? "btn-navy" : "btn-ghost"}
          onClick={() => setView("edit")}
        >
          <PencilLine className="h-4 w-4" /> Editar
        </button>
        <button
          className={view === "preview" ? "btn-navy" : "btn-ghost"}
          onClick={() => setView("preview")}
        >
          <Eye className="h-4 w-4" /> Preview
        </button>
        <button
          className={view === "history" ? "btn-navy" : "btn-ghost"}
          onClick={() => setView("history")}
        >
          <History className="h-4 w-4" /> Historial ({versions.length})
        </button>
        <div className="flex-1" />
        <button className="btn-primary" onClick={save} disabled={busy || !dirty}>
          <Save className="h-4 w-4" />
          {busy ? "Guardando…" : `Guardar como v${(versions[0]?.version ?? 0) + 1}`}
        </button>
      </div>

      {msg && (
        <p className="card px-4 py-3 text-[13.5px] font-bold" role="status">
          {msg}
        </p>
      )}

      {view === "edit" && (
        <textarea
          className="input min-h-[480px] w-full font-mono text-[13px] leading-relaxed"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setDirty(true);
          }}
          spellCheck={false}
          aria-label="Contenido del prompt"
        />
      )}

      {view === "preview" && (
        <div className="card chat-markdown p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}

      {view === "history" && (
        <div className="card overflow-hidden">
          <ul className="divide-y" style={{ borderColor: "var(--line-200)" }}>
            {versions.map((v) => (
              <li key={v.version} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-[14.5px] font-extrabold">
                    Versión {v.version}
                    {v.isActive && (
                      <span
                        className="ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide"
                        style={{ background: "var(--cyan-soft)", color: "var(--navy-900)" }}
                      >
                        Activa
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] font-semibold" style={{ color: "var(--ink-400)" }}>
                    {new Date(v.createdAt).toLocaleString("es")} ·{" "}
                    {v.content.length.toLocaleString("es")} caracteres
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setContent(v.content);
                      setDirty(v.version !== activeVersion);
                      setView("edit");
                    }}
                  >
                    Ver / editar
                  </button>
                  {!v.isActive && (
                    <button
                      className="btn-ghost"
                      disabled={busy}
                      onClick={() => activate(v.version)}
                    >
                      <RotateCcw className="h-4 w-4" /> Restaurar esta versión
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
