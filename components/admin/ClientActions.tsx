"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Ban, RotateCcw, KeyRound, Trash2 } from "lucide-react";

export function ClientActions({
  clientId,
  status,
  membershipExpiresAt,
}: {
  clientId: string;
  status: string;
  membershipExpiresAt: string | null;
}) {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(0);

  async function call(
    label: string,
    fn: () => Promise<Response>,
    okMsg: (body: { tempPassword?: string; membershipExpiresAt?: string }) => string,
  ) {
    setBusy(label);
    setMsg(null);
    try {
      const res = await fn();
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Operación fallida");
      setMsg(okMsg(body));
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setBusy(null);
    }
  }

  const patch = (data: object) =>
    fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

  async function remove() {
    // Doble confirmación antes del borrado en cascada.
    if (confirmDelete < 2) {
      setConfirmDelete(confirmDelete + 1);
      return;
    }
    await call(
      "delete",
      () => fetch(`/api/admin/clients/${clientId}`, { method: "DELETE" }),
      () => "Cliente eliminado",
    );
    router.push("/admin/clients");
  }

  return (
    <section className="card p-6">
      <p className="eyebrow mb-4">Acciones</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input w-24"
            min={1}
            max={730}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Días a extender"
          />
          <button
            className="btn-navy"
            disabled={busy !== null}
            onClick={() =>
              call("extend", () => patch({ extendDays: days }), (b) =>
                `Membresía extendida hasta ${new Date(b.membershipExpiresAt!).toLocaleDateString("es")}`,
              )
            }
          >
            <CalendarPlus className="h-4 w-4" /> Extender membresía
          </button>
        </div>

        {status === "SUSPENDED" ? (
          <button
            className="btn-ghost"
            disabled={busy !== null}
            onClick={() =>
              call("reactivate", () => patch({ status: "ACTIVE" }), () => "Cliente reactivado")
            }
          >
            <RotateCcw className="h-4 w-4" /> Reactivar
          </button>
        ) : (
          <button
            className="btn-ghost"
            disabled={busy !== null}
            onClick={() =>
              call("suspend", () => patch({ status: "SUSPENDED" }), () => "Cliente suspendido")
            }
          >
            <Ban className="h-4 w-4" /> Suspender
          </button>
        )}

        <button
          className="btn-ghost"
          disabled={busy !== null}
          onClick={() =>
            call(
              "reset",
              () =>
                fetch(`/api/admin/clients/${clientId}/reset-password`, {
                  method: "POST",
                }),
              (b) => `Contraseña temporal: ${b.tempPassword} (se muestra una sola vez)`,
            )
          }
        >
          <KeyRound className="h-4 w-4" /> Resetear contraseña
        </button>

        <button className="btn-danger" disabled={busy !== null} onClick={remove}>
          <Trash2 className="h-4 w-4" />
          {confirmDelete === 0
            ? "Eliminar"
            : confirmDelete === 1
              ? "¿Seguro? Borra TODO"
              : "Confirmar borrado definitivo"}
        </button>
      </div>
      {membershipExpiresAt === null && (
        <p className="mt-3 text-[12px] font-semibold" style={{ color: "var(--warn-500)" }}>
          Este cliente no tiene fecha de membresía: corre el backfill o extiéndela aquí.
        </p>
      )}
      {msg && (
        <p className="mt-3 text-[13.5px] font-bold" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}
