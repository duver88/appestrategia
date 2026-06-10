---
name: lionscore-prod-safe
description: Protocolo obligatorio para hacer cambios en el Lionscore Content Engine que YA ESTÁ EN PRODUCCIÓN con clientes y datos reales. Usar esta skill SIEMPRE que un cambio toque la base de datos (migraciones Prisma, schema, seeds, backfills), el despliegue, variables de entorno, Docker, o cualquier refactor — incluso si el usuario solo pide "un ajuste pequeño". Si existe riesgo de perder datos o de que un cliente note una interrupción, esta skill aplica.
---

# Cambios seguros en producción — Lionscore

La app tiene clientes pagando y conversaciones/secciones que son SU trabajo de semanas. Perder datos = perder el negocio. Reglas:

## 1. Base de datos: solo cambios aditivos
- PROHIBIDO en migraciones: `DROP TABLE`, `DROP COLUMN`, renombrar tablas o columnas, cambiar tipos de forma destructiva, `TRUNCATE`.
- Columnas nuevas: nullable o con `DEFAULT`. Si debe ser obligatoria: (1) migración nullable → (2) script de backfill idempotente → (3) segunda migración que la hace NOT NULL.
- Enums: solo agregar valores, nunca quitar ni renombrar.
- Probar toda migración contra una copia local de la DB de producción antes de aplicarla.

## 2. Backup antes de migrar — sin excepciones
```bash
docker exec <postgres> pg_dump -U <user> <db> | gzip > backup_$(date +%Y%m%d_%H%M).sql.gz
```
Verificar que el archivo pesa lo esperado antes de continuar. Documentar en el PR/commit el comando exacto de restauración (rollback).

## 3. Orden de despliegue
1. Backup → 2. Migración aditiva → 3. Backfill/seed (scripts idempotentes en `/scripts`, ejecutables N veces sin duplicar) → 4. Código nuevo → 5. Activar middlewares/flags que dependan de los datos nuevos.
La app debe seguir funcionando entre cada paso (compatibilidad hacia atrás: el código viejo debe tolerar el schema nuevo).

## 4. No reescribir lo que funciona
- Cambios quirúrgicos: tocar solo los archivos necesarios. PROHIBIDO refactorizar módulos vecinos "de paso", reordenar imports masivamente o reformatear archivos completos (ensucia el diff y esconde regresiones).
- Antes de modificar un módulo, leerlo completo y adaptarse a sus nombres y patrones reales — no imponer los del documento de especificación si el código difiere.
- Si un refactor parece necesario, proponerlo como tarea separada, nunca mezclado con la feature.

## 5. Secretos y configuración
- Variables de entorno nuevas: agregarlas a `.env.example` con comentario y documentar en `DEPLOY.md` cómo generarlas. Nunca commitear valores reales.
- API keys y secretos jamás en logs, mensajes de error, respuestas de API ni en el cliente.

## 6. Verificación de regresión (antes de dar por terminado)
1. Un cliente existente inicia sesión y su conversación/avance está intacto.
2. El flujo aprobar → avanzar de fase funciona.
3. Se genera un PDF de un proyecto existente sin errores.
4. Un CLIENT no puede acceder a rutas admin ni a datos ajenos.
5. `docker compose up` levanta limpio con el schema nuevo.

## 7. Si algo sale mal
Detenerse, no improvisar arreglos sobre datos de producción. Restaurar el backup del paso 2, volver al commit anterior, y diagnosticar en local con la copia.
