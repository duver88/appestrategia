"use client";

import { useState } from "react";
import { Check, PencilLine, LoaderCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionContent } from "./SectionContent";
import { getPhase } from "@/lib/state-machine/phases";
import type { SectionDTO } from "@/lib/types";

export function ProposalCard({
  projectId,
  section,
  onApproved,
  onRequestChanges,
}: {
  projectId: string;
  section: SectionDTO;
  onApproved: (nextPhaseId: string | null, projectStatus: string) => void;
  onRequestChanges: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phase = getPhase(section.phaseId);

  // Gate de FOMO: el calendario no puede aprobarse sin confirmación explícita
  // del FOMO real (regla 4 del motor de fases).
  const fomoBlocked =
    section.phaseId === "fase_6" &&
    !(section.data as { fomo?: { confirmedByClient?: boolean } })?.fomo
      ?.confirmedByClient;

  async function approve() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sections/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, phaseId: section.phaseId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo aprobar la sección");
      }
      const { nextPhaseId, projectStatus } = await res.json();
      onApproved(nextPhaseId, projectStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="animate-enter-fade overflow-hidden rounded-2xl border border-line-200 border-t-[3px] border-t-cyan-400 bg-white shadow-card">
      <div className="flex items-start gap-3.5 px-4 pb-1 pt-4 md:px-6 md:pt-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 shadow-[0_2px_8px_rgba(2,17,48,0.18)]">
          <FileText className="h-5 w-5 text-cyan-400" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-1">
            Propuesta · {phase?.part ?? section.phaseId}
          </p>
          <h3 className="text-[20px] font-extrabold leading-tight text-navy-900">
            {phase?.title ?? section.phaseId}
          </h3>
        </div>
        {section.version > 1 && (
          <span className="shrink-0 rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-extrabold text-navy-700">
            v{section.version}
          </span>
        )}
      </div>
      <div className="max-h-[50vh] overflow-y-auto p-4 md:px-6">
        <SectionContent phaseId={section.phaseId} data={section.data} />
      </div>
      {error && (
        <p className="px-4 pb-2 text-[13.5px] font-bold text-danger-500 md:px-6" role="alert">
          {error}
        </p>
      )}
      {fomoBlocked && (
        <p className="px-4 pb-2 text-[13.5px] font-bold text-warn-500 md:px-6" role="alert">
          Para aprobar el calendario primero confirma en el chat el FOMO real
          del mes (semana 4).
        </p>
      )}
      <div className="sticky bottom-0 flex gap-2 border-t border-line-200 bg-white p-3 md:px-6">
        <Button
          className="flex-1"
          size="lg"
          onClick={approve}
          disabled={loading || fomoBlocked}
        >
          {loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" strokeWidth={2} />
          ) : (
            <Check className="h-5 w-5" strokeWidth={2} />
          )}
          {loading ? "Aprobando…" : "Aprobar y continuar"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={onRequestChanges}
          disabled={loading}
        >
          <PencilLine className="h-5 w-5" strokeWidth={2} />
          Pedir cambios
        </Button>
      </div>
    </div>
  );
}
