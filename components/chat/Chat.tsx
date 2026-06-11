"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { MessageBubble, TypingIndicator } from "./MessageBubble";
import { ProposalCard } from "./ProposalCard";
import { Button } from "@/components/ui/button";
import { getPhase } from "@/lib/state-machine/phases";
import { rejectedToolErrors } from "@/lib/chat-tools";
import { cn } from "@/lib/utils";
import type { MessageDTO, SectionDTO } from "@/lib/types";

const APPROVAL_MESSAGE = "He aprobado la sección. Continuemos con la siguiente fase.";

function toUIMessages(messages: MessageDTO[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
    metadata: { createdAt: m.createdAt },
  }));
}

function timeOf(message: UIMessage): string | null {
  const iso = (message.metadata as { createdAt?: string } | undefined)
    ?.createdAt;
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export function Chat({
  projectId,
  initialMessages,
  sections,
  currentPhase,
  projectStatus,
  onSectionsChanged,
  onPhaseAdvanced,
}: {
  projectId: string;
  initialMessages: MessageDTO[];
  sections: SectionDTO[];
  currentPhase: string;
  projectStatus: string;
  onSectionsChanged: () => void;
  onPhaseAdvanced: (nextPhaseId: string | null, status: string) => void;
}) {
  const [input, setInput] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  // Confirmación elegante tras aprobar (desaparece al llegar la transición).
  const [justApproved, setJustApproved] = useState<string | null>(null);
  // Progreso del calendario por semanas (data parts del servidor).
  const [calProgress, setCalProgress] = useState<{
    semana: number;
    de: number;
    estado: string;
    detalle?: string;
  } | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [showNewBtn, setShowNewBtn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `lionscore-draft-${projectId}`;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, trigger }) => {
          const last = messages[messages.length - 1];
          // En reintentos (regenerate) el mensaje ya está persistido en DB:
          // se envía vacío para no duplicarlo.
          const message =
            trigger === "submit-message" && last?.role === "user"
              ? textOf(last)
              : "";
          return { body: { projectId, message } };
        },
      }),
    [projectId],
  );

  const { messages, sendMessage, status, error, regenerate } = useChat({
    id: projectId,
    transport,
    messages: toUIMessages(initialMessages),
    // Máx ~10 renders/seg durante el streaming (el tab nunca se satura).
    experimental_throttle: 100,
    onData: (part) => {
      if (part.type === "data-fase6-progress") {
        const p = part.data as {
          semana: number;
          de: number;
          estado: string;
          detalle?: string;
        };
        setCalProgress(p);
        // El borrador ya está en DB: mostrar la tarjeta sin esperar al cierre.
        if (p.estado === "listo") onSectionsChanged();
      }
    },
    onFinish: () => {
      onSectionsChanged();
      setJustApproved(null);
      setCalProgress(null);
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Borrador del input en localStorage (única excepción de almacenamiento local).
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) setInput(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);
  useEffect(() => {
    if (input) localStorage.setItem(draftKey, input);
    else localStorage.removeItem(draftKey);
  }, [input, draftKey]);

  // Auto-scroll inteligente
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(isAtBottom);
    if (isAtBottom) setShowNewBtn(false);
  }, []);

  useEffect(() => {
    if (atBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      setShowNewBtn(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);

  const draftSection = sections.find(
    (s) => s.phaseId === currentPhase && s.status === "DRAFT",
  );
  // Hotfix edición: un mensaje sin texto pero con una tool RECHAZADA también
  // es visible — el usuario jamás se queda con la card vieja y silencio.
  const visibleMessages = messages.filter(
    (m) => textOf(m).trim().length > 0 || rejectedToolErrors(m).length > 0,
  );
  const phaseInfo = getPhase(currentPhase);

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setHint(null);
    localStorage.removeItem(draftKey);
    void sendMessage({ text });
  }

  function handleApproved(nextPhaseId: string | null, newStatus: string) {
    setJustApproved(phaseInfo?.title ?? null);
    onPhaseAdvanced(nextPhaseId, newStatus);
    onSectionsChanged();
    if (nextPhaseId && newStatus === "IN_PROGRESS") {
      // Mensaje de transición: la IA abre la fase siguiente automáticamente.
      void sendMessage({ text: APPROVAL_MESSAGE });
    }
  }

  function adjustTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // 5 líneas de 24px + padding vertical (py-3 = 24px)
    el.style.height = `${Math.min(el.scrollHeight, 5 * 24 + 24)}px`;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-white">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-canvas min-h-0 flex-1 overflow-y-auto px-4 md:px-8"
        aria-live="polite"
      >
        {/* min-h-full + mt-auto: la conversación vive ANCLADA ABAJO, junto al
            input — nunca flotando arriba con un vacío en medio. */}
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          <div className="mt-auto flex flex-col gap-4 py-6">
          {/* Estado vacío: nunca un lienzo en blanco */}
          {visibleMessages.length === 0 &&
            !busy &&
            !draftSection &&
            projectStatus === "IN_PROGRESS" && (
              <div className="flex animate-enter-fade flex-col items-center gap-5 pb-8 pt-4 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 shadow-card">
                  <Sparkles className="h-6 w-6 text-cyan-400" strokeWidth={2} />
                </span>
                <div>
                  <p className="eyebrow mb-2.5">
                    {phaseInfo ? `${phaseInfo.part} · ${phaseInfo.title}` : "Tu sistema"}
                  </p>
                  <h2 className="text-[22px] font-extrabold leading-tight text-navy-900">
                    Construyamos tu sistema, paso a paso
                  </h2>
                  <p className="mx-auto mt-2.5 max-w-md text-[14.5px] font-semibold leading-relaxed text-ink-600">
                    Te haré preguntas simples, una a la vez. Tú apruebas cada
                    pieza y todo queda guardado. Pulsa «Empecemos» o escribe
                    abajo cuando quieras.
                  </p>
                </div>
              </div>
            )}

          {/* Separador editorial: la fase a la que pertenece la conversación */}
          {visibleMessages.length > 0 && phaseInfo && (
            <div className="flex items-center gap-3 pb-1 pt-2">
              <span className="h-px flex-1 bg-line-200" />
              <span className="eyebrow whitespace-nowrap">
                {phaseInfo.part} · {phaseInfo.title}
              </span>
              <span className="h-px flex-1 bg-line-200" />
            </div>
          )}

          {/* Mensajes agrupados por emisor (avatar solo en el primero) */}
          <div className="flex flex-col">
            {visibleMessages.map((m, i) => {
              const prev = visibleMessages[i - 1];
              const sameAsPrev = prev?.role === m.role;
              const rechazos = m.role === "user" ? [] : rejectedToolErrors(m);
              return (
                <div key={m.id} className={i === 0 ? "" : sameAsPrev ? "mt-1.5" : "mt-5"}>
                  {textOf(m).trim().length > 0 && (
                    <MessageBubble
                      role={m.role === "user" ? "user" : "assistant"}
                      text={textOf(m)}
                      showAvatar={m.role !== "user" && !sameAsPrev}
                      time={timeOf(m)}
                    />
                  )}
                  {/* Cinturón del hotfix de edición: el rechazo de una tool
                      SIEMPRE es visible — nunca card vieja en silencio. */}
                  {rechazos.length > 0 && (
                    <div
                      className="mt-2 flex items-start gap-2.5 rounded-2xl border border-line-200 bg-[rgba(245,165,36,0.10)] p-3.5"
                      role="alert"
                    >
                      <AlertTriangle
                        className="mt-0.5 h-4 w-4 shrink-0 text-warn-500"
                        strokeWidth={2}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-extrabold text-navy-900">
                          El cambio no se aplicó
                        </p>
                        <ul className="mt-1 space-y-1 text-[12.5px] font-semibold leading-relaxed text-ink-600">
                          {rechazos.slice(0, 3).map((e, k) => (
                            <li key={k}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {justApproved && (
            <div className="flex animate-enter-fade items-center gap-2.5 self-center rounded-full border border-line-200 bg-white py-1.5 pl-2 pr-4 shadow-card">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400">
                <Check className="h-3.5 w-3.5 text-navy-900" strokeWidth={3} />
              </span>
              <span className="text-[12.5px] font-bold text-navy-900">
                {justApproved} aprobada
              </span>
            </div>
          )}

          {status === "submitted" && <TypingIndicator />}

          {/* Progreso del calendario por semanas — nunca pantalla muda */}
          {calProgress && busy && (
            <div className="animate-enter-fade rounded-2xl border border-line-200 border-t-[3px] border-t-cyan-400 bg-white p-5 shadow-card">
              <p className="eyebrow mb-2.5">
                Calendario · Semana {Math.min(calProgress.semana, 4)} de {calProgress.de}
              </p>
              <p className="text-[16px] font-extrabold text-navy-900">
                {calProgress.estado === "generando" &&
                  `Construyendo semana ${calProgress.semana} de ${calProgress.de}…`}
                {calProgress.estado === "validando" &&
                  `Verificando las reglas de la semana ${calProgress.semana}…`}
                {calProgress.estado === "reintentando" &&
                  `Ajustando la semana ${calProgress.semana} para cumplir las reglas…`}
                {calProgress.estado === "ensamblando" && "Ensamblando el mes completo…"}
                {calProgress.estado === "listo" && "Calendario listo: preparando la propuesta…"}
                {calProgress.estado === "error" &&
                  `No se pudo completar la semana ${calProgress.semana}.`}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4].map((w) => {
                  const done =
                    calProgress.estado === "listo" || w < calProgress.semana;
                  const active = !done && w === calProgress.semana;
                  return (
                    <span key={w} className="flex flex-1 items-center gap-2">
                      <span
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 rounded-full",
                          done && "bg-cyan-400",
                          active &&
                            calProgress.estado !== "error" &&
                            "animate-pulse-cyan border-2 border-cyan-400 bg-white",
                          active && calProgress.estado === "error" && "bg-danger-500",
                          !done && !active && "border-2 border-line-200 bg-white",
                        )}
                      />
                      {w < 4 && (
                        <span
                          className={cn(
                            "h-0.5 flex-1 rounded-full",
                            w < calProgress.semana ? "bg-cyan-400" : "bg-line-200",
                          )}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
              {calProgress.detalle && (
                <p className="mt-2.5 text-[12.5px] font-semibold text-ink-400">
                  {calProgress.detalle}
                </p>
              )}
            </div>
          )}

          {draftSection && !busy && (
            <ProposalCard
              projectId={projectId}
              section={draftSection}
              onApproved={handleApproved}
              onRequestChanges={() => {
                setHint(
                  "Escribe aquí qué quieres cambiar de la propuesta y la ajustaré.",
                );
                textareaRef.current?.focus();
              }}
            />
          )}

          {projectStatus !== "IN_PROGRESS" && (
            <div className="animate-enter-fade rounded-2xl border border-line-200 bg-white p-6 text-center shadow-card">
              <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400">
                <Check className="h-5 w-5 text-navy-900" strokeWidth={3} />
              </span>
              <p className="eyebrow mb-1">Sistema completo</p>
              <p className="mb-4 text-[20px] font-extrabold text-navy-900">
                Todas las fases están aprobadas
              </p>
              <Link href={`/project/${projectId}/review`}>
                <Button>Ir a la revisión final</Button>
              </Link>
            </div>
          )}

          {error && (
            <div
              className="flex animate-enter-fade items-center gap-3 rounded-2xl border border-line-200 bg-white p-3 pr-4 shadow-card"
              role="alert"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(229,72,77,0.1)]">
                <AlertTriangle className="h-4 w-4 text-danger-500" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold text-navy-900">
                  El proveedor de IA no respondió
                </p>
                <p className="text-[12.5px] font-semibold text-ink-600">
                  Tu mensaje quedó guardado, no se perdió nada.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void regenerate()}
              >
                <RefreshCw className="h-4 w-4" strokeWidth={2} /> Reintentar
              </Button>
            </div>
          )}

            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {showNewBtn && (
        <button
          className="absolute bottom-24 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-navy-900 px-4 py-2 text-[13.5px] font-bold text-white shadow-pop transition-colors duration-150 ease-snap hover:bg-navy-700"
          onClick={() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            setShowNewBtn(false);
            setAtBottom(true);
          }}
        >
          <ArrowDown className="h-4 w-4" strokeWidth={2} /> Nuevos mensajes
        </button>
      )}

      {/* Compositor flotante, anclado a la columna del chat */}
      <div className="safe-bottom relative shrink-0 bg-white px-4 pb-4 pt-1 md:px-8 md:pb-6">
        {/* Los mensajes se disuelven suavemente al pasar bajo el compositor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-10 bg-gradient-to-t from-white to-transparent"
        />
        <div className="mx-auto w-full max-w-3xl">
          {hint && (
            <p className="mb-2 text-[12px] font-bold text-warn-500">{hint}</p>
          )}
          {/* Arranque rápido: solo con el mensaje de bienvenida en pantalla */}
          {visibleMessages.length <= 1 &&
            !busy &&
            !draftSection &&
            projectStatus === "IN_PROGRESS" && (
              <div className="mb-2.5 flex flex-wrap gap-2">
                {["Empecemos", "¿Cómo funciona esto?"].map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setHint(null);
                      void sendMessage({ text: s });
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-line-200 bg-white px-4 text-[13.5px] font-bold text-navy-900 transition-colors duration-150 ease-snap hover:border-cyan-400 hover:bg-cyan-soft"
                  >
                    {i === 0 && (
                      <Sparkles className="h-3.5 w-3.5 text-teal-700" strokeWidth={2} />
                    )}
                    {s}
                  </button>
                ))}
              </div>
            )}
          <form
            className="rounded-[22px] border border-line-200 bg-white p-1.5 shadow-card transition-shadow duration-150 ease-snap focus-within:shadow-glow"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="flex items-end gap-1.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextarea();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder={
                projectStatus === "IN_PROGRESS"
                  ? "Escribe tu respuesta…"
                  : "Proyecto en revisión"
              }
              disabled={projectStatus !== "IN_PROGRESS"}
              className="max-h-[144px] min-h-[44px] flex-1 resize-none rounded-2xl border-0 bg-transparent px-4 py-2.5 text-[16px] leading-6 text-navy-900 placeholder:text-ink-400 focus:outline-none disabled:opacity-60 md:text-[15.5px]"
              aria-label="Mensaje"
            />
            <button
              type="submit"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white transition-all duration-150 ease-snap hover:bg-navy-700 focus-visible:shadow-glow active:scale-95 disabled:bg-surface-50 disabled:text-ink-400"
              disabled={busy || !input.trim()}
              aria-label="Enviar mensaje"
            >
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </button>
            </div>
            <div className="hidden items-center justify-between px-3 pb-1 pt-0.5 md:flex">
              <p className="text-[11px] font-semibold text-ink-400">
                Enter envía · Shift + Enter salto de línea
              </p>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Todo queda guardado
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
