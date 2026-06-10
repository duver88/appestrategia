# DEPLOY — Lionscore Content Engine

## Variables de entorno requeridas

| Variable | Cómo generarla / qué es |
|---|---|
| `DATABASE_URL` | SQLite en dev (`file:./dev.db`); PostgreSQL en producción |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` — cifra las API keys en DB (AES-256-GCM). **Si se pierde, las credenciales guardadas quedan ilegibles**: guardarla en un gestor de secretos. |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | Seed del único super admin (cambio de contraseña obligatorio al primer login) |
| `ANTHROPIC_API_KEY` (y otras `*_API_KEY`) | Solo fallback de desarrollo: en producción las keys viven cifradas en DB (panel admin → API y modelos) |
| `DEFAULT_MODEL` | Fallback; el valor real vive en Setting `default_model` (editable en el panel) |

## Despliegue del ajuste "Panel super admin" (orden obligatorio)

La app debe seguir funcionando entre cada paso.

1. **Backup** (sin excepciones):
   - Dev (SQLite): `node scripts/backup-db.js`
   - Producción: `docker exec <postgres> pg_dump -U <user> <db> | gzip > backup_$(date +%Y%m%d_%H%M).sql.gz`
   - Verificar el tamaño del archivo antes de continuar.
2. **Migración aditiva**: `npx prisma db push` (solo agrega tablas/columnas; nada se renombra ni borra).
3. **Seeds idempotentes** (ejecutables N veces sin duplicar):
   ```bash
   npm run db:seed                    # super admin si no existe
   node scripts/seed-prompts.js       # /prompts/*.md → PromptTemplate v1 activa
   node scripts/seed-credentials.js   # keys del .env → ApiCredential cifradas
   node scripts/seed-settings.js      # default_model, price_table, textos
   ```
4. **Código nuevo**: build + restart de la app.
5. **Backfill + activación del gate de membresía** (al final, nunca antes):
   ```bash
   node scripts/backfill-memberships.js 30   # +30 días a clientes sin fecha
   ```
   El script activa `membership_enforcement` SOLO cuando todos los clientes
   tienen fecha. También puede activarse/apagarse desde el panel → Configuración.

## Rollback

Restaurar el backup del paso 1 revierte todo el estado de datos:

- Dev: copiar `backups/dev-<fecha>.db` sobre `prisma/dev.db` (con la app parada).
- Producción: `gunzip -c backup_<fecha>.sql.gz | docker exec -i <postgres> psql -U <user> <db>`

El código anterior tolera el schema nuevo (los cambios son aditivos), así que
también se puede volver al commit anterior sin tocar la DB.

## Verificación post-deploy

Con el server arriba y los clientes de prueba del e2e (`node scripts/e2e-seed.js`):

```powershell
$env:ADMIN_EMAIL="<email del super admin>"; $env:ADMIN_PASS="<password>"
powershell -ExecutionPolicy Bypass -File scripts/verify-admin.ps1
```

Cubre: 403 de `/api/admin/*` para CLIENT, regresión del flujo de cliente,
bloqueo por suspensión + recuperación al extender, versionado/restauración de
prompts y enmascaramiento de credenciales (15 checks).

## Notas SQLite → PostgreSQL

En producción convertir: campos `String` de estado a enums (`Role`,
`ClientStatus`, `ProjectMode`, `ProjectStatus`, `SectionStatus`),
`Setting.value` a `Json`, `UsageLog.costUsd` a `Decimal @db.Decimal(10,6)`,
`Message.content` y `PromptTemplate.content` a `@db.Text`.
