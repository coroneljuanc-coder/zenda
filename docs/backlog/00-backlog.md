# Backlog del producto: Zenda (borrador v0.2)

> Estado: **decisiones D1–D7 aceptadas por el PO (2026-11-15)**. Épicas e historias registradas en Jira, proyecto **ZTV** (épicas ZTV-1 a ZTV-4, historias ZTV-5 a ZTV-25), el 2026-11-15. Arquitectura C aprobada (ADR-001): agrega ZTV-24 y ZTV-25 y ajusta ZTV-21 y ZTV-23 (ver `05-ajustes-arquitectura-c.md`). Pendiente: aprobación final del PO de cada historia (DoR).
> Fecha: 2026-11-15

## Visión del producto
Zenda es una tienda virtual de un solo vendedor donde cualquier persona en Colombia puede encontrar productos por categoría, armar su carrito y pagar en línea de forma segura, con precios en pesos colombianos.

## Objetivo del MVP
Un visitante puede **encontrar un producto, agregarlo al carrito y pagarlo** (en el modo de pruebas de la pasarela) y recibir un correo de confirmación, desde el celular o el computador.

---

## Decisiones del Product Owner
**Todas aceptadas por el PO el 2026-11-15.** Las historias las citan como (D#).

| # | Tema | Decisión | Por qué |
|---|---|---|---|
| D1 | Pasarela de pago | **Wompi** | Es colombiana (Bancolombia), su sandbox es sencillo y trae tarjeta, PSE y Nequi. |
| D2 | ¿Se puede comprar sin cuenta en el MVP? | **Sí, como invitado** | Así el MVP queda más pequeño. El registro llega en una épica posterior. |
| D3 | Costo de envío | **Fijo de $12.000 a todo el país; gratis desde $200.000** | Es fácil de entender y de probar. La tarifa por ciudad puede llegar después. |
| D4 | IVA | **Precio mostrado = precio final con IVA incluido** | El Estatuto del Consumidor (Ley 1480) exige mostrar el precio total con impuestos. |
| D5 | Variantes (talla y color) en el MVP | **Modelarlas desde el Sprint 0, pero el selector en pantalla es "Should"** | Evita rehacer la base de datos después. Si el tiempo aprieta, los primeros productos tienen una sola variante. |
| D6 | ¿Cómo se cargan los productos sin panel de administración? | **Datos de ejemplo (seed) cargados por código** | El panel de administración es una épica posterior. |
| D7 | Identidad visual (logo, colores, tipografía) | **Logo de texto "Zenda" y una paleta sobria que tú apruebas** | Si ya tienes logo o colores, me los compartes. |

---

## Épicas

| Épica | Descripción | Fase |
|---|---|---|
| E0 – Fundaciones técnicas | Repositorio, pruebas, CI/CD, base de datos, despliegue y herramientas | Sprint 0 |
| E1 – Catálogo | Ver, navegar, buscar y consultar productos | MVP |
| E2 – Carrito | Agregar, ver y modificar productos del carrito | MVP |
| E3 – Compra | Datos de envío, pago con la pasarela y confirmación | MVP |
| E4 – Cuentas de cliente | Registro, inicio de sesión y correo de bienvenida | Posterior |
| E5 – Pedidos | Historial, seguimiento y correos de cambio de estado | Posterior |
| E6 – Reseñas y valoraciones | Calificar y comentar productos | Posterior |
| E7 – Administración | Gestión de productos, inventario, pedidos y clientes | Posterior |
| E8 – Búsqueda avanzada | Filtros por precio, categoría y valoración, y ordenamiento | Posterior |
| E9 – Recuperación de ventas | Recordatorio de carrito abandonado | Posterior |

---

## Backlog priorizado (MVP)

| Orden | Jira (ID provisional) | Título | Épica | Tipo | MoSCoW | Pts | Sprint propuesto |
|---|---|---|---|---|---|---|---|
| 1 | ZTV-5 (S0-01) | Crear repositorio y proyecto Next.js con TypeScript | E0 | Habilitador técnico | Must | 2 | 0 |
| 2 | ZTV-6 (S0-02) | Configurar pruebas automáticas e integración continua | E0 | Habilitador técnico | Must | 3 | 0 |
| 3 | ZTV-7 (S0-03) | Configurar base de datos con productos de ejemplo | E0 | Habilitador técnico | Must | 3 | 0 |
| 4 | ZTV-8 (S0-04) | Desplegar automáticamente en Vercel | E0 | Habilitador técnico | Must | 2 | 0 |
| 5 | ZTV-9 (S0-05) | Preparar Jira y Confluence para el proyecto | E0 | Habilitador técnico | Must | 2 | 0 |
| 5b | ZTV-24 (S0-06) | Estructurar el repositorio para dos aplicaciones | E0 | Habilitador técnico | Must | 3 | 0 |
| 6 | ZTV-10 (CAT-01) | Crear diseño base de la tienda Zenda | E1 | Habilitador técnico | Must | 3 | 1 |
| 7 | ZTV-11 (CAT-02) | Ver listado de productos | E1 | Historia | Must | 3 | 1 |
| 8 | ZTV-12 (CAT-03) | Navegar productos por categoría | E1 | Historia | Must | 3 | 1 |
| 9 | ZTV-13 (CAT-04) | Ver ficha de producto | E1 | Historia | Must | 3 | 1 |
| 10 | ZTV-16 (CAR-01) | Agregar producto al carrito | E2 | Historia | Must | 5 | 2 |
| 11 | ZTV-17 (CAR-02) | Ver carrito con subtotal | E2 | Historia | Must | 3 | 2 |
| 12 | ZTV-18 (CAR-03) | Modificar cantidades y eliminar productos del carrito | E2 | Historia | Must | 3 | 2 |
| 13 | ZTV-14 (CAT-05) | Buscar productos por nombre | E1 | Historia | Should | 3 | 2 |
| 14 | ZTV-15 (CAT-06) | Seleccionar talla y color en la ficha | E1 | Historia | Should (D5) | 5 | 2 o posterior |
| 15 | ZTV-19 (COM-01) | Ingresar datos de contacto y envío | E3 | Historia | Must | 5 | 3 |
| 16 | ZTV-20 (COM-02) | Crear pedido y redirigir al pago | E3 | Historia | Must | 5 | 3 |
| 17 | ZTV-21 (COM-03) | Confirmar pago y actualizar pedido e inventario | E3 | Historia | Must | 5 | 3 |
| 18 | ZTV-22 (COM-04) | Mostrar resultado del pago al cliente | E3 | Historia | Must | 3 | 4 |
| 19 | ZTV-25 (COM-06) | Publicar y recibir el evento "pedido pagado" | E3 | Habilitador técnico | Must | 5 | 4 |
| 20 | ZTV-23 (COM-05) | Enviar correo de confirmación de compra | E3 | Historia | Must | 3 | 4 |

**Total MVP:** 15 pts (Sprint 0) + 57 pts (Sprints 1 a 4) = **72 puntos** (incluye ZTV-24 y ZTV-25 de la arquitectura C).

### Plan tentativo de sprints
Todavía no conocemos nuestra **velocidad**, es decir, cuántos puntos terminamos por semana. La calibramos con el Sprint 0 y el Sprint 1, y después reajustamos este plan.

| Sprint | Objetivo (una frase) | Historias | Pts |
|---|---|---|---|
| 0 | El entorno está listo para que cada cambio se pruebe y se publique solo. | ZTV-5 a ZTV-9 + ZTV-24 | 15 |
| 1 | Un visitante puede explorar el catálogo de Zenda desde el celular. | CAT-01 a CAT-04 | 12 |
| 2 | Un visitante puede armar y ajustar su carrito. | CAR-01 a CAR-03, CAT-05 (+ CAT-06 si hay capacidad) | 14 (19) |
| 3 | Un visitante puede pagar su pedido en el modo de pruebas de Wompi. | COM-01 a COM-03 | 15 |
| 4 | El cliente ve el resultado de su compra y recibe la confirmación por correo. | ZTV-22, ZTV-25, ZTV-23 + ajustes o deuda del MVP | 11+ |

---

## Cambios frente a la propuesta anterior (aplicando INVEST)
- **"Pagar en sandbox (8)" se dividió** en COM-02 (crear el pedido y redirigir al pago), COM-03 (confirmar el pago) y COM-04 (mostrar el resultado). Cada parte se puede probar por separado y ninguna supera 5 puntos.
- **"Crear pedido y descontar inventario" se integró en COM-03**, porque el inventario solo se descuenta cuando el pago queda aprobado.
- **Se agregó CAT-01 (diseño base)** para no repetir el encabezado, el pie de página y el diseño responsive en cada historia.
- **Se agregó CAT-06 (variantes)** como historia aparte, "Should", según lo que decidas en D5.

## Archivos de historias
- [01 – Sprint 0: habilitadores técnicos](01-sprint-0-habilitadores.md)
- [02 – Épica Catálogo](02-epica-catalogo.md)
- [03 – Épica Carrito](03-epica-carrito.md)
- [04 – Épica Compra](04-epica-compra.md)
