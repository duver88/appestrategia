import type { UIMessage } from "ai";

/**
 * Hotfix del flujo de edición — cinturón de UI: si una tool devolvió
 * ok:false y el turno NO terminó con un ok:true posterior, el usuario
 * SIEMPRE ve el motivo en el chat (nunca silencio con la card vieja).
 *
 * Regla de supresión: un ok:true POSTERIOR en el mismo mensaje significa
 * que el modelo reintentó y persistió — el rechazo intermedio no se
 * muestra (la honestidad del contenido la garantiza la instrucción de
 * servidor; este cinturón cubre el silencio total).
 */

interface ToolOutput {
  ok?: boolean;
  errors?: string[];
}

function toolOutputs(message: UIMessage): ToolOutput[] {
  const outs: ToolOutput[] = [];
  for (const part of message.parts) {
    const p = part as {
      type: string;
      state?: string;
      output?: unknown;
    };
    if (!p.type.startsWith("tool-") && p.type !== "dynamic-tool") continue;
    if (p.state !== "output-available" || !p.output || typeof p.output !== "object") continue;
    outs.push(p.output as ToolOutput);
  }
  return outs;
}

/**
 * Errores de tools RECHAZADAS que el usuario debe ver: los ok:false que
 * no fueron seguidos por un ok:true en el mismo mensaje.
 */
export function rejectedToolErrors(message: UIMessage): string[] {
  const outs = toolOutputs(message);
  const lastOkIdx = outs.reduce((acc, o, i) => (o.ok === true ? i : acc), -1);
  return outs
    .filter((o, i) => o.ok === false && i > lastOkIdx)
    .flatMap((o) => (Array.isArray(o.errors) ? o.errors : []));
}
