import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/audit/**/*.test.ts"],
    setupFiles: ["tests/audit/setup.ts"],
    globalSetup: ["tests/audit/global-setup.ts"],
    // SQLite compartido entre archivos: ejecución secuencial determinista.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
