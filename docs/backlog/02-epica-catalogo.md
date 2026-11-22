# Épica E1 – Catálogo

> Permite que un visitante encuentre y conozca los productos de Zenda.
> Borrador para revisión del Product Owner.

---

## CAT-01 · Crear diseño base de la tienda Zenda

**ID:** ZTV-10 (provisional CAT-01)
**Título:** Crear diseño base de la tienda Zenda
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 1
**Estado:** Hecho (aceptada por el PO el 2026-11-18)

### Historia
Como visitante,
quiero que todas las páginas de Zenda tengan el mismo encabezado, menú y pie de página, y que se vean bien en cualquier pantalla,
para orientarme fácilmente y reconocer la tienda.

### Contexto
Todas las historias del catálogo, el carrito y la compra se muestran dentro de esta estructura común. Construirla una sola vez evita repetir trabajo y garantiza que la tienda sea responsive y accesible desde el inicio.

### Criterios de aceptación
Escenario 1: Estructura visible en escritorio (camino feliz)
  Dado que abro cualquier página de Zenda en un computador
  Cuando la página carga
  Entonces veo el encabezado con el logo "Zenda", el menú de categorías, el ícono del carrito, y el pie de página con "© 2026 Zenda · Tienda de pruebas"

Escenario 2: Menú en celular (alterno)
  Dado que abro Zenda en un celular
  Cuando toco el botón "Menú" (ícono ☰)
  Entonces se despliega la lista de categorías, y se cierra al tocar "Cerrar" o una categoría

Escenario 3: Página inexistente (error)
  Dado que ingreso a una dirección que no existe, por ejemplo `/abc`
  Cuando la página carga
  Entonces veo el mensaje "No encontramos esta página" y un botón "Volver al inicio"

### Reglas de negocio
- RN1: El menú muestra las categorías de la base de datos en el orden del campo `orden`.
- RN2: El logo siempre lleva a la página de inicio.
- RN3: Mientras sea una tienda de pruebas, el pie de página muestra "Tienda de pruebas: no se realizan cobros reales".

### Requisitos no funcionales
- Responsive: celular (desde 360 px), tablet (768 px) y escritorio (1280 px), sin desplazamiento horizontal.
- Accesibilidad: WCAG 2.1 nivel AA; navegación completa con teclado; contraste mínimo de 4.5:1; enlace "Saltar al contenido".
- Rendimiento: LCP < 2.5 s en un celular con red 4G.

### Diseño / Interfaz
- Encabezado: logo de texto "Zenda" a la izquierda, menú de categorías (en escritorio) o botón ☰ (en celular), ícono de carrito a la derecha.
- Pie: "© 2026 Zenda · Tienda de pruebas" y "Tienda de pruebas: no se realizan cobros reales". Arriba, banner "Tienda en construcción: productos de ejemplo" (D8).
- Página 404: "No encontramos esta página" + botón "Volver al inicio".
- Paleta y tipografía: dirección «Vitrina», elegida por el PO el 2026-11-16 (ZTV-33, D7): blanco y negro #111111, gris #5A5A5A, superficie #F2F2F2, lima #C8F169 solo para «Nuevo»; esquinas rectas, sin sombras; letra Archivo; logo «zenda» en minúscula; texto base de 17 px.

### Notificaciones y correos
No aplica.

### Datos
Lee **Categoria** (nombre, slug, orden).

### Dependencias
- S0-01 a S0-04.
- Decisión D7 (identidad visual).

### Fuera de alcance
- Contador de productos en el ícono del carrito (CAR-01).
- Buscador en el encabezado (CAT-05).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAT-01-CP1 | 1 | E2E | Escritorio 1280×800, página de inicio | Encabezado con logo, categorías del seed, carrito y pie visibles |
| CAT-01-CP2 | 2 | E2E | Celular 390×844 | El botón ☰ abre y cierra el menú |
| CAT-01-CP3 | 3 | E2E | URL `/abc` | Mensaje "No encontramos esta página" y botón funcional |
| CAT-01-CP4 | 1 | Aceptación | Navegación solo con teclado | Todos los enlaces son alcanzables y el foco es visible |
| CAT-01-CP5 | D8 | E2E | Cualquier página | Banner "Tienda en construcción: productos de ejemplo" visible arriba |

**Resultados (2026-11-18):** CP1, CP2, CP3 y CP5 aprobados en E2E (celular y escritorio). CP4 aprobado con revisión manual y E2E, y confirmado por el PO al aceptar la historia. La prueba automática WCAG 2.1 AA (axe) pasa en cada PR. Defecto encontrado y corregido: ZTV-55.

### Notas técnicas
- `src/app/layout.tsx`: estructura común con `SaltarAlContenido`, `BannerPruebas`, `Encabezado` y `PiePagina` (en `src/components/estructura/`); `src/app/not-found.tsx` para la 404.
- Colores y letra como tokens de Tailwind 4 en `src/app/globals.css`; letra Archivo con `next/font`.
- Menú: `src/lib/catalogo/menu.ts` lee las categorías con `"use cache"` (1 hora, etiqueta `categorias`); `MenuCelular` es un componente de cliente (Escape cierra y devuelve el foco). Conexión única a la base en `src/lib/bd.ts`.
- Textos de tienda de pruebas en `src/lib/tienda.ts` (`TIENDA_DE_PRUEBAS`).
- Pruebas: E2E en `e2e/tienda/` (inicio, menú, 404 y accesibilidad con `@axe-core/playwright` 4.14.0) e integración del orden de categorías (RN1).
- PR: #14 (diseño base), #15 (menú), #16 (404) y #17 (accesibilidad y ZTV-55).

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas (D7 aceptada; la paleta se elige al iniciar CAT-01)
- [x] Aprobada por el Product Owner (planeación del Sprint 1, 2026-11-16)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `main` (PR #14 a #17)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (https://zenda-tienda.vercel.app)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-18)

---

## CAT-02 · Ver listado de productos

**ID:** ZTV-11 (provisional CAT-02)
**Título:** Ver listado de productos
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 1
**Versión:** v0.2.0
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-20)

### Historia
Como visitante,
quiero ver en la página de inicio un listado de productos con su foto, nombre y precio,
para descubrir qué vende Zenda sin tener que buscar.

### Contexto
Es la puerta de entrada de la tienda. Sin un listado, el visitante no tiene cómo llegar a un producto. Es la base sobre la que después se agregan los filtros y el ordenamiento (E8).

### Criterios de aceptación
Escenario 1: Listado con productos (camino feliz)
  Dado que existen productos activos
  Cuando abro la página de inicio
  Entonces veo hasta 12 productos, del más reciente al más antiguo, cada uno con foto, nombre y precio con formato "$ 89.900"

Escenario 2: Más de 12 productos (alterno)
  Dado que existen 20 productos activos
  Cuando toco "Siguiente" al final del listado
  Entonces veo los productos 13 a 20 y la URL cambia a `?pagina=2`

Escenario 3: Producto agotado (alterno)
  Dado un producto activo cuyas variantes tienen stock 0
  Cuando aparece en el listado
  Entonces se muestra con la etiqueta "Agotado" y su foto atenuada

Escenario 4: Sin productos (error)
  Dado que no hay productos activos
  Cuando abro la página de inicio
  Entonces veo el mensaje "Pronto tendremos productos para ti. Vuelve más tarde."

### Reglas de negocio
- RN1: Solo se muestran productos con `activo = true`.
- RN2: El precio mostrado es el precio final en COP con IVA incluido (D4), sin decimales, con punto de miles: "$ 89.900".
- RN3: Si las variantes tienen precios distintos, se muestra "Desde $ X" con el menor precio.
- RN4: Un producto está "Agotado" cuando la suma del stock de sus variantes es 0.
- RN5: 12 productos por página. Una página inexistente (`?pagina=99`) muestra la última página válida.

### Requisitos no funcionales
- Responsive: 2 columnas en celular, 3 en tablet y 4 en escritorio.
- Rendimiento: imágenes optimizadas con carga diferida (lazy loading); LCP < 2.5 s en 4G.
- Accesibilidad: cada foto tiene texto alternativo; la tarjeta completa es un enlace con nombre accesible.

### Diseño / Interfaz
- Título "Productos" y una cuadrícula de tarjetas (foto cuadrada, nombre de máximo 2 líneas, precio en negrita).
- Paginación: "Anterior" · "Página 1 de 2" · "Siguiente".
- Mensajes: "Agotado", "Pronto tendremos productos para ti. Vuelve más tarde."

### Notificaciones y correos
No aplica.

### Datos
Lee **Producto** (nombre, slug, precio, activo, creadoEn), **VarianteProducto** (stock, precio) e **ImagenProducto** (la de `orden` = 1).

### Dependencias
- S0-03 (datos de ejemplo) y CAT-01 (diseño base).

### Fuera de alcance
- Filtros por precio y valoración, y ordenamiento (E8).
- Mostrar la valoración con estrellas (E6).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAT-02-CP1 | 1 | E2E | Seed con 20 productos | 12 tarjetas, ordenadas por fecha descendente |
| CAT-02-CP2 | 1 | Unitaria | `formatearCOP(1250000)` | "$ 1.250.000" |
| CAT-02-CP3 | 2 | E2E | Clic en "Siguiente" | 8 tarjetas, URL `?pagina=2` |
| CAT-02-CP4 | 3 | Unitaria | Variantes con stock 0 y 0 | `estaAgotado()` = true |
| CAT-02-CP5 | 3 | Unitaria | Variantes con precios 50.000 y 45.000 | Texto "Desde $ 45.000" |
| CAT-02-CP6 | 4 | Integración | BD sin productos activos | Mensaje de catálogo vacío |

### Notas técnicas
- Ruta `src/app/page.tsx` con el listado dentro de `Suspense`; consulta con Prisma usando `skip/take` en `src/lib/catalogo/productos.ts`, guardada en caché unos minutos (`src/lib/catalogo/listado.ts`).
- Lógica pura en `src/lib/catalogo/reglas.ts`: `estaAgotado()`, `textoPrecio()` y la paginación; probada con Vitest.
- Componentes `TarjetaProducto`, `CuadriculaProductos` y `Paginacion`. `next/image` optimiza las fotos (WebP desde ZTV-56).
- PR: #19.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (planeación del Sprint 1, 2026-11-16)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` (a `main` en la publicación del sprint)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (ambiente de revisión; producción al publicar v0.2.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-20)

---

## CAT-03 · Navegar productos por categoría

**ID:** ZTV-12 (provisional CAT-03)
**Título:** Navegar productos por categoría
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 1
**Versión:** v0.2.0
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-20)

### Historia
Como visitante,
quiero ver solo los productos de una categoría,
para encontrar más rápido lo que me interesa.

### Contexto
Zenda vende productos de todo tipo. Sin categorías, el listado se vuelve difícil de recorrer. Esta es la forma principal de navegación del MVP mientras llegan los filtros avanzados.

### Criterios de aceptación
Escenario 1: Categoría con productos (camino feliz)
  Dado que la categoría "Hogar" tiene 4 productos activos (corregido: decía 6; el seed tiene 4)
  Cuando toco "Hogar" en el menú
  Entonces voy a `/categoria/hogar`, veo el título "Hogar", su descripción y solo esos 4 productos

Escenario 2: Categoría sin productos (alterno)
  Dado una categoría sin productos activos
  Cuando entro a ella
  Entonces veo "Aún no hay productos en esta categoría." y un enlace "Ver todos los productos"

Escenario 3: Categoría inexistente (error)
  Dado que ingreso a `/categoria/no-existe`
  Cuando la página carga
  Entonces veo la página "No encontramos esta página" (404)

### Reglas de negocio
- RN1: Se aplican las mismas reglas de visualización, precio, agotado y paginación de CAT-02.
- RN2: En el menú, la categoría activa se resalta.
- RN3: La URL de la categoría usa su `slug`.

### Requisitos no funcionales
- Responsive, rendimiento y accesibilidad iguales a CAT-02.
- SEO: título de la página con la categoría y "Zenda" ("Hogar | Zenda", decisión del PO en la Sprint Review del 2026-11-20, ZTV-57) y meta descripción con la descripción de la categoría.

### Diseño / Interfaz
- Ruta de navegación (breadcrumb): "Inicio › Hogar".
- Título de la categoría, descripción breve y la misma cuadrícula de CAT-02.
- Mensaje de vacío: "Aún no hay productos en esta categoría." + enlace "Ver todos los productos".

### Notificaciones y correos
No aplica.

### Datos
Lee **Categoria** (nombre, slug, descripcion) y **Producto** filtrado por `categoriaId`.

### Dependencias
- CAT-01, CAT-02 (reutiliza la cuadrícula y la paginación).

### Fuera de alcance
- Subcategorías.
- Combinar varias categorías a la vez (E8).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAT-03-CP1 | 1 | E2E | Clic en "Hogar" (seed) | Solo los 4 productos de Hogar; breadcrumb correcto |
| CAT-03-CP2 | 1 | Integración | Consulta por categoría | No aparecen productos inactivos ni de otras categorías |
| CAT-03-CP3 | 2 | Integración | Categoría de prueba vacía | Mensaje de vacío y enlace |
| CAT-03-CP4 | 3 | E2E | `/categoria/no-existe` | Página 404 |

### Notas técnicas
- Ruta `src/app/categoria/[slug]/page.tsx`; `notFound()` si el slug no existe. Las categorías conocidas se generan por adelantado (`generateStaticParams`).
- Con la precarga parcial de Next.js 16, la primera visita a una categoría desconocida responde 200 con la página 404 y la marca `noindex`; las siguientes responden 404.
- Se reutiliza `CuadriculaProductos` de CAT-02. El enlace activo del menú (`EnlaceCategoria`) usa `aria-current="page"`.
- PR: #21.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (planeación del Sprint 1, 2026-11-16)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` (a `main` en la publicación del sprint)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (ambiente de revisión; producción al publicar v0.2.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-20)

---

## CAT-04 · Ver ficha de producto

**ID:** ZTV-13 (provisional CAT-04)
**Título:** Ver ficha de producto
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 1
**Versión:** v0.2.0
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-20)

### Historia
Como visitante,
quiero ver la ficha completa de un producto con sus fotos, descripción, precio y disponibilidad,
para decidir si lo compro.

### Contexto
La decisión de compra se toma en la ficha. Debe mostrar toda la información necesaria y dejar listo el espacio del botón "Agregar al carrito", que se activa en CAR-01.

### Criterios de aceptación
Escenario 1: Producto disponible (camino feliz)
  Dado un producto activo con stock
  Cuando toco su tarjeta en el listado
  Entonces voy a `/producto/{slug}` y veo su galería de fotos, nombre, precio "$ 89.900", descripción, categoría y el texto "Disponible"

Escenario 2: Pocas unidades (alterno)
  Dado un producto con stock total entre 1 y 5
  Cuando abro su ficha
  Entonces veo "¡Últimas 3 unidades!" (con el número real)

Escenario 3: Producto agotado (alterno)
  Dado un producto con stock total 0
  Cuando abro su ficha
  Entonces veo "Agotado" y el área de compra muestra "Este producto no está disponible por ahora"

Escenario 4: Producto inexistente o inactivo (error)
  Dado que ingreso a `/producto/no-existe` o al slug de un producto inactivo
  Cuando la página carga
  Entonces veo la página "No encontramos esta página" (404)

### Reglas de negocio
- RN1: Se muestran todas las fotos del producto, en el orden del campo `orden`.
- RN2: Disponibilidad: stock 0 → "Agotado"; de 1 a 5 → "¡Últimas N unidades!"; más de 5 → "Disponible". No se muestra el número exacto cuando es mayor que 5. Con 1 unidad se muestra "¡Última unidad!" (en singular; confirmado por el PO en la Sprint Review del 2026-11-20).
- RN3: Un producto inactivo no es accesible por URL.
- RN4: El precio sigue RN2 y RN3 de CAT-02.

### Requisitos no funcionales
- Responsive: en celular, la galería ocupa todo el ancho y se desliza con el dedo; en escritorio, la galería va a la izquierda y la información a la derecha.
- Accesibilidad: las miniaturas de la galería son botones con texto alternativo; el estado de disponibilidad se anuncia con texto (no solo con color).
- Rendimiento: la primera foto se carga con prioridad; las demás, de forma diferida.
- SEO: título con el nombre del producto y "Zenda" ("Nombre | Zenda", decisión del PO en la Sprint Review del 2026-11-20, ZTV-57) y vista previa para redes sociales (Open Graph) con la primera foto.

### Diseño / Interfaz
- Breadcrumb "Inicio › Categoría › Producto".
- Galería con foto principal y miniaturas.
- Nombre, precio, disponibilidad, descripción.
- Área de compra (en esta historia sin acción): botón "Agregar al carrito" deshabilitado con el texto "Próximamente".
- Mensajes exactos: "Disponible", "¡Últimas N unidades!", "Agotado", "Este producto no está disponible por ahora".

### Notificaciones y correos
No aplica.

### Datos
Lee **Producto**, **VarianteProducto** (stock), **ImagenProducto** y **Categoria**.

### Dependencias
- CAT-01, CAT-02.

### Fuera de alcance
- Elegir talla y color (CAT-06).
- Agregar al carrito (CAR-01).
- Reseñas y valoraciones (E6).
- Productos relacionados.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAT-04-CP1 | 1 | E2E | Clic en un producto del seed | Ficha completa con "Disponible" |
| CAT-04-CP2 | 2 | Unitaria | `textoDisponibilidad(3)` | "¡Últimas 3 unidades!" |
| CAT-04-CP3 | 2 | Unitaria | `textoDisponibilidad(6)` / `(5)` | "Disponible" / "¡Últimas 5 unidades!" (valores límite) |
| CAT-04-CP4 | 3 | Unitaria | `textoDisponibilidad(0)` | "Agotado" |
| CAT-04-CP5 | 4 | E2E | Slug de producto inactivo | Página 404 |
| CAT-04-CP6 | 1 | E2E | Celular 390×844 | La galería se desliza con gestos |

### Notas técnicas
- Ruta `src/app/producto/[slug]/page.tsx` con `generateMetadata` para SEO y vista previa para redes.
- `textoDisponibilidad(stock)` y `stockTotal()` en `src/lib/catalogo/reglas.ts`; consulta `consultarProducto()` en `src/lib/catalogo/productos.ts`.
- Componente `Galeria`: carrusel deslizable en celular; foto principal con miniaturas en escritorio.
- PR: #22.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (planeación del Sprint 1, 2026-11-16)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` (a `main` en la publicación del sprint)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (ambiente de revisión; producción al publicar v0.2.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-20)

---

## ZTV-56 · Mostrar fotos realistas en los productos de ejemplo

**ID:** ZTV-56
**Título:** Mostrar fotos realistas en los productos de ejemplo
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Should
**Estimación:** 2
**Sprint:** 1 (ajuste pedido por el PO en la Sprint Review del 2026-11-20)
**Versión:** v0.2.0
**Estado:** Hecho (aceptada por el PO el 2026-11-20)

### Historia
Como visitante,
quiero ver fotos realistas de cada producto,
para hacerme una idea de cómo es antes de comprarlo.

### Contexto
Los productos de ejemplo usaban ilustraciones planas (SVG). En la Sprint Review el PO pidió fotos generadas con IA para que la tienda se vea más real mientras llegan las fotos de verdad. Deben seguir la dirección visual «Vitrina» y no verse «hechas por IA».

### Criterios de aceptación
Escenario 1: Fotos en el catálogo (camino feliz)
  Dado que abro el inicio, una categoría o una ficha
  Cuando carga la página
  Entonces cada producto muestra su foto realista sobre fondo gris claro, con el texto alternativo «Foto de ejemplo: [nombre]»

Escenario 2: Desde el celular (alterno)
  Dado que entro desde un celular
  Cuando carga el listado
  Entonces las fotos llegan en tamaño reducido y optimizado (WebP/AVIF), sin deformarse (cuadradas)

Escenario 3: Foto que no carga (error)
  Dado que una foto no se puede cargar
  Cuando se muestra la tarjeta
  Entonces el espacio cuadrado se mantiene, se lee el texto alternativo y la página no se rompe

### Reglas de negocio
- RN1: Una foto por producto, cuadrada (1:1), producto solo, sin texto, logos ni marcas reales.
- RN2: Estilo «Vitrina»: luz de estudio suave, fondo gris claro (#F2F2F2), sin degradados ni escenas recargadas.
- RN3: El texto alternativo sigue diciendo «Foto de ejemplo», porque no es el producto real.
- RN4: El costo sale del saldo gratuito de créditos; cualquier gasto adicional lo aprueba el PO.

### Requisitos no funcionales
- Rendimiento: cada foto pesa menos de 150 KB en el repositorio y Next.js la sirve optimizada según la pantalla.
- Accesibilidad: WCAG 2.1 AA (pruebas axe en verde).
- Responsive: celular, tablet y escritorio.

### Diseño / Interfaz
Sin cambios de diseño: solo cambia la imagen de la tarjeta, la galería de la ficha y la vista previa para redes sociales.

### Notificaciones y correos
No aplica.

### Datos
**ImagenProducto.url** pasa de `/productos/[slug].svg` a `/productos/[slug].webp`. La carga de datos de ejemplo actualiza la dirección en bases existentes. La gorra inactiva conserva su ilustración SVG.

### Dependencias
- CAT-02, CAT-03, CAT-04.
- Servicio de generación de imágenes Higgsfield (saldo gratuito).

### Fuera de alcance
- Varias fotos por producto, fotos reales, zoom y subir fotos desde un panel.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| FOT-CP1 | 1 y 2 | E2E | Inicio | Tarjetas con foto WebP servida por el optimizador de Next.js y alt «Foto de ejemplo: …» |
| FOT-CP2 | 1 | E2E | lampara-escritorio-led | La vista previa para redes (`og:image`) termina en `.webp` |
| FOT-CP3 | 1 | E2E (axe) | Inicio, categoría y ficha | Sin violaciones WCAG 2.1 AA |
| FOT-CP4 | Datos | Integración | Base con dirección `.svg` | Al repetir la carga queda `.webp` |
| FOT-CP5 | 1 | Aceptación | Ambiente de revisión | El PO aprueba el estilo |

### Notas técnicas
- Modelo Z Image (0,15 créditos por foto), elegido por el PO frente a Seedream 5.0 Flash tras una prueba con la lámpara. Gasto total: 3,80 créditos.
- 20 fotos WebP de 900 px (6 a 55 KB) en `apps/tienda/public/productos/`. Se repitieron el champú (traía un «55%» grabado) y las brochas (estuche cortado); al cargador se le neutralizó el fondo azulado.
- `foto(slug, nombre, formato)` en `datos-ejemplo.ts`; `TarjetaProducto` y `Galeria` solo desactivan la optimización para SVG.
- PR: #24.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (2026-11-20)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` (a `main` en la publicación del sprint)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (ambiente de revisión; producción al publicar v0.2.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-20)

---

## CAT-05 · Buscar productos por nombre

**ID:** ZTV-14 (provisional CAT-05)
**Título:** Buscar productos por nombre
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Should
**Estimación:** 3
**Sprint:** Backlog (salió del Sprint 2 en la planeación del 2026-11-20 por capacidad)
**Estado:** Por hacer

### Historia
Como visitante,
quiero buscar productos escribiendo una palabra,
para llegar directo a lo que necesito sin recorrer las categorías.

### Contexto
Con productos de todo tipo, navegar por categorías no siempre basta. La búsqueda simple por texto cubre el caso más común. Los filtros avanzados llegan en E8.

### Criterios de aceptación
Escenario 1: Búsqueda con resultados (camino feliz)
  Dado que existe el producto "Camiseta básica de algodón"
  Cuando escribo "camiseta" en el buscador y presiono Enter
  Entonces voy a `/buscar?q=camiseta` y veo "3 resultados para «camiseta»" con los productos que coinciden

Escenario 2: Búsqueda sin tildes ni mayúsculas (alterno)
  Dado el producto "Lámpara de mesa"
  Cuando busco "LAMPARA"
  Entonces el producto aparece en los resultados

Escenario 3: Sin resultados (alterno)
  Dado que ningún producto coincide con "xyz123"
  Cuando busco "xyz123"
  Entonces veo "No encontramos productos para «xyz123». Revisa la ortografía o explora nuestras categorías." y los enlaces a las categorías

Escenario 4: Búsqueda muy corta (error)
  Dado que escribo solo una letra, por ejemplo "a"
  Cuando presiono Enter
  Entonces no se realiza la búsqueda y veo "Escribe al menos 2 caracteres"

### Reglas de negocio
- RN1: Se busca en el nombre y en la descripción de los productos activos.
- RN2: La búsqueda ignora mayúsculas y tildes.
- RN3: Mínimo 2 y máximo 60 caracteres; se eliminan los espacios al inicio y al final.
- RN4: Los resultados que coinciden en el nombre aparecen antes que los que coinciden solo en la descripción.
- RN5: Se aplican las reglas de precio, agotado y paginación de CAT-02.

### Requisitos no funcionales
- Rendimiento: respuesta en menos de 1 s con 1.000 productos.
- Seguridad: el texto de búsqueda se trata como dato, nunca como código (protección contra inyección SQL y XSS).
- Accesibilidad: el campo tiene la etiqueta "Buscar productos"; el número de resultados se anuncia a los lectores de pantalla.
- Responsive: en celular, el buscador se abre desde un ícono de lupa en el encabezado.

### Diseño / Interfaz
- Campo en el encabezado con el texto de ayuda "Buscar en Zenda…" y un botón de lupa.
- Mensajes: "N resultados para «texto»", "1 resultado para «texto»", "No encontramos productos para «texto». Revisa la ortografía o explora nuestras categorías.", "Escribe al menos 2 caracteres".

### Notificaciones y correos
No aplica.

### Datos
Lee **Producto** (nombre, descripcion, activo).

### Dependencias
- CAT-01, CAT-02.

### Fuera de alcance
- Sugerencias mientras se escribe (autocompletar).
- Tolerancia a errores de ortografía ("camisteta").
- Filtros dentro de los resultados (E8).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAT-05-CP1 | 1 | E2E | "camiseta" | Resultados correctos y contador |
| CAT-05-CP2 | 2 | Integración | "LAMPARA" vs. "Lámpara de mesa" | Coincide |
| CAT-05-CP3 | 3 | E2E | "xyz123" | Mensaje de sin resultados + categorías |
| CAT-05-CP4 | 4 | Unitaria | "a", "  a ", texto de 61 caracteres | Validación rechaza los tres |
| CAT-05-CP5 | 1 | Integración | "algodon" en nombre y en descripción de otro producto | El de nombre aparece primero |
| CAT-05-CP6 | 1 | Integración | `' OR 1=1 --` | Sin error; 0 resultados |

### Notas técnicas
- Búsqueda en PostgreSQL con la extensión `unaccent` + `ILIKE` (suficiente para el MVP; se puede migrar a búsqueda de texto completo más adelante).
- Validación del parámetro `q` con Zod.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [ ] Aprobada por el Product Owner

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner

---

## CAT-06 · Seleccionar talla y color en la ficha

**ID:** ZTV-15 (provisional CAT-06)
**Título:** Seleccionar talla y color en la ficha
**Épica:** E1 – Catálogo
**Tipo:** Historia
**Prioridad (MoSCoW):** Should (D5)
**Estimación:** 5
**Sprint:** 2
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-21; v0.3.0)

### Historia
Como visitante,
quiero elegir la talla y el color de un producto y ver si esa combinación está disponible,
para comprar exactamente la versión que necesito.

### Contexto
Algunos productos (por ejemplo, ropa) existen en varias tallas y colores, cada uno con su propio inventario. El modelo de datos ya lo soporta desde S0-03; esta historia agrega la selección en pantalla.

### Criterios de aceptación
Escenario 1: Combinación disponible (camino feliz)
  Dado un producto con tallas S, M, L y colores Negro y Blanco
  Cuando elijo "M" y "Negro"
  Entonces veo el precio y la disponibilidad de esa combinación, y la URL cambia a `?variante={sku}`

Escenario 2: Combinación agotada (alterno)
  Dado que la combinación "L / Blanco" tiene stock 0
  Cuando elijo "L"
  Entonces el color "Blanco" aparece tachado y, si lo selecciono, veo "Esta combinación está agotada"

Escenario 3: Intentar continuar sin elegir (error)
  Dado un producto con variantes y ninguna seleccionada
  Cuando toco "Agregar al carrito"
  Entonces veo "Selecciona una talla" (o "Selecciona un color") junto al selector que falta, y no se agrega nada

Escenario 4: Producto con una sola variante (alterno)
  Dado un producto sin talla ni color
  Cuando abro su ficha
  Entonces no se muestran selectores y la variante única queda seleccionada automáticamente

### Reglas de negocio
- RN1: Si una variante tiene precio propio, se muestra ese precio al seleccionarla; si no, se usa el del producto.
- RN2: Una combinación con stock 0 se puede ver, pero no agregar al carrito.
- RN3: Las tallas se muestran en un orden lógico (XS, S, M, L, XL o numérico ascendente), no alfabético.

### Requisitos no funcionales
- Accesibilidad: los selectores son grupos de botones de opción con nombre accesible ("Talla", "Color"); el color se indica con texto además de la muestra visual.
- Responsive: los botones de opción miden al menos 44×44 px en celular.
- Rendimiento: el cambio de variante no recarga la página.

### Diseño / Interfaz
- Grupo "Talla": botones S · M · L. Grupo "Color": muestras de color con su nombre.
- Mensajes: "Selecciona una talla", "Selecciona un color", "Esta combinación está agotada".

### Notificaciones y correos
No aplica.

### Datos
Lee **VarianteProducto** (sku, talla, color, stock, precio).

### Dependencias
- CAT-04. Se coordina con CAR-01 (el carrito guarda la variante elegida).
- Decisión D5.

### Fuera de alcance
- Fotos distintas por color.
- Avisarme cuando vuelva a estar disponible.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAT-06-CP1 | 1 | E2E | Camiseta seed, M/Negro | Precio y disponibilidad de la variante; URL con el SKU |
| CAT-06-CP2 | 2 | E2E | L/Blanco con stock 0 | Opción tachada y mensaje de agotado |
| CAT-06-CP3 | 3 | E2E | Sin selección + "Agregar" | Mensaje junto al selector; carrito sin cambios |
| CAT-06-CP4 | 4 | E2E | Producto de variante única | Sin selectores |
| CAT-06-CP5 | 1 | Unitaria | `ordenarTallas(["L","XS","M"])` | ["XS","M","L"] |

### Notas técnicas
- Lógica pura en `lib/catalogo/variantes.ts` (`ordenarTallas`, `opcionesDe`, `seleccionInicial`, `buscarVariante`, `evaluarSeleccion`, `opcionDisponible`, `textoFalta`), con pruebas unitarias. `consultarProducto` devuelve las variantes con el precio ya resuelto (RN1).
- Componente cliente `CompraProducto`: radios accesibles «Talla» y «Color» (mínimo 44×44 px). Lee `?variante={sku}` una vez al abrir y actualiza la dirección al elegir, sin recargar.
- Las opciones agotadas se anuncian con «(agotada)» y se ven tachadas; si solo hay una talla o un color, queda elegido de una vez.
- **Datos de prueba reales (CAT-06-CP2):** el seed no tiene «L / Blanco» con stock 0 (la camiseta no existe en Blanco talla L). CP2 se prueba con la chaqueta talla S (stock 0) y con camiseta L + Blanco, que se muestra agotada porque no existe.
- Defecto relacionado: ZTV-73, corregido en ZTV-16. PR #29.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias resueltas (D5 aceptada)
- [x] Aprobada por el Product Owner (el sprint arrancó sin aprobación previa por decisión del PO; aceptada en la review)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` y a `main` (v0.3.0, PR #34)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (producción con v0.3.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-21)
