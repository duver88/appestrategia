"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  AlertTriangle,
  CircleDot,
  Circle,
  ChevronDown,
  FileText,
} from "lucide-react";
import { phasesForMode } from "@/lib/state-machine/phases";
import { SectionContent } from "@/components/chat/SectionContent";
import type { SectionDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type PhaseState = "approved" | "current" | "pending" | "review";

/**
 * Rail de progreso (elemento firma del sistema): sidebar navy con línea
 * vertical continua que conecta los nodos; el tramo recorrido va en cian.
 */
export function ProgressPanel({
  sections,
  currentPhase,
  projectStatus,
  projectId,
  mode = "MODO_1",
  clientName,
  projectTitle,
}: {
  sections: SectionDTO[];
  currentPhase: string;
  projectStatus: string;
  projectId: string;
  mode?: string;
  clientName?: string;
  projectTitle?: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const phases = phasesForMode(mode);

  const stateOf = (phaseId: string): PhaseState => {
    const section = sections.find((s) => s.phaseId === phaseId);
    if (section?.needsReview) return "review";
    if (section?.status === "APPROVED") return "approved";
    if (phaseId === currentPhase && projectStatus === "IN_PROGRESS")
      return "current";
    return "pending";
  };

  const approvedCount = sections.filter((s) => s.status === "APPROVED").length;
  const total = phases.length;
  const pct = Math.round((approvedCount / total) * 100);

  return (
    <nav aria-label="Progreso del proyecto" className="px-4 py-6">
      <div className="mb-6 rounded-2xl border border-navy-700 bg-navy-800/60 p-4">
        <p className="eyebrow eyebrow-on-navy mb-1.5">Tu sistema</p>
        {projectTitle && (
          <p className="mb-3 truncate text-[14.5px] font-bold text-white">
            {clientName ? `${clientName} · ` : ""}
            {projectTitle}
          </p>
        )}
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-navy-700">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-150 ease-snap"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[12px] font-bold">
          <span className="text-navy-300">
            {approvedCount} de {total} secciones
          </span>
          <span className="text-cyan-400">{pct}%</span>
        </div>
      </div>

      {projectStatus !== "IN_PROGRESS" && (
        <Link
          href={`/project/${projectId}/review`}
          className="mb-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-navy-800 text-[14.5px] font-extrabold text-white transition-colors duration-150 ease-snap hover:bg-navy-700"
        >
          <FileText className="h-4 w-4" strokeWidth={2} /> Ir a revisión final
        </Link>
      )}

      {mode === "MODO_2" && (
        <p className="mb-4 rounded-xl bg-navy-800 p-3 text-[12px] font-semibold leading-relaxed text-navy-300">
          Renovación mensual: la arquitectura se hereda del Mes 1. Este mes
          solo se construye el calendario nuevo.
        </p>
      )}

      <ul role="list">
        {phases.map((p, idx) => {
          const state = stateOf(p.id);
          const section = sections.find(
            (s) => s.phaseId === p.id && s.status === "APPROVED",
          );
          const isExpanded = expanded === p.id;
          const prevDone =
            idx > 0 && stateOf(phases[idx - 1].id) === "approved";
          const isLast = idx === phases.length - 1;
          return (
            <li key={p.id} className="relative">
              {/* Línea conectora: tramo superior de este nodo */}
              {idx > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-0 h-3 w-0.5",
                    prevDone ? "bg-cyan-400" : "bg-navy-700",
                  )}
                />
              )}
              {!isLast && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute bottom-0 left-[11px] top-9 w-0.5",
                    state === "approved" ? "bg-cyan-400" : "bg-navy-700",
                  )}
                />
              )}
              <button
                className={cn(
                  "relative flex w-full items-start gap-3 rounded-xl py-2.5 pl-0 pr-2 text-left transition-colors duration-150 ease-snap",
                  state === "current" &&
                    "border-l-[3px] border-cyan-400 bg-navy-800 pl-2",
                  state === "approved" && "hover:bg-navy-800",
                  state === "review" && "hover:bg-navy-800",
                  state === "pending" && "cursor-default opacity-70",
                )}
                onClick={() =>
                  section ? setExpanded(isExpanded ? null : p.id) : undefined
                }
                disabled={!section}
                aria-expanded={section ? isExpanded : undefined}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                  {state === "approved" && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400">
                      <Check className="h-3 w-3 text-navy-900" strokeWidth={3} />
                    </span>
                  )}
                  {state === "review" && (
                    <AlertTriangle className="h-[18px] w-[18px] text-warn-500" strokeWidth={2} />
                  )}
                  {state === "current" && (
                    <CircleDot
                      className="h-[18px] w-[18px] animate-pulse-cyan rounded-full text-cyan-400"
                      strokeWidth={2}
                    />
                  )}
                  {state === "pending" && (
                    <Circle className="h-[18px] w-[18px] text-navy-500" strokeWidth={2} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[14px] font-bold leading-snug",
                      state === "approved" || state === "current"
                        ? "text-white"
                        : state === "review"
                          ? "text-warn-500"
                          : "text-navy-300",
                    )}
                  >
                    {p.title}
                  </span>
                  <span className="block text-[11px] font-semibold text-navy-500">
                    {p.part}
                  </span>
                </span>
                {section && (
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-navy-500 transition-transform duration-150 ease-snap",
                      isExpanded && "rotate-180",
                    )}
                    strokeWidth={2}
                  />
                )}
              </button>
              {isExpanded && section && (
                <div className="mb-2 ml-9 animate-enter-fade rounded-xl bg-white p-3 text-xs shadow-card">
                  <SectionContent phaseId={p.id} data={section.data} compact />
                  <p className="mt-2 text-[11px] font-semibold text-ink-400">
                    v{section.version} · aprobada{" "}
                    {section.approvedAt
                      ? new Date(section.approvedAt).toLocaleDateString("es")
                      : ""}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
