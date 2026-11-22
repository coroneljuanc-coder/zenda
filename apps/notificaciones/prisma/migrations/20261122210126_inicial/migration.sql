-- CreateEnum
CREATE TYPE "TipoCorreo" AS ENUM ('CONFIRMACION_CLIENTE', 'AVISO_VENDEDOR');

-- CreateEnum
CREATE TYPE "EstadoCorreo" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "EventoRecibido" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "ocurridoEn" TIMESTAMP(3) NOT NULL,
    "recibidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datos" JSONB NOT NULL,

    CONSTRAINT "EventoRecibido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvioCorreo" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "tipo" "TipoCorreo" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "estado" "EstadoCorreo" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,
    "proveedorId" TEXT,
    "enviadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioCorreo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnvioCorreo_eventoId_tipo_key" ON "EnvioCorreo"("eventoId", "tipo");

-- AddForeignKey
ALTER TABLE "EnvioCorreo" ADD CONSTRAINT "EnvioCorreo_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoRecibido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
