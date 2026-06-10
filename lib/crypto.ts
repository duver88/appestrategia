import crypto from "crypto";

/**
 * Cifrado de API keys en reposo: AES-256-GCM con APP_ENCRYPTION_KEY.
 * Formato del token: base64(iv).base64(authTag).base64(ciphertext)
 * Las keys solo se descifran en memoria al construir el cliente del
 * proveedor. JAMÁS en logs, respuestas de API ni mensajes de error.
 */

function encryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY ?? "";
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY no está configurada");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  // Acepta cualquier string: deriva 32 bytes estables por SHA-256.
  return crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decrypt(token: string): string {
  const [ivB64, tagB64, dataB64] = token.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Token cifrado con formato inválido");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Enmascara una key para la UI: `sk-ant-····-x4F2`. Nunca mostrarla entera. */
export function maskKey(key: string): string {
  if (key.length <= 10) return "····";
  return `${key.slice(0, 6)}····${key.slice(-4)}`;
}
