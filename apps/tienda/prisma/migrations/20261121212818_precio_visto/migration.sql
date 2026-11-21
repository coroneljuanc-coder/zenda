-- ZTV-16 / ZTV-17: precio que vio el visitante al agregar cada línea del carrito.
-- Solo sirve para avisar «El precio de este producto cambió»; el subtotal siempre usa el precio
-- vigente del catálogo (RN6 de ZTV-16).

-- 1) Columna sin obligar todavía, para no fallar si ya hay carritos guardados.
ALTER TABLE "LineaCarrito" ADD COLUMN "precioVisto" INTEGER;

-- 2) Las líneas que ya existan toman el precio vigente: el propio de la variante o el del producto.
UPDATE "LineaCarrito" AS l
SET "precioVisto" = COALESCE(v."precio", p."precio")
FROM "VarianteProducto" AS v
JOIN "Producto" AS p ON p."id" = v."productoId"
WHERE v."id" = l."varianteId";

-- 3) Desde ahora es obligatoria y siempre un precio válido.
ALTER TABLE "LineaCarrito" ALTER COLUMN "precioVisto" SET NOT NULL;
ALTER TABLE "LineaCarrito" ADD CONSTRAINT "LineaCarrito_precioVisto_positivo" CHECK ("precioVisto" > 0);
