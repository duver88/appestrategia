// Backup fechado de la base de datos ANTES de cualquier migración.
// Desarrollo (SQLite): copia el archivo. Producción (PostgreSQL): usar
//   docker exec <postgres> pg_dump -U <user> <db> | gzip > backup_$(date +%Y%m%d_%H%M).sql.gz
// (ver DEPLOY.md).
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "prisma", "dev.db");
const dir = path.join(__dirname, "..", "backups");
if (!fs.existsSync(src)) {
  console.log("No hay dev.db local (¿producción? usa pg_dump — ver DEPLOY.md).");
  process.exit(0);
}
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
const dest = path.join(dir, `dev-${stamp}.db`);
fs.copyFileSync(src, dest);
console.log(`Backup creado: ${dest} (${fs.statSync(dest).size} bytes)`);
