import type { EventoPedidoPagado } from "./eventos";

/**
 * Ejemplo válido del evento «pedido.pagado» con los datos reales del seed (A8): 3 × Camiseta básica
 * de algodón M / Negro ($ 149.700) + envío $ 12.000 = $ 161.700. Lo usan las pruebas de las dos
 * aplicaciones para hablar del mismo evento.
 */
export const EVENTO_EJEMPLO: EventoPedidoPagado = {
  id: "0b8f5a3e-2c1d-4e7a-9f00-1a2b3c4d5e6f",
  tipo: "pedido.pagado",
  version: 1,
  ocurridoEn: "2026-11-23T14:59:00.000Z",
  datos: {
    referencia: "ZEN-20261123-7K3QD",
    cliente: { nombre: "Ana Prueba", correo: "ana@ejemplo.com", celular: "3001234567" },
    entrega: {
      departamento: "Antioquia",
      ciudad: "Medellín",
      direccion: "Cra 1 # 2-3",
      detalles: null,
      notas: null,
    },
    lineas: [
      {
        nombreProducto: "Camiseta básica de algodón",
        descripcionVariante: "M / Negro",
        precioUnitario: 49_900,
        cantidad: 3,
        totalLinea: 149_700,
      },
    ],
    subtotal: 149_700,
    envio: 12_000,
    total: 161_700,
    metodoPago: "visa",
    pagadoEn: "2026-11-23T14:59:00.000Z",
  },
};
