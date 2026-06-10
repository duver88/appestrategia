import { prisma } from "@/lib/db";

/**
 * Settings clave-valor (JSON serializado en SQLite; Json nativo en Postgres).
 * Cache en memoria con TTL corto, invalidada al guardar desde el panel.
 */

const TTL_MS = 60_000;
const cache = new Map<string, { value: unknown; loadedAt: number }>();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.loadedAt < TTL_MS) {
    return cached.value as T;
  }
  const row = await prisma.setting.findUnique({ where: { key } });
  const value = row ? (JSON.parse(row.value) as T) : fallback;
  cache.set(key, { value, loadedAt: Date.now() });
  return value;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
  cache.set(key, { value, loadedAt: Date.now() });
}

export function invalidateSettingCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

// ——— Defaults tipados de los settings que usa el sistema ———

export interface PriceEntry {
  inputPerM: number; // USD por millón de tokens de entrada
  outputPerM: number; // USD por millón de tokens de salida
}

/** Tabla de precios por modelo (clave = "proveedor:modelo"). */
export const DEFAULT_PRICE_TABLE: Record<string, PriceEntry> = {
  "anthropic:claude-sonnet-4-5": { inputPerM: 3, outputPerM: 15 },
  "anthropic:claude-opus-4-8": { inputPerM: 15, outputPerM: 75 },
  "anthropic:claude-haiku-4-5": { inputPerM: 1, outputPerM: 5 },
  "openai:gpt-4o": { inputPerM: 2.5, outputPerM: 10 },
  "openai:gpt-4o-mini": { inputPerM: 0.15, outputPerM: 0.6 },
  "deepseek:deepseek-chat": { inputPerM: 0.27, outputPerM: 1.1 },
};

export const DEFAULT_EXPIRED_TEXT =
  "Tu membresía venció. Tu avance está guardado y no se pierde: escríbenos para renovar y seguir exactamente donde quedaste.\n\nContacto: WhatsApp de LIONSCORE.";
