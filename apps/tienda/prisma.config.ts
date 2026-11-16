import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// En local, la cadena de conexión vive en apps/tienda/.env.local (nunca se sube a GitHub).
// En Vercel y en GitHub Actions llega como variable de entorno.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Las migraciones usan la conexión directa (sin pooler) cuando existe; Neon la llama DATABASE_URL_UNPOOLED.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
    // Solo en desarrollo local (`prisma migrate dev`): base de datos temporal donde Prisma ensaya las migraciones.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
