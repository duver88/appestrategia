"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeft, X, CloudUpload } from "lucide-react";
import { useUIStore } from "@/lib/store";
import { ProgressPanel } from "@/components/progress/ProgressPanel";
import { HelpButton } from "@/components/project/HelpButton";
import { Chat } from "@/components/chat/Chat";
import { getPhase } from "@/lib/state-machine/phases";
import type { MessageDTO, SectionDTO } from "@/lib/types";

export interface ProjectInfo {
  id: string;
  title: string;
  status: string;
  currentPhase: string;
  clientName: string;
  mode: string;
  helpRequested: boolean;
}

export function ProjectView({
  project,
  initialMessages,
  initialSections,
}: {
  project: ProjectInfo;
  initialMessages: MessageDTO[];
  initialSections: SectionDTO[];
}) {
  const { drawerOpen, setDrawerOpen, lastSavedAt } = useUIStore();
  const [sections, setSections] = useState<SectionDTO[]>(initialSections);
  const [currentPhase, setCurrentPhase] = useState(project.currentPhase);
  const [projectStatus, setProjectStatus] = useState(project.status);
  const [showSaved, setShowSaved] = useState(false);

  const refreshSections = useCallback(async () => {
    try {
      const res = await fetch(`/api/sections?projectId=${project.id}`);
      if (res.ok) {
        setSections(await res.json());
        useUIStore.getState().markSaved();
      }
    } catch {
      // silencioso: el siguiente refresh lo recupera
    }
  }, [project.id]);

  useEffect(() => {
    if (!lastSavedAt) return;
    setShowSaved(true);
    const t = setTimeout(() => setShowSaved(false), 2000);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  const phase = getPhase(currentPhase);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white">
      {/* Topbar blanca sticky */}
      <header className="relative flex h-[60px] shrink-0 items-center gap-3 border-b border-line-200 bg-white px-3 md:px-5">
        <button
          className="rounded-xl p-2 text-navy-900 hover:bg-surface-50 lg:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir panel de progreso"
        >
          <PanelLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <Link
          href="/dashboard"
          className="shrink-0 text-[17px] font-black tracking-tight text-navy-900"
          aria-label="Volver a proyectos"
        >
          LIONSCORE<span className="text-cyan-400">·</span>
        </Link>
        <span className="hidden items-center gap-3 lg:flex" aria-hidden>
          <span className="h-4 w-px bg-line-200" />
          <span className="max-w-[220px] truncate text-[12.5px] font-semibold text-ink-400">
            {project.clientName} · {project.title}
          </span>
        </span>

        {/* Chip de fase: centrado real respecto a la ventana, no al flex */}
        {phase && projectStatus === "IN_PROGRESS" && (
          <span className="absolute left-1/2 hidden max-w-[40%] -translate-x-1/2 truncate rounded-full bg-cyan-soft px-3.5 py-1.5 text-[12px] font-bold text-navy-700 md:block">
            {phase.title}
          </span>
        )}
        <div className="min-w-0 flex-1" />

        <span
          aria-live="polite"
          className={`hidden shrink-0 items-center gap-1.5 text-[12px] font-semibold text-ink-400 transition-opacity duration-150 ease-snap sm:flex ${showSaved ? "opacity-100" : "opacity-0"}`}
        >
          <CloudUpload className="h-4 w-4" strokeWidth={2} /> Guardado
        </span>
        <HelpButton
          projectId={project.id}
          initialRequested={project.helpRequested}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Rail de progreso — desktop */}
        <aside className="navy-glow on-navy hidden w-[300px] shrink-0 overflow-y-auto lg:block">
          <ProgressPanel
            sections={sections}
            currentPhase={currentPhase}
            projectStatus={projectStatus}
            projectId={project.id}
            mode={project.mode}
            clientName={project.clientName}
            projectTitle={project.title}
          />
        </aside>

        {/* Drawer móvil */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(2,17,48,0.5)" }}
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="navy-glow on-navy absolute inset-y-0 left-0 w-[320px] max-w-[85vw] animate-enter-fade overflow-y-auto shadow-pop">
              <div className="flex items-center justify-between px-5 pt-4">
                <span className="text-[15px] font-black text-white">
                  LIONSCORE<span className="text-cyan-400">·</span>
                </span>
                <button
                  className="rounded-xl p-2 text-navy-300 hover:bg-navy-800"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar panel"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <ProgressPanel
                sections={sections}
                currentPhase={currentPhase}
                projectStatus={projectStatus}
                projectId={project.id}
                mode={project.mode}
                clientName={project.clientName}
                projectTitle={project.title}
              />
            </div>
          </div>
        )}

        {/* Chat */}
        <main className="flex min-w-0 flex-1 flex-col">
          <Chat
            projectId={project.id}
            initialMessages={initialMessages}
            sections={sections}
            currentPhase={currentPhase}
            projectStatus={projectStatus}
            onSectionsChanged={refreshSections}
            onPhaseAdvanced={(nextPhaseId, status) => {
              if (nextPhaseId) setCurrentPhase(nextPhaseId);
              setProjectStatus(status);
            }}
          />
        </main>
      </div>
    </div>
  );
}
