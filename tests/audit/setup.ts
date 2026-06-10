import path from "path";

// Se ejecuta ANTES de importar cualquier módulo de la app en cada archivo
// de test: el cliente Prisma debe nacer apuntando a la DB de pruebas.
process.env.DATABASE_URL = `file:${path.join(__dirname, ".test.db")}`;
process.env.APP_ENCRYPTION_KEY = "dGVzdC1rZXktMzItYnl0ZXMtcGFyYS1hdWRpdCEh"; // 32 bytes de prueba
process.env.AUTH_SECRET = "audit-test-secret";
process.env.DEFAULT_MODEL = "anthropic:claude-sonnet-4-5";
