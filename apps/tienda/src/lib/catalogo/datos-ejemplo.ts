import type { DatosCatalogo } from "./validacion";

/**
 * Catálogo de ejemplo del MVP (ZTV-7, D6): productos ficticios, cargados con `npm run db:seed`.
 * Precios en COP con IVA incluido (D4). Las fotos son ilustraciones de ejemplo en public/productos/.
 * Casos especiales para las historias del catálogo:
 * - "teclado-mecanico-compacto" está agotado (todas sus variantes con stock 0).
 * - "botella-termica-acero" tiene variantes con precios distintos ("Desde $ 49.900").
 * - "gorra-edicion-limitada" está inactivo: no debe aparecer en la tienda.
 */

type Variante = DatosCatalogo["productos"][number]["variantes"][number];

const foto = (slug: string, nombre: string) => [
  { url: `/productos/${slug}.svg`, textoAlternativo: `Foto de ejemplo: ${nombre}` },
];

const unica = (sku: string, stock: number): Variante[] => [{ sku, stock }];

export const DATOS_EJEMPLO = {
  categorias: [
    { nombre: "Ropa", slug: "ropa", descripcion: "Prendas cómodas para todos los días.", orden: 1 },
    { nombre: "Hogar", slug: "hogar", descripcion: "Cocina, descanso y decoración.", orden: 2 },
    { nombre: "Tecnología", slug: "tecnologia", descripcion: "Accesorios y audio.", orden: 3 },
    {
      nombre: "Deportes",
      slug: "deportes",
      descripcion: "Para entrenar en casa o al aire libre.",
      orden: 4,
    },
    {
      nombre: "Belleza y cuidado",
      slug: "belleza-y-cuidado",
      descripcion: "Cuidado personal y de la piel.",
      orden: 5,
    },
  ],
  productos: [
    // ---------- Ropa ----------
    {
      nombre: "Camiseta básica de algodón",
      slug: "camiseta-basica-algodon",
      descripcion: "Camiseta de cuello redondo en algodón 100 %, suave y fresca.",
      precio: 49_900,
      categoria: "ropa",
      variantes: [
        { sku: "ROP-CAM-BLA-S", talla: "S", color: "Blanco", stock: 12 },
        { sku: "ROP-CAM-BLA-M", talla: "M", color: "Blanco", stock: 20 },
        { sku: "ROP-CAM-NEG-M", talla: "M", color: "Negro", stock: 15 },
        { sku: "ROP-CAM-NEG-L", talla: "L", color: "Negro", stock: 6 },
      ],
      imagenes: foto("camiseta-basica-algodon", "Camiseta básica de algodón"),
    },
    {
      nombre: "Jean clásico de corte recto",
      slug: "jean-clasico-corte-recto",
      descripcion: "Jean en dril de algodón con un toque de elasticidad. Corte recto.",
      precio: 139_900,
      categoria: "ropa",
      variantes: [
        { sku: "ROP-JEA-28", talla: "28", color: "Azul", stock: 5 },
        { sku: "ROP-JEA-30", talla: "30", color: "Azul", stock: 9 },
        { sku: "ROP-JEA-32", talla: "32", color: "Azul", stock: 11 },
        { sku: "ROP-JEA-34", talla: "34", color: "Azul", stock: 4 },
      ],
      imagenes: foto("jean-clasico-corte-recto", "Jean clásico de corte recto"),
    },
    {
      nombre: "Chaqueta impermeable liviana",
      slug: "chaqueta-impermeable-liviana",
      descripcion: "Chaqueta rompevientos e impermeable, ideal para la lluvia de la tarde.",
      precio: 189_900,
      categoria: "ropa",
      variantes: [
        { sku: "ROP-CHA-S", talla: "S", color: "Verde oliva", stock: 0 },
        { sku: "ROP-CHA-M", talla: "M", color: "Verde oliva", stock: 7 },
        { sku: "ROP-CHA-L", talla: "L", color: "Verde oliva", stock: 3 },
      ],
      imagenes: foto("chaqueta-impermeable-liviana", "Chaqueta impermeable liviana"),
    },
    {
      nombre: "Buso de capota en algodón perchado",
      slug: "buso-capota-algodon",
      descripcion: "Buso abrigado con capota y bolsillo canguro.",
      precio: 119_900,
      categoria: "ropa",
      variantes: [
        { sku: "ROP-BUS-M", talla: "M", color: "Gris", stock: 10 },
        { sku: "ROP-BUS-L", talla: "L", color: "Gris", stock: 8 },
      ],
      imagenes: foto("buso-capota-algodon", "Buso de capota en algodón perchado"),
    },
    {
      nombre: "Gorra edición limitada",
      slug: "gorra-edicion-limitada",
      descripcion: "Gorra de una colección pasada. Producto inactivo, no se muestra en la tienda.",
      precio: 59_900,
      categoria: "ropa",
      activo: false,
      variantes: unica("ROP-GOR-UNI", 2),
      imagenes: foto("gorra-edicion-limitada", "Gorra edición limitada"),
    },
    // ---------- Hogar ----------
    {
      nombre: "Juego de sábanas doble de 200 hilos",
      slug: "juego-sabanas-doble-200-hilos",
      descripcion: "Sábana, sobresábana y dos fundas en percal de algodón.",
      precio: 159_900,
      categoria: "hogar",
      variantes: [
        { sku: "HOG-SAB-BLA", color: "Blanco", stock: 14 },
        { sku: "HOG-SAB-GRI", color: "Gris", stock: 9 },
      ],
      imagenes: foto("juego-sabanas-doble-200-hilos", "Juego de sábanas doble de 200 hilos"),
    },
    {
      nombre: "Set de 3 ollas antiadherentes",
      slug: "set-ollas-antiadherentes",
      descripcion:
        "Tres ollas con tapa de vidrio, aptas para estufa de gas, eléctrica y de inducción.",
      precio: 249_900,
      categoria: "hogar",
      variantes: unica("HOG-OLL-SET3", 6),
      imagenes: foto("set-ollas-antiadherentes", "Set de 3 ollas antiadherentes"),
    },
    {
      nombre: "Lámpara de escritorio LED",
      slug: "lampara-escritorio-led",
      descripcion: "Lámpara con brazo flexible, tres tonos de luz y puerto USB.",
      precio: 89_900,
      categoria: "hogar",
      variantes: [
        { sku: "HOG-LAM-NEG", color: "Negro", stock: 12 },
        { sku: "HOG-LAM-BLA", color: "Blanco", stock: 5 },
      ],
      imagenes: foto("lampara-escritorio-led", "Lámpara de escritorio LED"),
    },
    {
      nombre: "Taza de cerámica artesanal",
      slug: "taza-ceramica-artesanal",
      descripcion: "Taza de 350 ml hecha a mano; cada pieza es única.",
      precio: 29_900,
      categoria: "hogar",
      variantes: [
        { sku: "HOG-TAZ-AZU", color: "Azul", stock: 25 },
        { sku: "HOG-TAZ-TER", color: "Terracota", stock: 18 },
      ],
      imagenes: foto("taza-ceramica-artesanal", "Taza de cerámica artesanal"),
    },
    // ---------- Tecnología ----------
    {
      nombre: "Audífonos inalámbricos con cancelación de ruido",
      slug: "audifonos-inalambricos-cancelacion-ruido",
      descripcion: "Audífonos de diadema con hasta 30 horas de batería.",
      precio: 349_900,
      categoria: "tecnologia",
      variantes: unica("TEC-AUD-NEG", 8),
      imagenes: foto(
        "audifonos-inalambricos-cancelacion-ruido",
        "Audífonos inalámbricos con cancelación de ruido",
      ),
    },
    {
      nombre: "Cargador rápido USB-C de 30 W",
      slug: "cargador-rapido-usb-c-30w",
      descripcion: "Cargador de pared compatible con celulares, tabletas y portátiles livianos.",
      precio: 69_900,
      categoria: "tecnologia",
      variantes: unica("TEC-CAR-30W", 30),
      imagenes: foto("cargador-rapido-usb-c-30w", "Cargador rápido USB-C de 30 W"),
    },
    {
      nombre: "Teclado mecánico compacto",
      slug: "teclado-mecanico-compacto",
      descripcion: "Teclado mecánico de 68 teclas con distribución en español. Agotado por ahora.",
      precio: 279_900,
      categoria: "tecnologia",
      variantes: unica("TEC-TEC-68", 0),
      imagenes: foto("teclado-mecanico-compacto", "Teclado mecánico compacto"),
    },
    {
      nombre: "Parlante bluetooth resistente al agua",
      slug: "parlante-bluetooth-resistente-agua",
      descripcion: "Parlante portátil con certificación IP67 y 12 horas de batería.",
      precio: 159_900,
      categoria: "tecnologia",
      variantes: [
        { sku: "TEC-PAR-AZU", color: "Azul", stock: 7 },
        { sku: "TEC-PAR-NEG", color: "Negro", stock: 10 },
      ],
      imagenes: foto("parlante-bluetooth-resistente-agua", "Parlante bluetooth resistente al agua"),
    },
    // ---------- Deportes ----------
    {
      nombre: "Tapete de yoga antideslizante",
      slug: "tapete-yoga-antideslizante",
      descripcion: "Tapete de 6 mm con superficie antideslizante y correa para llevarlo.",
      precio: 99_900,
      categoria: "deportes",
      variantes: [
        { sku: "DEP-TAP-MOR", color: "Morado", stock: 9 },
        { sku: "DEP-TAP-VER", color: "Verde", stock: 11 },
      ],
      imagenes: foto("tapete-yoga-antideslizante", "Tapete de yoga antideslizante"),
    },
    {
      nombre: "Balón de fútbol n.º 5",
      slug: "balon-futbol-numero-5",
      descripcion: "Balón cosido a máquina, para cancha sintética o natural.",
      precio: 79_900,
      categoria: "deportes",
      variantes: unica("DEP-BAL-N5", 16),
      imagenes: foto("balon-futbol-numero-5", "Balón de fútbol n.º 5"),
    },
    {
      nombre: "Tenis livianos para correr",
      slug: "tenis-correr-livianos",
      descripcion: "Tenis con suela amortiguada y malla transpirable.",
      precio: 289_900,
      categoria: "deportes",
      variantes: [
        { sku: "DEP-TEN-38", talla: "38", color: "Negro", stock: 4 },
        { sku: "DEP-TEN-40", talla: "40", color: "Negro", stock: 6 },
        { sku: "DEP-TEN-42", talla: "42", color: "Negro", stock: 5 },
      ],
      imagenes: foto("tenis-correr-livianos", "Tenis livianos para correr"),
    },
    {
      nombre: "Botella térmica de acero",
      slug: "botella-termica-acero",
      descripcion: "Mantiene las bebidas frías 24 horas y calientes 12 horas.",
      precio: 59_900,
      categoria: "deportes",
      variantes: [
        { sku: "DEP-BOT-500", talla: "500 ml", stock: 12, precio: 49_900 },
        { sku: "DEP-BOT-750", talla: "750 ml", stock: 10 },
      ],
      imagenes: foto("botella-termica-acero", "Botella térmica de acero"),
    },
    // ---------- Belleza y cuidado ----------
    {
      nombre: "Crema hidratante facial",
      slug: "crema-hidratante-facial",
      descripcion: "Crema ligera con ácido hialurónico para todo tipo de piel. 50 ml.",
      precio: 54_900,
      categoria: "belleza-y-cuidado",
      variantes: unica("BEL-CRE-50", 20),
      imagenes: foto("crema-hidratante-facial", "Crema hidratante facial"),
    },
    {
      nombre: "Protector solar SPF 50",
      slug: "protector-solar-spf-50",
      descripcion: "Protector de amplio espectro, toque seco y sin color. 60 ml.",
      precio: 64_900,
      categoria: "belleza-y-cuidado",
      variantes: unica("BEL-PRO-50", 22),
      imagenes: foto("protector-solar-spf-50", "Protector solar SPF 50"),
    },
    {
      nombre: "Kit de brochas de maquillaje",
      slug: "kit-brochas-maquillaje",
      descripcion: "Ocho brochas de cerdas sintéticas con estuche.",
      precio: 74_900,
      categoria: "belleza-y-cuidado",
      variantes: unica("BEL-BRO-KIT8", 9),
      imagenes: foto("kit-brochas-maquillaje", "Kit de brochas de maquillaje"),
    },
    {
      nombre: "Champú sólido natural",
      slug: "champu-solido-natural",
      descripcion: "Barra de champú sin sulfatos, equivale a dos frascos de 250 ml.",
      precio: 32_900,
      categoria: "belleza-y-cuidado",
      variantes: unica("BEL-CHA-BAR", 30),
      imagenes: foto("champu-solido-natural", "Champú sólido natural"),
    },
  ],
} satisfies DatosCatalogo;
