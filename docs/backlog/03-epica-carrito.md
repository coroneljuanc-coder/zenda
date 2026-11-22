# Épica E2 – Carrito

> Permite que un visitante junte los productos que quiere comprar antes de pagar.
> Borrador para revisión del Product Owner.

**Decisión de diseño común a la épica (explicada en sencillo):** el carrito se guarda en la **base de datos** y se identifica con una **cookie** del navegador. Así no se pierde si el visitante cierra la pestaña, y más adelante permite enviar el recordatorio de carrito abandonado (E9) y unir el carrito con la cuenta del cliente cuando exista el registro (E4).

---

## CAR-01 · Agregar producto al carrito

**ID:** ZTV-16 (provisional CAR-01)
**Título:** Agregar producto al carrito
**Épica:** E2 – Carrito
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 5
**Sprint:** 2
**Estado:** En pruebas (lista para la Sprint Review del Sprint 2)

### Historia
Como visitante,
quiero agregar un producto al carrito desde su ficha,
para ir juntando lo que voy a comprar.

### Contexto
Es el primer paso del flujo de compra. Esta historia crea el carrito, activa el botón "Agregar al carrito" de la ficha (CAT-04) y el contador del encabezado (CAT-01).

### Criterios de aceptación
Escenario 1: Agregar un producto disponible (camino feliz)
  Dado que estoy en la ficha de un producto disponible y mi carrito está vacío
  Cuando elijo la cantidad 2 y toco "Agregar al carrito"
  Entonces veo el aviso "Agregaste 2 × Camiseta básica al carrito" con los botones "Ver carrito" y "Seguir comprando", y el ícono del carrito muestra 2

Escenario 2: Agregar un producto que ya está en el carrito (alterno)
  Dado que tengo 1 unidad del producto en el carrito
  Cuando agrego 2 más
  Entonces el carrito tiene 1 sola línea de ese producto con cantidad 3 (no 2 líneas)

Escenario 3: Superar el stock disponible (error)
  Dado que el producto tiene 4 unidades y ya tengo 3 en el carrito
  Cuando intento agregar 2 más
  Entonces veo "Solo hay 4 unidades disponibles. Ya tienes 3 en tu carrito." y el carrito queda con 3

Escenario 4: El carrito se conserva (alterno)
  Dado que agregué productos al carrito
  Cuando cierro el navegador y vuelvo a Zenda en el mismo dispositivo dentro de 30 días
  Entonces mi carrito conserva los mismos productos y cantidades

### Reglas de negocio
- RN1: La cantidad por línea va de 1 al menor valor entre el stock disponible y 10.
- RN2: Una línea del carrito se identifica por la variante del producto; la misma variante nunca se repite en dos líneas.
- RN3: Agregar al carrito **no** descuenta ni reserva inventario; el inventario solo se descuenta cuando el pago se aprueba (COM-03).
- RN4: Los productos agotados o inactivos no se pueden agregar.
- RN5: El carrito de un visitante dura 30 días desde la última modificación.
- RN6: El carrito guarda la variante y la cantidad, no el precio; el precio se toma siempre del catálogo vigente.

### Requisitos no funcionales
- Seguridad: cookie `HttpOnly`, `Secure` y `SameSite=Lax` con un identificador aleatorio no adivinable; las validaciones de stock se hacen en el servidor, nunca solo en el navegador.
- Rendimiento: la respuesta al tocar "Agregar" tarda menos de 500 ms.
- Accesibilidad: el aviso de confirmación se anuncia a los lectores de pantalla (`aria-live`); el selector de cantidad funciona con teclado.
- Responsive: en celular, el botón "Agregar al carrito" queda fijo en la parte inferior de la pantalla.

### Diseño / Interfaz
- En la ficha: selector de cantidad (− 1 +) y botón principal "Agregar al carrito".
- Aviso emergente: "Agregaste N × {producto} al carrito" + "Ver carrito" / "Seguir comprando".
- Error: "Solo hay N unidades disponibles. Ya tienes M en tu carrito."
- Ícono del carrito en el encabezado con un círculo que muestra el número total de unidades (se oculta si es 0).

### Notificaciones y correos
No aplica (el recordatorio de carrito abandonado es de E9).

### Datos
- **Carrito:** id, token (cookie), creadoEn, actualizadoEn, expiraEn.
- **LineaCarrito:** id, carritoId, varianteId, cantidad. Restricción única (carritoId, varianteId).

### Dependencias
- CAT-04 (ficha). Si CAT-06 aún no está hecha, se agrega la variante única del producto.

### Fuera de alcance
- Agregar desde el listado (sin entrar a la ficha).
- Lista de deseos.
- Unir el carrito con la cuenta de un cliente (E4).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAR-01-CP1 | 1 | E2E | Producto con stock 10, cantidad 2 | Aviso correcto; contador = 2 |
| CAR-01-CP2 | 2 | Integración | Agregar 1 y luego 2 de la misma variante | Una línea con cantidad 3 |
| CAR-01-CP3 | 3 | Unitaria | `validarCantidad(enCarrito=3, agregar=2, stock=4)` | Error con el mensaje exacto |
| CAR-01-CP4 | 3 | Unitaria | `validarCantidad(0, 11, stock=50)` | Error: máximo 10 por producto |
| CAR-01-CP5 | 4 | E2E | Cerrar y reabrir el contexto del navegador con la misma cookie | Carrito intacto |
| CAR-01-CP6 | 3 | Integración | Petición directa al servidor con un producto agotado | Rechazada (no depende del botón) |

### Notas técnicas
- Server Action `agregarAlCarrito` (`app/acciones/carrito.ts`, zod); stock y límites validados en el servidor dentro de una transacción (`lib/carrito/carrito.ts`).
- Reglas puras en `lib/carrito/reglas.ts`: `validarCantidad` (valores límite 0, 1, 10, 11 y stock), `cantidadMaxima`, `vencimientoDesde` y `textoAgregado`.
- Tablas Carrito y LineaCarrito con única (carritoId, varianteId) y CHECK de cantidad 1–10. Cookie `zenda_carrito` HttpOnly, Secure, SameSite=Lax, 30 días.
- **Ajuste a RN6:** la línea guarda también `precioVisto`, solo para avisar «El precio de este producto cambió» (CAR-02). Se cobra y suma siempre el precio vigente del catálogo.
- Defecto ZTV-73 («En Sprint»): los toques antes de que la ficha terminara de cargar se perdían; los controles se activan cuando la página está lista. PR #30.
- Una tarea de limpieza de carritos vencidos queda para E9.

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

## CAR-02 · Ver carrito con subtotal

**ID:** ZTV-17 (provisional CAR-02)
**Título:** Ver carrito con subtotal
**Épica:** E2 – Carrito
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 2
**Estado:** En pruebas (lista para la Sprint Review del Sprint 2)

### Historia
Como visitante,
quiero ver todos los productos de mi carrito con sus precios y el subtotal,
para saber cuánto voy a pagar antes de continuar.

### Contexto
Antes de pagar, el visitante necesita revisar qué lleva y cuánto suma. Esta página es el punto de partida hacia la compra (COM-01).

### Criterios de aceptación
Escenario 1: Carrito con productos (camino feliz)
  Dado que tengo 2 × Camiseta ($ 45.000) y 1 × Lámpara ($ 120.000)
  Cuando abro `/carrito`
  Entonces veo cada línea con foto, nombre, variante, precio unitario, cantidad y total de la línea; el subtotal "$ 210.000"; y el botón "Continuar con la compra"

Escenario 2: Información del envío (alterno)
  Dado que el subtotal es menor que $ 200.000 (D3)
  Cuando veo el resumen
  Entonces aparece el mensaje "Te faltan $ X para el envío gratis"; y si el subtotal es de $ 200.000 o más, "¡Tu envío es gratis!"

Escenario 3: Carrito vacío (alterno)
  Dado que mi carrito no tiene productos
  Cuando abro `/carrito`
  Entonces veo "Tu carrito está vacío" y el botón "Explorar productos"

Escenario 4: Cambios en el catálogo desde que agregué (error)
  Dado que un producto de mi carrito se agotó, se desactivó o cambió de precio
  Cuando abro `/carrito`
  Entonces la línea agotada o inactiva aparece marcada como "Ya no está disponible" y no suma al subtotal; si cambió el precio, veo "El precio de este producto cambió" y el subtotal usa el precio nuevo; y "Continuar con la compra" sigue habilitado solo si queda al menos una línea disponible

### Reglas de negocio
- RN1: Total de línea = precio unitario vigente × cantidad.
- RN2: Subtotal = suma de los totales de las líneas disponibles. Todo en pesos enteros y con IVA incluido (D4).
- RN3: Envío: $ 12.000 si el subtotal es menor que $ 200.000; gratis desde $ 200.000 (D3). El valor final del envío se confirma en COM-01.
- RN4: Si la cantidad en el carrito supera el stock actual, se ajusta al stock y se muestra "Ajustamos la cantidad a las N unidades disponibles".

### Requisitos no funcionales
- Responsive: en escritorio, las líneas van a la izquierda y el resumen a la derecha; en celular, el resumen va abajo con el botón fijo.
- Accesibilidad: el listado se estructura como lista o tabla con encabezados; los totales tienen etiquetas claras.
- Rendimiento: la página carga en menos de 1 s con 20 líneas.

### Diseño / Interfaz
- Título "Tu carrito (N productos)".
- Resumen: "Subtotal", mensaje de envío, botón "Continuar con la compra", enlace "Seguir comprando".
- Mensajes exactos: "Tu carrito está vacío", "Explorar productos", "Te faltan $ X para el envío gratis", "¡Tu envío es gratis!", "Ya no está disponible", "El precio de este producto cambió", "Ajustamos la cantidad a las N unidades disponibles".

### Notificaciones y correos
No aplica.

### Datos
Lee **Carrito**, **LineaCarrito**, **VarianteProducto**, **Producto** e **ImagenProducto**.

### Dependencias
- CAR-01.
- Decisiones D3 y D4.

### Fuera de alcance
- Cupones y descuentos.
- Cálculo de envío por ciudad.
- Modificar cantidades (CAR-03).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAR-02-CP1 | 1 | Unitaria | `calcularSubtotal([{45000,2},{120000,1}])` | 210000 |
| CAR-02-CP2 | 2 | Unitaria | `calcularEnvio(199999)` / `(200000)` | 12000 / 0 (valores límite) |
| CAR-02-CP3 | 2 | Unitaria | `faltaParaEnvioGratis(150000)` | 50000 |
| CAR-02-CP4 | 3 | E2E | Carrito vacío | Mensaje y botón "Explorar productos" |
| CAR-02-CP5 | 4 | Integración | Desactivar un producto que está en el carrito | Línea marcada; no suma |
| CAR-02-CP6 | 4 | Integración | Cambiar el precio en la BD | Aviso de cambio; subtotal con el precio nuevo |
| CAR-02-CP7 | 1 | E2E | Celular 390×844 | El resumen y el botón son visibles sin desplazamiento horizontal |

### Notas técnicas
- `lib/carrito/precios.ts`: `TARIFA_ENVIO` (12.000), `UMBRAL_ENVIO_GRATIS` (200.000), `totalLinea`, `calcularSubtotal`, `calcularEnvio`, `faltaParaEnvioGratis`.
- `lib/carrito/consulta.ts` → `consultarCarrito`: precios y stock vigentes, líneas no disponibles marcadas, cantidades ajustadas al stock en la BD (RN4) y aviso de precio mostrado una sola vez.
- Ruta `app/carrito/page.tsx`: se arma en cada visita y no se indexa. «Continuar con la compra» queda listo para el Sprint 3.
- **Datos de prueba reales:** camiseta $ 49.900 y lámpara $ 89.900 → escenario 1 = **$ 189.700** (faltan $ 10.300 para el envío gratis). PR #31.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias resueltas (D3 y D4 aceptadas)
- [ ] Aprobada por el Product Owner

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner

---

## CAR-03 · Modificar cantidades y eliminar productos del carrito

**ID:** ZTV-18 (provisional CAR-03)
**Título:** Modificar cantidades y eliminar productos del carrito
**Épica:** E2 – Carrito
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 2
**Estado:** En pruebas (lista para la Sprint Review del Sprint 2)

### Historia
Como visitante,
quiero cambiar la cantidad de un producto o quitarlo de mi carrito,
para ajustar mi compra antes de pagar.

### Contexto
Es común cambiar de opinión antes de pagar. Sin esta función, el visitante tendría que empezar de nuevo o pagar algo que no quiere.

### Criterios de aceptación
Escenario 1: Aumentar o disminuir la cantidad (camino feliz)
  Dado que tengo 2 × Camiseta ($ 45.000) en el carrito
  Cuando toco "+"
  Entonces la cantidad pasa a 3, el total de la línea a "$ 135.000" y el subtotal y el contador del encabezado se actualizan sin recargar la página

Escenario 2: Eliminar un producto (alterno)
  Dado que tengo 2 productos en el carrito
  Cuando toco "Eliminar" en uno de ellos
  Entonces la línea desaparece, veo "Eliminaste {producto} del carrito" con la opción "Deshacer" durante 5 segundos, y el subtotal se actualiza

Escenario 3: Bajar de 1 (alterno)
  Dado que una línea tiene cantidad 1
  Cuando miro el botón "−"
  Entonces está deshabilitado; para quitar el producto se usa "Eliminar"

Escenario 4: Subir por encima del stock (error)
  Dado que el producto tiene 3 unidades y tengo 3 en el carrito
  Cuando toco "+"
  Entonces la cantidad sigue en 3 y veo "No hay más unidades disponibles"

### Reglas de negocio
- RN1: Se aplica RN1 de CAR-01 (mínimo 1, máximo el menor entre el stock y 10).
- RN2: "Deshacer" restaura la línea con la misma cantidad, siempre que siga habiendo stock.
- RN3: Si al eliminar se vacía el carrito, se muestra el estado "Tu carrito está vacío" (CAR-02).
- RN4: Toda modificación se valida en el servidor.

### Requisitos no funcionales
- Rendimiento: la actualización visible tarda menos de 500 ms; los toques rápidos y repetidos no generan cantidades inconsistentes.
- Accesibilidad: los botones "+", "−" y "Eliminar" tienen nombres accesibles ("Aumentar cantidad de Camiseta básica"); los cambios se anuncian con `aria-live`.
- Responsive: los botones miden al menos 44×44 px en celular.

### Diseño / Interfaz
- Por línea: botones "−" / cantidad / "+" y el enlace "Eliminar".
- Mensajes: "Eliminaste {producto} del carrito" + "Deshacer", "No hay más unidades disponibles".

### Notificaciones y correos
No aplica.

### Datos
Actualiza o elimina **LineaCarrito**; actualiza **Carrito.actualizadoEn**.

### Dependencias
- CAR-02.

### Fuera de alcance
- Vaciar todo el carrito con un solo botón.
- Guardar para después.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| CAR-03-CP1 | 1 | E2E | 2 → "+" | Cantidad 3, totales y contador actualizados |
| CAR-03-CP2 | 2 | E2E | Eliminar + "Deshacer" | La línea vuelve con la misma cantidad |
| CAR-03-CP3 | 3 | E2E | Línea con cantidad 1 | Botón "−" deshabilitado |
| CAR-03-CP4 | 4 | Integración | Stock 3, en carrito 3, petición +1 | Rechazada; cantidad 3 |
| CAR-03-CP5 | 1 | E2E | 5 clics rápidos en "+" con stock 10 | Cantidad final coherente (7) en pantalla y en la BD |

### Notas técnicas
- Server Actions `cambiarCantidad`, `eliminarDelCarrito` y `deshacerEliminacion`; en la BD, `cambiarCantidad` y `eliminarLinea` solo tocan líneas del carrito de la cookie (RN4) y respetan el máximo (RN1).
- `ControlesLinea` cambia la cantidad al instante y la corrige si el servidor no la acepta; los toques rápidos se calculan sobre la última cantidad pedida (5 toques desde 2 → 7).
- `ZonaCarrito` conserva «Eliminaste {producto} del carrito» + «Deshacer» durante 5 s aunque el carrito quede vacío (RN2, RN3).
- **Datos de prueba reales:** camiseta $ 49.900 → CP1 da $ 149.700; CP5 con stock 15; escenario 4 con la chaqueta L (stock 3). PR #32.

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
