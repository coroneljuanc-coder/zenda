-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PENDIENTE', 'ENTREGADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "EventoSaliente" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "datos" JSONB NOT NULL,
    "ocurridoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximoIntento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregadoEn" TIMESTAMP(3),
    "ultimoError" TEXT,
    "pedidoId" TEXT,

    CONSTRAINT "EventoSaliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventoSaliente_pedidoId_key" ON "EventoSaliente"("pedidoId");

-- CreateIndex
CREATE INDEX "EventoSaliente_estado_proximoIntento_idx" ON "EventoSaliente"("estado", "proximoIntento");
