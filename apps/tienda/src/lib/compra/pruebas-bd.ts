// Apoyo para las pruebas de integración de la compra (ZTV-19, 20 y 21). Usa PostgreSQL real y
// BORRA los datos, así que solo corre contra localhost. No se importa desde la aplicación.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { agregarAlCarrito } from "../carrito/carrito";
import type { DatosEntregaValidos } from "./datos-entrega";

const envLocal = join(import.meta.dirname, "../../../.env.local");
if (!process.env.DATABASE_URL && existsSync(envLocal)) process.loadEnvFile(envLocal);

const conexion = process.env.DATABASE_URL;
if (!conexion)
  throw new Error(
    "Las pruebas de integración necesitan DATABASE_URL (ver apps/tienda/.env.example).",
  );
const servidor = new URL(conexion).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(servidor)) {
  throw new Error(
    `Las pruebas de integración borran datos: solo corren contra localhost y DATABASE_URL apunta a ${servidor}.`,
  );
}

export const bd = new PrismaClient({ adapter: new PrismaPg({ connectionString: conexion }) });

/** Borra todo, de las tablas que dependen hacia las que no. */
export async function vaciar() {
  // Las tablas de pedidos y pagos (ZTV-20 y 21) se borran si ya existen en el esquema.
  const tablas = bd as unknown as Record<string, { deleteMany?: () => Promise<unknown> }>;
  for (const nombre of ["eventoSaliente", "eventoPago", "lineaPedido", "pedido"])
    await tablas[nombre]?.deleteMany?.();
  await bd.datosEntrega.deleteMany();
  await bd.lineaCarrito.deleteMany();
  await bd.carrito.deleteMany();
  await bd.imagenProducto.deleteMany();
  await bd.varianteProducto.deleteMany();
  await bd.producto.deleteMany();
  await bd.categoria.deleteMany();
}

/** La camiseta de los datos de ejemplo (A8): $ 49.900, M / Negro, stock 15. Devuelve la variante. */
export async function crearCamiseta({ precio = 49_900, stock = 15 } = {}) {
  const categoria = await bd.categoria.create({ data: { nombre: "Ropa", slug: "ropa" } });
  const producto = await bd.producto.create({
    data: {
      nombre: "Camiseta básica de algodón",
      slug: "camiseta-basica-algodon",
      descripcion: "Producto de prueba",
      precio,
      categoriaId: categoria.id,
      variantes: { create: [{ sku: "ROP-CAM-NEG-M", talla: "M", color: "Negro", stock }] },
    },
    select: { variantes: { select: { id: true } } },
  });
  return producto.variantes[0].id;
}

/** Arma un carrito con una línea y devuelve su token. */
export async function armarCarrito(varianteId: string, cantidad: number) {
  const r = await agregarAlCarrito(bd, { token: null, varianteId, cantidad });
  if (!r.ok) throw new Error(r.mensaje);
  return r.token;
}

/** Datos válidos ficticios (Ana Prueba, Medellín). */
export const DATOS_ANA: DatosEntregaValidos = {
  nombreCompleto: "Ana Prueba",
  correo: "ana@ejemplo.com",
  celular: "3001234567",
  departamento: "05",
  ciudad: "05001",
  direccion: "Cra 1 # 2-3",
  detalles: null,
  notas: null,
  aceptoPolitica: true,
};
