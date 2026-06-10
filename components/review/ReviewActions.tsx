"use client";

import { useState } from "react";
import { FileDown, LoaderCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = ["#1F3A5F", "#2E7D52", "#6B4FA0", "#C0392B", "#B8860B", "#1B1B1B"];

const PROGRESS_MESSAGES = [
  "Componiendo el documento…",
  "Maquetando portada e índice…",
  "Renderizando el calendario…",
  "Aplicando diseño editorial…",
];

/** Selector de color + generación del PDF. Vive dentro del header navy. */
export function ReviewActions({
  projectId,
  initialColor,
  ready,
}: {
  projectId: string;
  initialColor: string;
  ready: boolean;
}) {
  const [color, setColor] = useState(initialColor);
  const [generating, setGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MESSAGES[0]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % PROGRESS_MESSAGES.length;
      setProgressMsg(PROGRESS_MESSAGES[i]);
    }, 2500);
    try {
      // Guardar el color de marca antes de renderizar.
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandColor: color }),
      });
      const res = await fetch(`/api/pdf/${projectId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo generar el PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LIONSCORE-sistema-${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      clearInterval(interval);
      setGenerating(false);
    }
  }

  return (
    <div>
      <p className="eyebrow eyebrow-on-navy mb-3">Color de marca del documento</p>
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-150 ease-snap",
              color === c
                ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-navy-900"
                : "hover:scale-105",
            )}
            style={{ backgroundColor: c }}
          >
            {color === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-2 text-[12px] font-bold text-navy-300">
          Personalizado
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-12 cursor-pointer rounded-xl border border-navy-700 bg-transparent p-1"
            aria-label="Color personalizado"
          />
        </label>
      </div>

      {error && (
        <p className="mb-3 text-[13.5px] font-bold text-danger-500" role="alert">
          {error}
        </p>
      )}
      {!ready && (
        <p className="mb-3 text-[13.5px] font-bold text-warn-500">
          Faltan secciones por aprobar: el PDF se habilita cuando todas estén
          listas.
        </p>
      )}

      <button
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-400 px-6 text-[14.5px] font-extrabold text-navy-900 transition-all duration-150 ease-snap hover:brightness-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
        disabled={!ready || generating}
        onClick={generate}
      >
        {generating ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" strokeWidth={2} />{" "}
            {progressMsg}
          </>
        ) : (
          <>
            <FileDown className="h-5 w-5" strokeWidth={2} /> Generar PDF final
          </>
        )}
      </button>
    </div>
  );
}
