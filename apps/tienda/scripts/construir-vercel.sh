#!/bin/sh
# Compilación de la tienda en Vercel (ZTV-7 / ZTV-8).
# 1. Genera el cliente de Prisma.
# 2. Aplica las migraciones pendientes de la base de datos (Neon):
#    - Producción: siempre. Solo se despliega a producción cuando el PO integra un PR a main.
#      Los datos de ejemplo se cargan en producción solo si existe ZENDA_SEED_PRODUCCION=1,
#      configurada en Vercel solo para Production (decisión D8 del PO, 2026-11-16). La carga se
#      puede repetir sin duplicar y no sobrescribe el stock real. Cuando lleguen los productos
#      reales, se quita esa variable.
#    - Vista previa: solo si cada vista previa tiene su propia rama de Neon. Eso se confirma con la
#      variable ZENDA_BD_PREVIEW_AISLADA=1 (configurada en Vercel solo para Preview). Sin ella, una
#      vista previa podría estar conectada a la base de producción, así que no se toca la base.
#      Con rama propia, además se cargan los datos de ejemplo.
# 3. Compila Next.js.
set -e
npx prisma generate

if [ -z "$DATABASE_URL" ]; then
  echo "Aviso: DATABASE_URL no está configurada; se compila sin aplicar migraciones."
elif [ "$VERCEL_ENV" = "production" ]; then
  npx prisma migrate deploy
  if [ "$ZENDA_SEED_PRODUCCION" = "1" ]; then
    npx prisma db seed
  else
    echo "Producción sin datos de ejemplo (ZENDA_SEED_PRODUCCION != 1)."
  fi
elif [ "$ZENDA_BD_PREVIEW_AISLADA" = "1" ]; then
  npx prisma migrate deploy
  npx prisma db seed
else
  echo "Aviso: esta vista previa no tiene una rama de base de datos propia confirmada"
  echo "(ZENDA_BD_PREVIEW_AISLADA != 1); no se aplican migraciones ni datos de ejemplo."
fi

npx next build
