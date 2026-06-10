import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// DB de pruebas aislada: jamás se toca dev.db ni producción.
const TEST_DB = path.join(__dirname, ".test.db");

export default function globalSetup() {
  if (fs.existsSync(TEST_DB)) fs.rmSync(TEST_DB);
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB}` },
    stdio: "inherit",
  });
}
