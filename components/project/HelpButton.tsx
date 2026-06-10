"use client";

import { useState } from "react";
import { LifeBuoy, Check } from "lucide-react";

export function HelpButton({
  projectId,
  initialRequested,
}: {
  projectId: string;
  initialRequested: boolean;
}) {
  const [requested, setRequested] = useState(initialRequested);
  const [loading, setLoading] = useState(false);

  async function requestHelp() {
    if (requested || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/help`, {
        method: "POST",
      });
      if (res.ok) setRequested(true);
    } finally {
      setLoading(false);
    }
  }

  if (requested) {
    return (
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-cyan-soft px-3 py-1.5 text-[12px] font-bold text-navy-700">
        <Check className="h-3.5 w-3.5" strokeWidth={2} /> Aviso enviado
      </span>
    );
  }
  return (
    <button
      onClick={requestHelp}
      disabled={loading}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line-200 px-3 text-[12px] font-extrabold text-navy-900 transition-colors duration-150 ease-snap hover:bg-surface-50"
      title="Avisar al equipo de LIONSCORE que necesitas ayuda de una persona"
    >
      <LifeBuoy className="h-4 w-4" strokeWidth={2} />
      <span className="hidden sm:inline">Ayuda</span>
    </button>
  );
}
