import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** El atajo `@/` de la tienda (apps/tienda/tsconfig.json) también en las pruebas. */
const aliasTienda = {
  "@": fileURLToPath(new URL("./apps/tienda/src", import.meta.url)),
};

/** Base de Notificaciones para las pruebas: variable del CI o el .env.local del servicio. */
function urlNotificaciones(): string {
  if (process.env.NOTIFICACIONES_DATABASE_URL) return process.env.NOTIFICACIONES_DATABASE_URL;
  const archivo = fileURLToPath(new URL("./apps/notificaciones/.env.local", import.meta.url));
  if (!existsSync(archivo)) return "";
  const linea = readFileSync(archivo, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="));
  return linea ? linea.slice("DATABASE_URL=".length) : "";
}

/**
 * Pruebas unitarias y de integración (Vitest).
 * Un proyecto por aplicación, para poder correr solo las de la aplicación que cambió
 * (S0-06-CP2): `npx vitest run --project tienda`.
 * Las pruebas de integración (archivos `*.integracion.test.ts`) necesitan una base de datos
 * y van en un proyecto aparte: `npx vitest run --project tienda-integracion`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: aliasTienda },
        test: {
          name: "tienda",
          include: ["apps/tienda/src/**/*.test.ts"],
          exclude: ["**/*.integracion.test.ts", "**/node_modules/**"],
          environment: "node",
        },
      },
      {
        resolve: { alias: aliasTienda },
        test: {
          name: "tienda-integracion",
          include: ["apps/tienda/src/**/*.integracion.test.ts"],
          environment: "node",
          // Comparten una sola base de datos: un archivo a la vez.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
      {
        test: {
          name: "notificaciones",
          include: ["apps/notificaciones/src/**/*.test.ts"],
          exclude: ["**/*.integracion.test.ts", "**/node_modules/**"],
          environment: "node",
        },
      },
      {
        // ZTV-91: base propia del servicio. La conexión sale de apps/notificaciones/.env.local en
        // local y de NOTIFICACIONES_DATABASE_URL en el CI.
        test: {
          name: "notificaciones-integracion",
          include: ["apps/notificaciones/src/**/*.integracion.test.ts"],
          environment: "node",
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 60_000,
          env: { DATABASE_URL: urlNotificaciones() },
        },
      },
    ],
  },
});
