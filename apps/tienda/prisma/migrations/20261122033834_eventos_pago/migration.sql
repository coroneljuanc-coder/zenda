-- CreateTable
CREATE TABLE "EventoPago" (
    "id" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL,
    "transaccionId" TEXT,
    "referencia" TEXT,
    "estado" TEXT,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultado" TEXT NOT NULL,

    CONSTRAINT "EventoPago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoPago_referencia_idx" ON "EventoPago"("referencia");
