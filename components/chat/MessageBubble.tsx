"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function AssistantAvatar() {
  return (
    <span
      className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 shadow-[0_2px_8px_rgba(2,17,48,0.18)]"
      aria-hidden
    >
      <Sparkles className="h-4 w-4 text-cyan-400" strokeWidth={2} />
    </span>
  );
}

// React.memo: durante el streaming solo cambia el último mensaje — las demás
// burbujas no deben re-ejecutar ReactMarkdown en cada chunk.
export const MessageBubble = memo(function MessageBubble({
  role,
  text,
  showAvatar = true,
  time = null,
}: {
  role: "user" | "assistant";
  text: string;
  /** false en mensajes consecutivos del mismo emisor (agrupación) */
  showAvatar?: boolean;
  /** hora "HH:mm" — visible al pasar el cursor */
  time?: string | null;
}) {
  const isUser = role === "user";
  const timeEl = time ? (
    <span
      className="mb-1.5 shrink-0 self-end text-[11px] font-semibold text-ink-400 opacity-0 transition-opacity duration-150 ease-snap group-hover:opacity-100"
      aria-hidden
    >
      {time}
    </span>
  ) : null;

  if (isUser) {
    return (
      <div className="group flex animate-enter-fade items-end justify-end gap-2">
        {timeEl}
        <div className="max-w-[88%] rounded-[18px] rounded-br-md bg-navy-900 px-4 py-2.5 text-white shadow-[0_2px_10px_rgba(2,17,48,0.14)] md:max-w-[72ch]">
          <p className="whitespace-pre-wrap text-[16px] leading-[1.65] md:text-[15.5px]">
            {text}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="group flex animate-enter-fade items-start gap-2.5">
      {showAvatar ? <AssistantAvatar /> : <span className="w-8 shrink-0" aria-hidden />}
      <div
        className={cn(
          "max-w-[88%] rounded-[18px] bg-surface-50 px-4 py-2.5 text-navy-900 md:max-w-[72ch]",
          showAvatar && "rounded-bl-md",
        )}
      >
        <div className="chat-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {text}
          </ReactMarkdown>
        </div>
      </div>
      {timeEl}
    </div>
  );
});

export function TypingIndicator() {
  return (
    <div className="flex animate-enter-fade items-start gap-2.5">
      <AssistantAvatar />
      <div className="flex items-center gap-1.5 rounded-[18px] rounded-bl-md bg-surface-50 px-4 py-[15px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-dot h-[7px] w-[7px] rounded-full bg-navy-500"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
        <span className="sr-only">La IA está escribiendo</span>
      </div>
    </div>
  );
}
