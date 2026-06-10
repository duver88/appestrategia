#!/usr/bin/env bash
###############################################################################
# CANDADO PERMANENTE DE DESPLIEGUE — Compuerta 5 del protocolo de auditoría.
# Si la auditoría estática o la suite obligatoria fallan, el deploy SE ABORTA.
# Uso en el VPS:  ./deploy.sh
###############################################################################
set -e

echo "== Candado de despliegue LIONSCORE =="

git pull

echo "-- Compuerta automática: auditoría estática + suite obligatoria --"
./audit.sh                 # exit != 0 → set -e aborta el deploy aquí
npm run test:audit

echo "-- Compuertas superadas: desplegando --"
docker compose build && docker compose up -d
echo "== Deploy completado =="
