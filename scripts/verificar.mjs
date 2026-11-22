// Verificación completa en el computador de desarrollo (ZTV-85, acción A9 de la retrospectiva del
// Sprint 2). Corre todo en el orden correcto y se detiene en el primer error:
//   base local → formato → lint → tipos → unitarias → integración → datos de ejemplo →
//   compilación → E2E (contra la compilación, como en el CI).
// El orden importa: las pruebas de integración vacían la base local, así que los datos de ejemplo
// se cargan después; y la compilación va después de los datos para que las páginas pre-generadas
// tengan los productos de verdad.
//
// Uso: npm run verificar            (todo)
//      npm run verificar -- --sin-e2e  (todo menos las pruebas de punta a punta)
import { spawnSync } from "node:child_process";

const sinE2E = process.argv.includes("--sin-e2e");

const pasos = [
  ["Base de datos local", "npm run bd:iniciar"],
  ["Formato (Prettier)", "npm run format:check"],
  ["Revisión de estilo (ESLint)", "npm run lint"],
  ["Tipos (TypeScript)", "npm run typecheck"],
  ["Pruebas unitarias", "npm test"],
  ["Pruebas de integración", "npm run test:integracion"],
  ["Datos de ejemplo", "npm run db:seed"],
  ["Compilación de la tienda", "npm run build -w tienda"],
  ["Compilación de Notificaciones", "npm run build -w notificaciones"],
  ...(sinE2E ? [] : [["Pruebas de punta a punta (Playwright)", "npx playwright test"]]),
];

const inicio = Date.now();
for (const [i, [nombre, comando]] of pasos.entries()) {
  const t = Date.now();
  console.log(`\n▶ ${i + 1}/${pasos.length} ${nombre}: ${comando}`);
  const r = spawnSync(comando, {
    stdio: "inherit",
    shell: true,
    // CI=1 hace que Playwright use la compilación (`next start`), igual que en GitHub Actions.
    env: { ...process.env, CI: "1" },
  });
  if (r.status !== 0) {
    console.error(`\n✖ Falló «${nombre}». Corrige y vuelve a correr \`npm run verificar\`.`);
    process.exit(r.status ?? 1);
  }
  console.log(`✔ ${nombre} (${Math.round((Date.now() - t) / 1000)} s)`);
}
console.log(`\n✔ Verificación completa en ${Math.round((Date.now() - inicio) / 1000)} s.`);
