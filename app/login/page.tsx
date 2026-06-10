import { Suspense } from "react";
import { Check, CircleDot, Circle, ShieldCheck, CloudUpload, FileText } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Iniciar sesión — LIONSCORE" };

// Rail decorativo: refleja el producto real (fases del sistema).
const DECOR = [
  { label: "Posicionamiento", state: "done" },
  { label: "Promesa y método", state: "done" },
  { label: "Matriz de 30 hooks", state: "done" },
  { label: "Calendario de 31 días", state: "active" },
  { label: "PDF editorial final", state: "pending" },
] as const;

const TRUST = [
  { icon: CloudUpload, text: "Todo queda guardado, siempre" },
  { icon: ShieldCheck, text: "Nada avanza sin tu aprobación" },
  { icon: FileText, text: "Termina en un documento editorial" },
] as const;

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr,1fr]">
      {/* Panel navy */}
      <section
        className="navy-glow relative hidden flex-col justify-between overflow-hidden p-14 lg:flex"
        aria-hidden
      >
        <p className="text-[16px] font-black tracking-tight text-white">
          LIONSCORE<span className="text-cyan-400">·</span>
        </p>

        <div className="max-w-xl">
          <p className="eyebrow eyebrow-on-navy mb-4">
            Marca personal · Contenido · Ventas
          </p>
          <h1 className="mb-5 text-[46px] font-black leading-[1.08] tracking-[-0.02em] text-white">
            Tu estrategia completa,
            <br />
            construida{" "}
            <span className="relative whitespace-nowrap">
              contigo
              <span className="absolute inset-x-0 -bottom-1 h-[5px] rounded-full bg-cyan-400/80" />
            </span>
            .
          </h1>
          <p className="mb-10 max-w-md text-[15.5px] leading-[1.7] text-navy-300">
            Una conversación guiada, fase por fase: tú respondes sobre tu
            negocio, apruebas cada pieza, y el sistema termina en tu documento
            de estrategia listo para ejecutar.
          </p>

          {/* Rail del producto */}
          <ul className="space-y-0">
            {DECOR.map((p, i) => (
              <li key={p.label} className="relative flex items-center gap-3.5 py-[7px]">
                {i > 0 && (
                  <span
                    className={`absolute left-[10px] top-[-8px] h-[16px] w-0.5 ${
                      DECOR[i - 1].state === "done" ? "bg-cyan-400" : "bg-navy-700"
                    }`}
                  />
                )}
                <span className="z-10 flex h-[21px] w-[21px] shrink-0 items-center justify-center">
                  {p.state === "done" && (
                    <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-cyan-400">
                      <Check className="h-3 w-3 text-navy-900" strokeWidth={3.5} />
                    </span>
                  )}
                  {p.state === "active" && (
                    <CircleDot className="h-[21px] w-[21px] animate-pulse-cyan rounded-full text-cyan-400" strokeWidth={2} />
                  )}
                  {p.state === "pending" && (
                    <Circle className="h-[19px] w-[19px] text-navy-500" strokeWidth={2} />
                  )}
                </span>
                <span
                  className={`text-[14.5px] font-bold ${
                    p.state === "pending"
                      ? "text-navy-500"
                      : p.state === "active"
                        ? "text-white"
                        : "text-navy-300"
                  }`}
                >
                  {p.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-7 border-t border-navy-700 pt-6">
          {TRUST.map(({ icon: Icon, text }) => (
            <span key={text} className="flex items-center gap-2 text-[12.5px] font-bold text-navy-300">
              <Icon className="h-4 w-4 text-cyan-400" strokeWidth={2} />
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* Panel blanco: formulario */}
      <section className="flex items-center justify-center bg-white px-5 py-12">
        <div className="w-full max-w-[400px]">
          <p className="mb-10 text-[22px] font-black tracking-tight text-navy-900 lg:hidden">
            LIONSCORE<span className="text-cyan-400">·</span>
          </p>
          <p className="eyebrow mb-2.5">Acceso de clientes</p>
          <h2 className="mb-2 text-[30px] font-black leading-[1.15] tracking-[-0.02em] text-navy-900">
            Inicia sesión
          </h2>
          <p className="mb-9 text-[14.5px] font-semibold leading-relaxed text-ink-600">
            Retoma tu sistema exactamente donde lo dejaste.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
          <p className="mt-8 border-t border-line-200 pt-6 text-center text-[12.5px] font-semibold text-ink-400">
            ¿Aún no tienes acceso? Escríbele a tu contacto de LIONSCORE.
          </p>
        </div>
      </section>
    </main>
  );
}
