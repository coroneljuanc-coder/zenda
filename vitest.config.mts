import { defineConfig } from "vitest/config";

/**
 * Pruebas unitarias y de integración (Vitest).
 * Un proyecto por aplicación, para poder correr solo las de la aplicación que cambió
 * (S0-06-CP2): `npx vitest run --project tienda`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "tienda",
          include: ["apps/tienda/src/**/*.test.ts"],
          environment: "node",
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
