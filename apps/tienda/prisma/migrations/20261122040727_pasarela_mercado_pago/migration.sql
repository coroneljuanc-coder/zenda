-- ZTV-86: la pasarela pasa de Wompi a Mercado Pago (cambio de D1). Se renombra la columna para
-- conservar cualquier dato que ya exista (en lugar de borrarla y crearla de nuevo).
ALTER TABLE "Pedido" RENAME COLUMN "wompiTransaccionId" TO "pasarelaTransaccionId";
