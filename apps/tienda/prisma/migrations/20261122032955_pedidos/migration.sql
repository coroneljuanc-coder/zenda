-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'PAGO_RECHAZADO', 'CANCELADO', 'REQUIERE_REVISION');

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "tokenAcceso" TEXT NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "subtotal" INTEGER NOT NULL,
    "envio" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "claveContenido" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "codigoDane" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "detalles" TEXT,
    "notas" TEXT,
    "carritoId" TEXT,
    "wompiTransaccionId" TEXT,
    "metodoPago" TEXT,
    "pagadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "nombreProducto" TEXT NOT NULL,
    "descripcionVariante" TEXT,
    "precioUnitario" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "totalLinea" INTEGER NOT NULL,

    CONSTRAINT "LineaPedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_referencia_key" ON "Pedido"("referencia");

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_tokenAcceso_key" ON "Pedido"("tokenAcceso");

-- CreateIndex
CREATE INDEX "Pedido_carritoId_estado_idx" ON "Pedido"("carritoId", "estado");

-- CreateIndex
CREATE INDEX "LineaPedido_pedidoId_idx" ON "LineaPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "LineaPedido_varianteId_idx" ON "LineaPedido"("varianteId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "Carrito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPedido" ADD CONSTRAINT "LineaPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPedido" ADD CONSTRAINT "LineaPedido_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "VarianteProducto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
