// Réplica en Node puro del formato de lib/crypto.ts (para scripts de seed).
const crypto = require("crypto");

function encryptionKey() {
  const raw = process.env.APP_ENCRYPTION_KEY || "";
  if (!raw) throw new Error("APP_ENCRYPTION_KEY no está configurada");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;
  return crypto.createHash("sha256").update(raw).digest();
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(".");
}

module.exports = { encrypt };
