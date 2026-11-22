-- CreateTable
CREATE TABLE "DatosEntrega" (
    "id" TEXT NOT NULL,
    "carritoId" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "codigoDane" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "detalles" TEXT,
    "notas" TEXT,
    "aceptoPoliticaEn" TIMESTAMP(3) NOT NULL,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatosEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DatosEntrega_carritoId_key" ON "DatosEntrega"("carritoId");

-- AddForeignKey
ALTER TABLE "DatosEntrega" ADD CONSTRAINT "DatosEntrega_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "Carrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
