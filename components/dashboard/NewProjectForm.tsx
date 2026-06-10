"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NewProjectForm({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [business, setBusiness] = useState("");
  const [title, setTitle] = useState("Mes 1 — Arquitectura");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isAdmin ? { clientName, business, title } : { title },
        ),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo crear el proyecto");
      }
      const { id } = await res.json();
      router.push(`/project/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-5 w-5" strokeWidth={2} /> Nuevo Mes 1
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,17,48,0.5)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Nuevo proyecto"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md animate-enter-fade rounded-2xl bg-white p-6 shadow-pop"
      >
        <p className="eyebrow mb-1.5">Proyectos</p>
        <h2 className="mb-5 text-[20px] font-extrabold text-navy-900">
          Nuevo proyecto (Mes 1)
        </h2>
        {isAdmin && (
          <>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13.5px] font-bold text-navy-900">
                Nombre del cliente
              </span>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="field"
                placeholder="Ej: Laura Méndez"
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-[13.5px] font-bold text-navy-900">
                Negocio
              </span>
              <input
                required
                value={business}
                onChange={(e) => setBusiness(e.target.value)}
                className="field"
                placeholder="Ej: Estudio de pilates online"
              />
            </label>
          </>
        )}
        <label className="mb-6 block">
          <span className="mb-1.5 block text-[13.5px] font-bold text-navy-900">
            Título del proyecto
          </span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="field"
          />
        </label>
        {error && (
          <p className="mb-4 text-[13.5px] font-bold text-danger-500" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="navy" disabled={loading}>
            {loading && (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} />
            )}
            {loading ? "Creando…" : "Crear proyecto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
