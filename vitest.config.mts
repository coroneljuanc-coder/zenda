import { defineConfig } from "vitest/config";

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
        test: {
          name: "tienda",
          include: ["apps/tienda/src/**/*.test.ts"],
          exclude: ["**/*.integracion.test.ts", "**/node_modules/**"],
          environment: "node",
        },
      },
      {
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
          environment: "node",
        },
      },
    ],
  },
});
