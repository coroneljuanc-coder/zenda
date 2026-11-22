// Base de datos local para desarrollo y pruebas (ZTV-58).
//
// Un PostgreSQL 17 real, el mismo que usa el CI, que corre en este computador. Reemplaza a
// `prisma dev`, que se caía con varias conexiones a la vez. Los binarios vienen del paquete
// `embedded-postgres` (gratuito); no hay que instalar nada más ni crear cuentas.
//
// Uso (desde la raíz del repositorio):
//   npm run bd:iniciar     crea la base la primera vez y la arranca (si ya está arrancada, no hace nada)
//   npm run bd:detener     la detiene
//   npm run bd:reiniciar   la detiene y la vuelve a arrancar (sirve para recuperarla si falla)
//   npm run bd:estado      dice si está arrancada
//
// Datos en `.bd-local/` (ignorada por Git). Solo escucha en 127.0.0.1, puerto 54329, sin contraseña:
// nadie fuera de este computador puede conectarse. Nunca toca Neon (revisión ni producción).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

export const PUERTO = 54329;
export const USUARIO = "zenda";
// zenda_notificaciones: base propia del servicio de Notificaciones (ZTV-91).
export const BASES = [
  "zenda",
  "zenda_shadow",
  "zenda_notificaciones",
  "zenda_notificaciones_shadow",
];

const raiz = join(import.meta.dirname, "..");
const carpeta = join(raiz, ".bd-local");
const datos = join(carpeta, "datos");
const registro = join(carpeta, "postgres.log");

async function binarios() {
  const sistema = { win32: "windows", darwin: "darwin", linux: "linux" }[process.platform];
  if (!sistema) throw new Error(`Sistema operativo no soportado: ${process.platform}`);
  try {
    return await import(`@embedded-postgres/${sistema}-${process.arch}`);
  } catch {
    throw new Error(
      `No están los binarios de PostgreSQL para ${sistema}-${process.arch}. Corre «npm install» en la raíz.`,
    );
  }
}

function ejecutar(programa, argumentos, { permitirFallo = false, sinSalida = false } = {}) {
  // Al arrancar, el servidor hereda la salida de pg_ctl; si la capturáramos, este proceso esperaría
  // para siempre a que se cierre. Por eso «start» no captura nada y su salida va al registro.
  const r = spawnSync(programa, argumentos, {
    encoding: "utf8",
    stdio: sinSalida ? "ignore" : "pipe",
  });
  if (r.status !== 0 && !permitirFallo) {
    const detalle = sinSalida ? `Revisa ${registro}.` : r.stderr || r.stdout;
    throw new Error(`${programa} falló:\n${detalle}`);
  }
  return r;
}

async function arrancada(pg_ctl) {
  if (!existsSync(datos)) return false;
  return ejecutar(pg_ctl, ["status", "-D", datos], { permitirFallo: true }).status === 0;
}

async function crearBases() {
  const cliente = new pg.Client({
    host: "127.0.0.1",
    port: PUERTO,
    user: USUARIO,
    database: "postgres",
  });
  await cliente.connect();
  try {
    for (const base of BASES) {
      const { rowCount } = await cliente.query("SELECT 1 FROM pg_database WHERE datname = $1", [
        base,
      ]);
      if (!rowCount) {
        await cliente.query(`CREATE DATABASE ${base}`);
        console.log(`Base «${base}» creada.`);
      }
    }
  } finally {
    await cliente.end();
  }
}

async function iniciar() {
  const { initdb, pg_ctl } = await binarios();
  if (!existsSync(datos)) {
    mkdirSync(carpeta, { recursive: true });
    console.log("Creando la base local por primera vez…");
    ejecutar(initdb, ["-D", datos, "-U", USUARIO, "--auth=trust", "-E", "UTF8", "--no-locale"]);
  }
  if (await arrancada(pg_ctl)) {
    console.log(`La base local ya está arrancada en 127.0.0.1:${PUERTO}.`);
  } else {
    ejecutar(
      pg_ctl,
      [
        "start",
        "-D",
        datos,
        "-l",
        registro,
        "-w",
        "-o",
        `-p ${PUERTO} -c listen_addresses=127.0.0.1`,
      ],
      { sinSalida: true },
    );
    console.log(`Base local arrancada en 127.0.0.1:${PUERTO}.`);
  }
  await crearBases();
  console.log(`DATABASE_URL=postgresql://${USUARIO}@127.0.0.1:${PUERTO}/zenda`);
  console.log(`SHADOW_DATABASE_URL=postgresql://${USUARIO}@127.0.0.1:${PUERTO}/zenda_shadow`);
}

async function detener() {
  const { pg_ctl } = await binarios();
  if (!(await arrancada(pg_ctl))) {
    console.log("La base local ya estaba detenida.");
    return;
  }
  ejecutar(pg_ctl, ["stop", "-D", datos, "-m", "fast", "-w"]);
  console.log("Base local detenida.");
}

async function estado() {
  const { pg_ctl } = await binarios();
  console.log(
    (await arrancada(pg_ctl))
      ? `Arrancada en 127.0.0.1:${PUERTO}.`
      : "Detenida. Arráncala con «npm run bd:iniciar».",
  );
}

const ordenes = {
  iniciar,
  detener,
  estado,
  reiniciar: async () => {
    await detener();
    await iniciar();
  },
};

const orden = process.argv[2];
if (!ordenes[orden]) {
  console.error(`Uso: node scripts/bd-local.mjs <${Object.keys(ordenes).join("|")}>`);
  process.exit(1);
}
ordenes[orden]().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
