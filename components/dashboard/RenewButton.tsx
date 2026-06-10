"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RenewButton({ parentId }: { parentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function renew() {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const month = now.toLocaleDateString("es", {
        month: "long",
        year: "numeric",
      });
      const res = await fetch("/api/projects/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          title: `Renovación — Calendario ${month}`,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo crear la renovación");
      }
      const { id } = await res.json();
      router.push(`/project/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={renew}
        disabled={loading}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {loading ? "Creando…" : "Renovación mensual"}
      </Button>
      {error && (
        <p className="mt-1 text-[12px] font-bold text-danger-500">{error}</p>
      )}
    </div>
  );
}
