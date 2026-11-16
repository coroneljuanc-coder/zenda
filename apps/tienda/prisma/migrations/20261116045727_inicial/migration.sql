-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianteProducto" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "talla" TEXT,
    "color" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "precio" INTEGER,

    CONSTRAINT "VarianteProducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImagenProducto" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "textoAlternativo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "ImagenProducto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Producto_slug_key" ON "Producto"("slug");

-- CreateIndex
CREATE INDEX "Producto_categoriaId_idx" ON "Producto"("categoriaId");

-- CreateIndex
CREATE UNIQUE INDEX "VarianteProducto_sku_key" ON "VarianteProducto"("sku");

-- CreateIndex
CREATE INDEX "VarianteProducto_productoId_idx" ON "VarianteProducto"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ImagenProducto_productoId_orden_key" ON "ImagenProducto"("productoId", "orden");

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VarianteProducto" ADD CONSTRAINT "VarianteProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImagenProducto" ADD CONSTRAINT "ImagenProducto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas de negocio protegidas también en la base de datos (ZTV-7), además de la validación con Zod.
-- RN1: los precios son enteros en COP y mayores que 0.
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_precio_positivo" CHECK ("precio" > 0);
ALTER TABLE "VarianteProducto" ADD CONSTRAINT "VarianteProducto_precio_positivo" CHECK ("precio" IS NULL OR "precio" > 0);
-- RN3: el stock nunca es negativo.
ALTER TABLE "VarianteProducto" ADD CONSTRAINT "VarianteProducto_stock_no_negativo" CHECK ("stock" >= 0);
-- RN4: el slug va en minúsculas, sin tildes, con palabras separadas por guiones.
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_slug_formato" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_slug_formato" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
