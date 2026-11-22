import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Base de datos propia del servicio de Notificaciones (ZTV-91): no se comparte con la tienda
// (RN2 de ZTV-24). En local, la conexión vive en apps/notificaciones/.env.local (nunca se sube a
// GitHub); en Vercel y en GitHub Actions llega como variable de entorno.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Las migraciones usan la conexión directa (sin pooler) cuando existe; Neon la llama DATABASE_URL_UNPOOLED.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
