import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

/**
 * Apoyo de las pruebas E2E del resultado del pago (ZTV-22): crea pedidos directo en la base de la
 * tienda, sin pasar por Mercado Pago. Usa DATABASE_URL (CI) o apps/tienda/.env.local (local).
 */
function urlBase(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const archivo = join(process.cwd(), "apps", "tienda", ".env.local");
  const linea = existsSync(archivo)
    ? readFileSync(archivo, "utf8")
        .split(/\r?\n/)
        .find((l) => l.startsWith("DATABASE_URL="))
    : undefined;
  if (!linea) throw new Error("Falta DATABASE_URL para las pruebas del resultado del pago.");
  return linea.slice("DATABASE_URL=".length).replace(/^"|"$/g, "");
}

let cliente: pg.Client | null = null;
async function conexion(): Promise<pg.Client> {
  if (!cliente) {
    cliente = new pg.Client({ connectionString: urlBase() });
    await cliente.connect();
  }
  return cliente;
}

export async function cerrarBD(): Promise<void> {
  await cliente?.end();
  cliente = null;
}

type EstadoPedido = "PENDIENTE_PAGO" | "PAGADO" | "PAGO_RECHAZADO";

/** Pedido de 2 × Camiseta básica de algodón M / Negro ($ 99.800 + envío $ 12.000 = $ 111.800). */
export async function crearPedidoDePrueba(estado: EstadoPedido) {
  const bd = await conexion();
  const { rows } = await bd.query<{ id: string; precio: number }>(
    `SELECT v.id, COALESCE(v.precio, p.precio) AS precio FROM "VarianteProducto" v JOIN "Producto" p ON p.id = v."productoId"
     WHERE p.slug = 'camiseta-basica-algodon' AND v.talla = 'M' AND v.color = 'Negro' LIMIT 1`,
  );
  if (!rows[0]) throw new Error("No está la Camiseta M / Negro del seed.");
  const sufijo = randomBytes(4).toString("hex").toUpperCase().slice(0, 5);
  const referencia = `ZEN-20261123-${sufijo}`;
  const token = randomBytes(24).toString("base64url");
  const id = `e2e${randomBytes(8).toString("hex")}`;
  await bd.query(
    `INSERT INTO "Pedido" (id, referencia, "tokenAcceso", estado, subtotal, envio, total, "claveContenido",
       "nombreCompleto", correo, celular, departamento, ciudad, "codigoDane", direccion, "actualizadoEn",
       "pagadoEn", "metodoPago")
     VALUES ($1,$2,$3,$4,99800,12000,111800,'e2e','Ana Prueba','ana@ejemplo.com','3001234567',
       'Antioquia','Medellín','05001','Cra 1 # 2-3', now(), $5, $6)`,
    [
      id,
      referencia,
      token,
      estado,
      estado === "PAGADO" ? new Date() : null,
      estado === "PAGADO" ? "visa" : null,
    ],
  );
  await bd.query(
    `INSERT INTO "LineaPedido" (id, "pedidoId", "varianteId", "nombreProducto", "descripcionVariante",
       "precioUnitario", cantidad, "totalLinea")
     VALUES ($1, $2, $3, 'Camiseta básica de algodón', 'M / Negro', $4, 2, $5)`,
    [`${id}l`, id, rows[0].id, rows[0].precio, rows[0].precio * 2],
  );
  return { referencia, token };
}
