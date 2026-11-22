#!/bin/sh
# Compilación del servicio de Notificaciones en Vercel (ZTV-91). Igual que la tienda:
# - Producción: aplica las migraciones de su propia base (Neon) y compila.
# - Vista previa: solo aplica migraciones si cada vista previa tiene su propia rama de Neon,
#   confirmado con ZENDA_BD_PREVIEW_AISLADA=1 (variable de Vercel solo para Preview).
set -e
npx prisma generate

if [ -z "$DATABASE_URL" ]; then
  echo "Aviso: DATABASE_URL no está configurada; se compila sin aplicar migraciones."
elif [ "$VERCEL_ENV" = "production" ] || [ "$ZENDA_BD_PREVIEW_AISLADA" = "1" ]; then
  npx prisma migrate deploy
else
  echo "Aviso: esta vista previa no tiene una rama de base de datos propia confirmada"
  echo "(ZENDA_BD_PREVIEW_AISLADA != 1); no se aplican migraciones."
fi

npx next build
