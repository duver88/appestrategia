import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

const PROMPTS_DIR = path.join(process.cwd(), "prompts");

// Los prompts se leen SIEMPRE de PromptTemplate (versión activa, editable
// desde el panel admin sin redeploy). Los archivos de /prompts quedan como
// seed inicial y fallback de transición segura si una plantilla no existe
// en DB. Cache en memoria invalidada al guardar desde el panel; TTL corto
// en producción para instancias múltiples.
const CACHE_TTL_MS = process.env.NODE_ENV === "production" ? 60_000 : 0;

const cache = new Map<string, { content: string; loadedAt: number }>();

export async function loadPrompt(name: string): Promise<string> {
  const cached = cache.get(name);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.content;
  }

  let content: string | null = null;
  try {
    const row = await prisma.promptTemplate.findFirst({
      where: { phaseId: name, isActive: true },
    });
    content = row?.content ?? null;
  } catch {
    content = null; // DB no disponible → fallback al archivo
  }
  if (content === null) {
    content = await fs.readFile(path.join(PROMPTS_DIR, `${name}.md`), "utf-8");
  }

  cache.set(name, { content, loadedAt: Date.now() });
  return content;
}

/** Alias semántico usado por el panel admin y la arquitectura. */
export const getActivePrompt = loadPrompt;

/** Invalida la cache al guardar/restaurar una versión desde el panel. */
export function invalidatePromptCache(name?: string): void {
  if (name) cache.delete(name);
  else cache.clear();
}

export async function loadMasterRules(): Promise<string> {
  return loadPrompt("master_rules");
}

/** Prompt de la fase. En MODO_2 la fase_6 usa modo_2_renovacion.md. */
export async function loadPhasePrompt(
  phaseId: string,
  mode: string,
): Promise<string> {
  if (mode === "MODO_2" && phaseId === "fase_6") {
    return loadPrompt("modo_2_renovacion");
  }
  return loadPrompt(PHASE_PROMPT_FILES[phaseId] ?? phaseId);
}

/**
 * Ramificación de fase_2_1: el prompt contiene los cuatro bloques de eje
 * delimitados con <!-- EJE:X --> ... <!-- /EJE:X -->. Se conserva SOLO el
 * bloque del eje diagnosticado en fase_0_5 y se eliminan los demás.
 */
export function selectEjeOption(content: string, eje: string): string {
  const EJES = ["CREENCIA_CONTRARIA", "PROCESO", "RESULTADO", "COMBINACION"];
  let out = content;
  for (const e of EJES) {
    const block = new RegExp(
      `<!-- EJE:${e} -->[\\s\\S]*?<!-- /EJE:${e} -->\\r?\\n?`,
      "g",
    );
    if (e === eje) {
      out = out.replace(new RegExp(`<!-- /?EJE:${e} -->\\r?\\n?`, "g"), "");
    } else {
      out = out.replace(block, "");
    }
  }
  return out;
}

export const PHASE_PROMPT_FILES: Record<string, string> = {
  fase_0: "fase_0_recopilacion",
  fase_0_5: "fase_0_5_diagnostico_eje",
  fase_1_0: "fase_1_0_validacion_tono",
  fase_1_1: "fase_1_1_nicho",
  fase_1_2: "fase_1_2_dolores_deseos",
  fase_1_3: "fase_1_3_promesa",
  fase_1_4: "fase_1_4_diferenciadores",
  fase_1_5: "fase_1_5_customer_journey",
  fase_1_6: "fase_1_6_vehiculo",
  fase_1_7: "fase_1_7_entregables",
  fase_2_1: "fase_2_1_eje_posicionamiento",
  fase_2_2: "fase_2_2_brand_statement",
  fase_2_3: "fase_2_3_banco_tesis",
  fase_2_4: "fase_2_4_credibility_bank",
  fase_3: "fase_3_perfiles_deseos",
  fase_4: "fase_4_matriz_hooks",
  fase_5: "fase_5_organic_magnets",
  fase_6: "fase_6_calendario",
};
