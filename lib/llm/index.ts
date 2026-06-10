import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { deepseek, createDeepSeek } from "@ai-sdk/deepseek";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getSetting } from "@/lib/settings";

/**
 * Capa multi-proveedor: "anthropic:claude-sonnet-4-5", "openai:gpt-4o",
 * "deepseek:deepseek-chat", "openai_compatible:<modelo>" (con base URL
 * custom en ApiCredential).
 *
 * Las API keys se leen de ApiCredential (cifradas AES-256-GCM) y se
 * descifran SOLO en memoria. Fallback a las env vars de desarrollo si no
 * hay credencial en DB.
 */

interface ResolvedCredential {
  apiKey: string;
  baseUrl: string | null;
}

const TTL_MS = 60_000;
const credCache = new Map<
  string,
  { cred: ResolvedCredential | null; loadedAt: number }
>();

async function getCredential(
  provider: string,
): Promise<ResolvedCredential | null> {
  const cached = credCache.get(provider);
  if (cached && Date.now() - cached.loadedAt < TTL_MS) return cached.cred;

  let cred: ResolvedCredential | null = null;
  try {
    const row = await prisma.apiCredential.findUnique({ where: { provider } });
    if (row && row.isActive) {
      cred = { apiKey: decrypt(row.encryptedKey), baseUrl: row.baseUrl };
    }
  } catch {
    cred = null; // sin DB o sin APP_ENCRYPTION_KEY → fallback a env vars
  }
  credCache.set(provider, { cred, loadedAt: Date.now() });
  return cred;
}

/** Invalidar al guardar una credencial desde el panel: efecto inmediato. */
export function invalidateCredentialCache(provider?: string): void {
  if (provider) credCache.delete(provider);
  else credCache.clear();
}

export async function getModel(spec: string) {
  const [provider, ...rest] = spec.split(":");
  const model = rest.join(":");
  const cred = await getCredential(provider);

  switch (provider) {
    case "anthropic":
      return cred ? createAnthropic({ apiKey: cred.apiKey })(model) : anthropic(model);
    case "openai":
      return cred ? createOpenAI({ apiKey: cred.apiKey })(model) : openai(model);
    case "deepseek":
      return cred ? createDeepSeek({ apiKey: cred.apiKey })(model) : deepseek(model);
    case "openai_compatible": {
      if (!cred?.baseUrl) {
        throw new Error(
          "El proveedor openai_compatible requiere una credencial con base URL en el panel admin",
        );
      }
      return createOpenAI({ apiKey: cred.apiKey, baseURL: cred.baseUrl })(model);
    }
    default:
      throw new Error(`Proveedor desconocido: ${provider}`);
  }
}

/** Fallback estático para seeds y entornos sin DB. */
export const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL ?? "anthropic:claude-sonnet-4-5";

/** Modelo por defecto global, editable desde el panel (Setting). */
export async function getDefaultModelSpec(): Promise<string> {
  return getSetting<string>("default_model", DEFAULT_MODEL);
}
