-- CreateTable
CREATE TABLE "Carrito" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaCarrito" (
    "id" TEXT NOT NULL,
    "carritoId" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "LineaCarrito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carrito_token_key" ON "Carrito"("token");

-- CreateIndex
CREATE INDEX "LineaCarrito_varianteId_idx" ON "LineaCarrito"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "LineaCarrito_carritoId_varianteId_key" ON "LineaCarrito"("carritoId", "varianteId");

-- AddForeignKey
ALTER TABLE "LineaCarrito" ADD CONSTRAINT "LineaCarrito_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "Carrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaCarrito" ADD CONSTRAINT "LineaCarrito_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "VarianteProducto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas de negocio protegidas también en la base (ZTV-16):
-- RN1: la cantidad de una línea va de 1 a 10 (el tope por stock se valida en el servidor).
ALTER TABLE "LineaCarrito" ADD CONSTRAINT "LineaCarrito_cantidad_rango" CHECK ("cantidad" BETWEEN 1 AND 10);
