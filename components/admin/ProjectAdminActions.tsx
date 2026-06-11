"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, Undo2, Archive, ArchiveRestore, CheckCheck } from "lucide-react";

const MODEL_OPTIONS = [
  "anthropic:claude-sonnet-4-5",
  "anthropic:claude-opus-4-8",
  "anthropic:claude-haiku-4-5",
  "openai:gpt-4o",
  "openai:gpt-4o-mini",
  "deepseek:deepseek-chat",
];

export function ProjectAdminActions({
  projectId,
  modelProvider,
  caraVisible,
  archived,
  helpRequested,
  approvedPhases,
  pdfReady,
}: {
  projectId: string;
  modelProvider: string;
  caraVisible: string | null;
  archived: boolean;
  helpRequested: boolean;
  approvedPhases: Array<{ id: string; title: string }>;
  pdfReady: boolean;
}) {
  const router = useRouter();
  const [model, setModel] = useState(modelProvider);
  const [cara, setCara] = useState(caraVisible ?? "");
  const [rollbackPhase, setRollbackPhase] = useState("");
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function patch(data: object, okMsg: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(res.ok ? okMsg : (body?.error ?? "Operación fallida"));
    setBusy(false);
    router.refresh();
  }

  async function rollback() {
    if (!rollbackPhase) return;
    if (!confirmRollback) {
      setConfirmRollback(true);
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/projects/${projectId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId: rollbackPhase }),
    });
    const body = await res.json().catch(() => ({}));
    setMsg(
      res.ok
        ? `Fase ${rollbackPhase} retrocedida a borrador`
        : (body?.error ?? "Operación fallida"),
    );
    setConfirmRollback(false);
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="card p-6">
      <p className="eyebrow mb-4">Control del proyecto</p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-[13.5px] font-bold">Modelo</span>
          <select
            className="input w-64"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {[...new Set([modelProvider, ...MODEL_OPTIONS])].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-navy"
          disabled={busy || model === modelProvider}
          onClick={() => patch({ modelProvider: model }, "Modelo actualizado")}
        >
          Cambiar modelo
        </button>

        <a className="btn-ghost" href={`/api/pdf/${projectId}`} aria-disabled={!pdfReady}>
          <FileDown className="h-4 w-4" /> Regenerar PDF
        </a>

        <label className="flex items-center gap-2">
          <span className="text-[13.5px] font-bold">Cara visible</span>
          <input
            className="input w-52"
            placeholder="Nombre (portada PDF)"
            value={cara}
            maxLength={80}
            onChange={(e) => setCara(e.target.value)}
          />
        </label>
        <button
          className="btn-ghost"
          disabled={busy || cara === (caraVisible ?? "")}
          onClick={() =>
            patch(
              { caraVisible: cara.trim() === "" ? null : cara.trim() },
              "Cara visible actualizada",
            )
          }
        >
          Guardar
        </button>

        {helpRequested && (
          <button
            className="btn-ghost"
            disabled={busy}
            onClick={() => patch({ helpResolved: true }, "Solicitud de ayuda resuelta")}
          >
            <CheckCheck className="h-4 w-4" /> Marcar ayuda resuelta
          </button>
        )}

        <button
          className="btn-ghost"
          disabled={busy}
          onClick={() =>
            patch(
              { archived: !archived },
              archived ? "Proyecto desarchivado" : "Proyecto archivado",
            )
          }
        >
          {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {archived ? "Desarchivar" : "Archivar"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: "var(--line-200)" }}>
        <span className="text-[13.5px] font-bold">Retroceder fase</span>
        <select
          className="input w-64"
          value={rollbackPhase}
          onChange={(e) => {
            setRollbackPhase(e.target.value);
            setConfirmRollback(false);
          }}
        >
          <option value="">Elegir fase aprobada…</option>
          {approvedPhases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <button className="btn-danger" disabled={busy || !rollbackPhase} onClick={rollback}>
          <Undo2 className="h-4 w-4" />
          {confirmRollback ? "Confirmar: vuelve a borrador" : "Retroceder"}
        </button>
      </div>

      {msg && (
        <p className="mt-3 text-[13.5px] font-bold" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}
