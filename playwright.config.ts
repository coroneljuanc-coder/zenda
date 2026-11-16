import { defineConfig, type PlaywrightTestConfig } from "@playwright/test";

const enCI = Boolean(process.env.CI);

/**
 * Aplicaciones a probar. Por defecto, ambas. En CI se limita a las que cambiaron
 * (S0-06-CP2) con la variable ZENDA_E2E_APPS, por ejemplo "notificaciones".
 */
const apps = (process.env.ZENDA_E2E_APPS ?? "tienda,notificaciones")
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);
const probarTienda = apps.includes("tienda");
const probarNotificaciones = apps.includes("notificaciones");

const projects: PlaywrightTestConfig["projects"] = [];
const webServer: NonNullable<PlaywrightTestConfig["webServer"]> = [];

if (probarTienda) {
  projects.push(
    {
      name: "tienda-celular",
      testDir: "./e2e/tienda",
      use: {
        browserName: "chromium",
        baseURL: "http://localhost:3000",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tienda-escritorio",
      testDir: "./e2e/tienda",
      use: {
        browserName: "chromium",
        baseURL: "http://localhost:3000",
        viewport: { width: 1280, height: 800 },
      },
    },
  );
  webServer.push({
    command: enCI ? "npm run start -w tienda" : "npm run dev -w tienda",
    url: "http://localhost:3000",
    reuseExistingServer: !enCI,
    timeout: 120_000,
  });
}

if (probarNotificaciones) {
  projects.push({
    name: "notificaciones",
    testDir: "./e2e/notificaciones",
    use: { baseURL: "http://localhost:3001" },
  });
  webServer.push({
    command: enCI ? "npm run start -w notificaciones" : "npm run dev -w notificaciones",
    url: "http://localhost:3001/api/salud",
    reuseExistingServer: !enCI,
    timeout: 120_000,
  });
}

/**
 * Pruebas de punta a punta (E2E) con Playwright.
 * - La tienda se prueba en dos tamaños: celular (390×844) y escritorio (1280×800).
 * - El servicio de Notificaciones se prueba por su API.
 * En CI se usan las apps ya compiladas (`next start`); en local, los servidores de desarrollo.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: enCI,
  retries: enCI ? 1 : 0,
  reporter: enCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects,
  webServer,
});
