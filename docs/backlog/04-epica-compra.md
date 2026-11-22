# Épica E3 – Compra

> Permite que un visitante convierta su carrito en un pedido pagado (en el modo de pruebas de Mercado Pago, D1) y reciba la confirmación.
> **D1 actualizada el 2026-11-22 (ZTV-86):** la pasarela es Mercado Pago (Checkout Pro). Wompi exigía registrar un comercio con RUT y cuenta Bancolombia incluso para pruebas. COM-02 y COM-03 se construyeron con Wompi y COM-07 cambió solo la conexión con la pasarela; sus reglas siguen vigentes.
> Arquitectura C (ADR-001, 2026-11-15): COM-03 (ZTV-21) y COM-05 (ZTV-23) ajustadas; nueva COM-06 (ZTV-25) en `05-ajustes-arquitectura-c.md`.

**Cómo funciona el pago (explicado en sencillo):**
1. Zenda crea el pedido y, desde el servidor, la orden de pago en **Mercado Pago**; luego envía al cliente a su página de pago (Checkout Pro).
2. El cliente paga **en Mercado Pago** con tarjeta, PSE u otros medios. Zenda **nunca ve ni guarda los datos de la tarjeta**.
3. Mercado Pago avisa a Zenda mediante un **webhook**, un mensaje automático de servidor a servidor. Zenda verifica la firma del aviso, consulta el pago a Mercado Pago y actualiza el pedido.
4. Mercado Pago devuelve al cliente a Zenda, donde ve el resultado.

**Estados del pedido:** `PENDIENTE_PAGO` → `PAGADO` | `PAGO_RECHAZADO` | `CANCELADO` | `REQUIERE_REVISION`.
(Los estados de envío, como preparando, enviado y entregado, llegan con la épica E5.)

---

## COM-01 · Ingresar datos de contacto y envío

**ID:** ZTV-19 (provisional COM-01)
**Título:** Ingresar datos de contacto y envío
**Épica:** E3 – Compra
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 5
**Sprint:** 3
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-22; v0.4.0)

### Historia
Como visitante,
quiero ingresar mis datos de contacto y la dirección de entrega sin crear una cuenta (D2),
para que Zenda sepa a dónde enviar mi pedido y cómo contactarme.

### Contexto
Sin dirección no hay entrega, y sin correo no hay confirmación. Se permite comprar como invitado para no frenar la compra. Además, por la Ley 1581 de 2012 (Habeas Data), el cliente debe autorizar el tratamiento de sus datos personales.

### Criterios de aceptación
Escenario 1: Datos válidos (camino feliz)
  Dado que tengo productos disponibles en el carrito y toco "Continuar con la compra"
  Cuando completo nombre, correo, celular, departamento, ciudad y dirección, acepto la política de datos y toco "Continuar al pago"
  Entonces veo el resumen final con mis datos, los productos, el subtotal, el envío y el total, y el botón "Pagar $ X"

Escenario 2: Volver a editar (alterno)
  Dado que estoy en el resumen final
  Cuando toco "Editar datos"
  Entonces vuelvo al formulario con mis datos ya diligenciados

Escenario 3: Datos inválidos o incompletos (error)
  Dado que dejo vacío el campo de ciudad y escribo el celular "12345"
  Cuando toco "Continuar al pago"
  Entonces no avanzo, el foco va al primer campo con error y veo "Selecciona tu ciudad" y "Ingresa un celular colombiano de 10 dígitos que empiece por 3"

Escenario 4: Carrito vacío o sin productos disponibles (error)
  Dado que mi carrito está vacío o todas sus líneas están agotadas
  Cuando intento abrir `/compra`
  Entonces me redirige a `/carrito`

### Reglas de negocio
- RN1: Campos obligatorios: nombre completo (3 a 80 caracteres), correo válido, celular (10 dígitos, empieza por 3), departamento, ciudad o municipio (lista oficial DANE filtrada por departamento) y dirección (5 a 120 caracteres). Opcionales: detalles de la dirección (apto, torre) y notas para la entrega (máximo 200 caracteres).
- RN2: La casilla "Autorizo el tratamiento de mis datos personales según la Política de privacidad" es obligatoria y no viene marcada.
- RN3: Total = subtotal + envío (RN3 de CAR-02, D3). Todo con IVA incluido (D4).
- RN4: Los datos ingresados se conservan asociados al carrito durante su vigencia (30 días).
- RN5: Por ahora, envíos solo dentro de Colombia.

### Requisitos no funcionales
- Seguridad: validación en el servidor (Zod), protección CSRF (incluida en las Server Actions), sin datos personales en la URL.
- Accesibilidad: cada campo tiene etiqueta visible; los errores se asocian al campo (`aria-describedby`); se usa `autocomplete` (name, email, tel, street-address).
- Responsive: formulario de una columna en celular; teclado numérico para el celular (`inputmode="tel"`).
- Rendimiento: la lista de municipios se filtra en el navegador sin nuevas peticiones.

### Diseño / Interfaz
- Paso 1 "Tus datos": Nombre completo, Correo electrónico, Celular.
- Paso 2 "Dirección de entrega": Departamento, Ciudad o municipio, Dirección, Detalles (opcional), Notas para la entrega (opcional).
- Casilla: "Autorizo el tratamiento de mis datos personales según la Política de privacidad" (con enlace).
- Botón "Continuar al pago" → resumen final con "Editar datos" y "Pagar $ X".
- Mensajes de error: "Ingresa tu nombre completo", "Ingresa un correo válido, por ejemplo nombre@correo.com", "Ingresa un celular colombiano de 10 dígitos que empiece por 3", "Selecciona tu departamento", "Selecciona tu ciudad", "Ingresa la dirección de entrega", "Debes autorizar el tratamiento de tus datos para continuar".

### Notificaciones y correos
No aplica.

### Datos
- **DatosEntrega** (asociado al Carrito): nombreCompleto, correo, celular, departamento, ciudad, codigoDane, direccion, detalles, notas, aceptoPoliticaEn (fecha y hora de la aceptación).
- Archivo estático con departamentos y municipios (DANE).

### Dependencias
- CAR-02.
- Página "Política de privacidad" (texto básico de plantilla que el PO revisa; incluido en esta historia).
- Decisiones D2, D3 y D4.

### Fuera de alcance
- Guardar varias direcciones o usar las de una cuenta (E4).
- Envío por ciudad o transportadora (D3).
- Facturación electrónica DIAN.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| COM-01-CP1 | 1 | E2E | Datos válidos de prueba (Ana Prueba, ana@ejemplo.com, 3001234567, Antioquia, Medellín, Cra 1 # 2-3) | Resumen final con el total correcto |
| COM-01-CP2 | 2 | E2E | "Editar datos" | Formulario con los datos conservados |
| COM-01-CP3 | 3 | Unitaria | Celulares "12345", "2001234567", "3001234567" | Inválido, inválido, válido |
| COM-01-CP4 | 3 | Unitaria | Correos "ana@", "ana@ejemplo.com" | Inválido, válido |
| COM-01-CP5 | 3 | E2E | Sin aceptar la política | Mensaje de error; no avanza |
| COM-01-CP6 | 4 | E2E | `/compra` con carrito vacío | Redirección a `/carrito` |
| COM-01-CP7 | 1 | Unitaria | `calcularTotal(149700)` y `(200000)` | 161700 (con envío de 12.000) y 200000 |

### Notas técnicas
- `/compra` (formulario) y `/compra/resumen` (resumen final); sin productos disponibles llevan al carrito. «Continuar con la compra» del carrito abre `/compra`.
- Esquema zod único (`lib/compra/datos-entrega.ts`) en el navegador y en la acción `guardarDatosEntrega` del servidor.
- Lista DANE `lib/compra/divipola.ts` generada de datos.gov.co (DIVIPOLA): 33 departamentos y 1.122 municipios; el servidor comprueba que la ciudad sea del departamento.
- Tabla DatosEntrega 1:1 con el carrito, se borra con él (RN4). Página `/politica-de-privacidad` de plantilla (revisión del PO; antes de vender, asesor legal).
- **Datos de prueba reales (A8):** 3 × Camiseta M / Negro = $ 149.700 + $ 12.000 = $ 161.700. PR #36.
- Los datos de prueba son ficticios; nunca se usan datos reales de personas.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias resueltas (D2, D3 y D4 aceptadas)
- [x] Aprobada por el Product Owner (aceptada en la Sprint Review del 2026-11-22)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` y a `main` (v0.4.0, PR #46)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (producción con v0.4.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-22)

---

## COM-02 · Crear pedido y redirigir al pago

**ID:** ZTV-20 (provisional COM-02)
**Título:** Crear pedido y redirigir al pago
**Épica:** E3 – Compra
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 5
**Sprint:** 3
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-22; v0.4.0)

### Historia
Como visitante,
quiero que al tocar "Pagar" se registre mi pedido y me lleve a una página de pago segura,
para pagar con tarjeta, PSE o Nequi sin entregarle mis datos bancarios a la tienda.

### Contexto
El pedido debe quedar registrado con los precios del momento antes de pagar, para que el cobro coincida exactamente con lo que el cliente vio. El pago lo procesa Wompi (D1), así Zenda nunca maneja datos de tarjetas.

### Criterios de aceptación
Escenario 1: Pedido creado y redirección (camino feliz)
  Dado que estoy en el resumen final con datos válidos y 3 × Camiseta básica de algodón M / Negro ($ 149.700 + envío $ 12.000)
  Cuando toco "Pagar $ 161.700"
  Entonces se crea un pedido con estado "Pendiente de pago" y referencia única (ej. "ZEN-20261122-7K3QD"), y llego a la página de pago de Wompi mostrando $ 161.700 COP

Escenario 2: Cambió algo en el catálogo (alterno)
  Dado que mientras llenaba mis datos un producto cambió de precio o tiene menos stock
  Cuando toco "Pagar"
  Entonces no se crea el pedido, vuelvo a `/carrito` y veo "Actualizamos tu carrito porque algunos productos cambiaron. Revisa antes de pagar."

Escenario 3: Wompi no disponible (error)
  Dado que no es posible conectarse con Wompi
  Cuando toco "Pagar"
  Entonces veo "No pudimos conectar con la pasarela de pago. Tu carrito sigue guardado; intenta de nuevo en unos minutos." y el pedido queda "Cancelado"

Escenario 4: Doble clic (error)
  Dado que toco "Pagar" dos veces seguidas
  Cuando el sistema procesa la solicitud
  Entonces se crea un solo pedido y el botón queda deshabilitado con el texto "Procesando…"

### Reglas de negocio
- RN1: Antes de crear el pedido se revalidan en el servidor el precio, el stock y el estado activo de cada línea.
- RN2: El pedido guarda una **copia** (snapshot) de cada línea: nombre del producto, variante, precio unitario, cantidad y total; además del subtotal, el envío, el total y los datos de entrega. Los cambios posteriores del catálogo no alteran el pedido.
- RN3: La referencia tiene el formato `ZEN-AAAAMMDD-XXXXX` (5 caracteres alfanuméricos aleatorios) y es única.
- RN4: El monto enviado a Wompi se expresa en centavos (`total × 100`), con moneda COP, y se firma con la firma de integridad de Wompi; así nadie puede alterar el valor en el navegador.
- RN5: Crear el pedido **no** descuenta inventario ni vacía el carrito (eso pasa en COM-03 al aprobarse el pago).
- RN6: Si el carrito ya tenía un pedido "Pendiente de pago" anterior, este se marca "Cancelado" al crear el nuevo.

### Requisitos no funcionales
- Seguridad: la llave privada y el secreto de integridad de Wompi solo existen como variables de entorno del servidor; ningún dato de tarjeta pasa por Zenda; se usan las llaves de **sandbox** (`pub_test_…`).
- Rendimiento: de "Pagar" a la página de Wompi en menos de 2 s.
- Accesibilidad: el estado "Procesando…" se anuncia a los lectores de pantalla.
- Responsive: el Web Checkout de Wompi es responsive (lo provee Wompi).

### Diseño / Interfaz
- Botón "Pagar $ X" → "Procesando…" (deshabilitado).
- Aviso bajo el botón: "Serás dirigido a Wompi, nuestra pasarela de pagos segura. Modo de pruebas: no se realizan cobros reales."
- Mensajes de error exactos de los escenarios 2 y 3.

### Notificaciones y correos
No aplica (el correo se envía solo con el pago aprobado, COM-05).

### Datos
- **Pedido:** id, referencia, tokenAcceso (aleatorio, para consultar el resultado), estado, subtotal, envio, total, datos de entrega (copia), correo, carritoId, creadoEn, actualizadoEn.
- **LineaPedido:** id, pedidoId, varianteId, nombreProducto, descripcionVariante, precioUnitario, cantidad, totalLinea.

### Dependencias
- COM-01.
- Cuenta de Wompi en modo sandbox con las llaves configuradas como variables de entorno (las configura el PO; nunca por chat).

### Fuera de alcance
- Procesar la respuesta del pago (COM-03) y mostrar el resultado (COM-04).
- Otras pasarelas o pago contra entrega.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| COM-02-CP1 | 1 | Integración | Carrito válido | Pedido PENDIENTE_PAGO con snapshot de líneas y totales correctos |
| COM-02-CP2 | 1 | Unitaria | `firmaIntegridad("ZEN-20261122-7K3QD", 16170000, "COP", secretoPrueba)` | Coincide con el hash SHA-256 esperado |
| COM-02-CP3 | 1 | E2E | Clic en "Pagar" (sandbox) | Llega al checkout de Wompi con $ 161.700 |
| COM-02-CP4 | 2 | Integración | Cambiar el precio entre el resumen y "Pagar" | No hay pedido; redirige con el mensaje |
| COM-02-CP5 | 3 | Integración | Simular un error de red con Wompi | Mensaje exacto; pedido CANCELADO; carrito intacto |
| COM-02-CP6 | 4 | Integración | Dos solicitudes simultáneas | Un solo pedido |
| COM-02-CP7 | 1 | Unitaria | Generar 10.000 referencias | Todas con el formato correcto y la fecha de Colombia (la unicidad la garantiza la base de datos) |

### Notas técnicas
- Acción `pagar({ totalVisto })` y `crearPedido` (`lib/compra/pedido.ts`) en una transacción que bloquea el carrito. Revalida con la consulta del carrito en modo solo lectura; si algo cambió vuelve a `/carrito?aviso=cambios`.
- Doble clic: botón «Procesando…» y, en el servidor, el mismo contenido de hace menos de 2 minutos reutiliza el pedido pendiente; otro contenido cancela el anterior (RN6).
- **RN3 y CP7:** con 36^5 ≈ 60 millones de combinaciones, entre 10.000 referencias del mismo día es probable que se repita alguna; la unicidad la garantiza la base de datos (índice único y reintento con otra referencia).
- Web Checkout con `public-key`, `currency`, `amount-in-cents`, `reference`, `signature:integrity` y `redirect-url=/pedido/resultado?ref=…&t=…`. **Sin `customer-data:email`**, para no poner datos personales en la URL. Solo llaves `pub_test_`; si Wompi no responde en 5 s o faltan las llaves, el pedido queda «Cancelado» (escenario 3).
- `/pedido/resultado` básico (referencia, total y estado); ZTV-22 lo completa. **Datos reales (A8):** $ 161.700. PR #37.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias resueltas (D1 actualizada: Mercado Pago, ZTV-86)
- [x] Aprobada por el Product Owner (aceptada en la Sprint Review del 2026-11-22)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` y a `main` (v0.4.0, PR #46)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (producción con v0.4.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-22)

---

## COM-03 · Confirmar pago y actualizar pedido e inventario

**ID:** ZTV-21 (provisional COM-03)
**Título:** Confirmar pago y actualizar pedido e inventario
**Épica:** E3 – Compra
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 5
**Sprint:** 3
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-22; v0.4.0)

### Historia
Como vendedor de Zenda,
quiero que el pedido se marque como pagado y el inventario se descuente automáticamente cuando Wompi aprueba el pago,
para no vender unidades que no tengo y saber qué pedidos debo despachar.

### Contexto
El navegador del cliente no es una fuente confiable: el cliente puede cerrar la pestaña antes de volver a la tienda. La confirmación oficial llega de Wompi por webhook y es la única que puede marcar un pedido como pagado.

### Criterios de aceptación
Escenario 1: Pago aprobado (camino feliz)
  Dado un pedido "Pendiente de pago" que incluye 2 × Camiseta básica de algodón M / Negro (stock 15)
  Cuando llega de Wompi un evento auténtico con estado APPROVED, la misma referencia y el mismo monto
  Entonces el pedido pasa a "Pagado", el stock de esa camiseta queda en 13 y el carrito del cliente se vacía (el evento "pedido pagado" se agrega en ZTV-25, Sprint 4)

Escenario 2: Pago rechazado (alterno)
  Dado un pedido "Pendiente de pago"
  Cuando llega un evento auténtico con estado DECLINED, ERROR o VOIDED
  Entonces el pedido pasa a "Pago rechazado", el stock no cambia y el carrito se conserva para intentar de nuevo

Escenario 3: Evento falso o alterado (error)
  Dado un evento cuya firma (checksum) no coincide o cuyo monto es distinto al del pedido
  Cuando llega al webhook
  Entonces se rechaza con código 400 (firma inválida), o el pedido pasa a "Requiere revisión" (monto distinto), y el stock no cambia

Escenario 4: Evento repetido (alterno)
  Dado un pedido ya "Pagado"
  Cuando Wompi reenvía el mismo evento APPROVED
  Entonces se responde 200 sin descontar el inventario otra vez

Escenario 5: Sin stock al momento de la aprobación (error)
  Dado que otra compra agotó el producto mientras este cliente pagaba
  Cuando llega el APPROVED
  Entonces el pedido pasa a "Requiere revisión", el stock no queda negativo y se registra una alerta para que el vendedor gestione el reembolso o la reposición

### Reglas de negocio
- RN1: Solo un evento de Wompi con firma válida puede cambiar el estado de pago de un pedido.
- RN2: El descuento de inventario y el cambio a "Pagado" ocurren en la misma transacción: o pasan ambos, o ninguno.
- RN3: El stock nunca queda negativo.
- RN4: Procesar el mismo evento varias veces produce el mismo resultado (idempotencia).
- RN5: Un pedido "Pagado" no puede volver a "Pendiente" ni a "Rechazado".
- RN6: Se guarda el identificador de la transacción de Wompi, el método de pago y la fecha de aprobación.

### Requisitos no funcionales
- Seguridad: verificación del checksum con el secreto de eventos de Wompi (variable de entorno); el endpoint no expone datos del pedido en su respuesta.
- Rendimiento: el webhook responde en menos de 3 s (Wompi reintenta si no recibe respuesta).
- Trazabilidad: cada evento recibido se registra (id, referencia, estado, fecha y resultado del procesamiento).
- Accesibilidad y responsive: No aplica (proceso de servidor a servidor).

### Diseño / Interfaz
No aplica (sin pantalla para el cliente; el resultado se ve en COM-04).

### Notificaciones y correos
- Al quedar "Pagado": se registra el evento "pedido.pagado" (ZTV-25); los correos los envía el servicio de Notificaciones (ZTV-23).
- Al quedar "Requiere revisión": se registra una alerta en los logs de Vercel (el aviso por correo al vendedor queda para E7).

### Datos
- Actualiza **Pedido** (estado, wompiTransaccionId, metodoPago, pagadoEn) y **VarianteProducto.stock**; vacía **LineaCarrito**.
- Nueva entidad **EventoPago:** id, proveedor, eventoId, referencia, estado, recibidoEn, resultado.

### Dependencias
- COM-02.
- URL pública del webhook configurada en el panel sandbox de Wompi.

### Fuera de alcance
- Reembolsos automáticos.
- Panel para gestionar pedidos en revisión (E7).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| COM-03-CP1 | 1 | Integración | Evento APPROVED firmado con el secreto de prueba | Pedido PAGADO; stock 15 → 13; carrito vacío |
| COM-03-CP2 | 2 | Integración | Evento DECLINED | Pedido PAGO_RECHAZADO; stock intacto |
| COM-03-CP3 | 3 | Integración | Checksum alterado | 400; nada cambia |
| COM-03-CP4 | 3 | Integración | Monto 1 peso distinto | REQUIERE_REVISION; stock intacto |
| COM-03-CP5 | 4 | Integración | Mismo APPROVED enviado 3 veces | Stock descontado una sola vez |
| COM-03-CP6 | 5 | Integración | Stock 1, pedido de 2 unidades | REQUIERE_REVISION; stock no negativo |
| COM-03-CP7 | 1 | Unitaria | `verificarChecksumWompi(evento, secreto)` | true / false según el caso |
| COM-03-CP8 | 1 | E2E | Pago sandbox real con tarjeta de prueba aprobada | El pedido llega a PAGADO |

### Notas técnicas
- Endpoint `POST /api/webhooks/wompi`: checksum con el secreto de eventos en tiempo constante; firma o cuerpo inválidos → 400 sin cambios; sin secreto configurado → 503. La respuesta no incluye datos del pedido.
- Una transacción con el pedido y las variantes bloqueados (`SELECT … FOR UPDATE`): revisa el stock de todas las líneas y solo si alcanza descuenta, marca «Pagado» y vacía el carrito (probado con 3 avisos simultáneos).
- Un APPROVED se aplica también a un pedido «Cancelado» o «Pago rechazado» (si Wompi cobró, el pago es real); «Pagado» y «Requiere revisión» no cambian. «Requiere revisión» deja `[ALERTA]` en los registros de Vercel. Tabla EventoPago con cada aviso.
- ⚠ Webhook en el ambiente de revisión: pide sesión de Vercel. Para COM-03-CP8 el PO crea el acceso para automatizaciones (Protection Bypass) y pone la URL en el panel de Wompi; alternativa: la URL de producción tras publicar v0.4.0. PR #38.
- Respaldo: si el webhook no llega, COM-04 consulta el estado de la transacción en la API de Wompi.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (5 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (aceptada en la Sprint Review del 2026-11-22)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `desarrollo` y a `main` (v0.4.0, PR #46)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (producción con v0.4.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-22)

---

## COM-04 · Mostrar resultado del pago al cliente

**ID:** ZTV-22 (provisional COM-04)
**Título:** Mostrar resultado del pago al cliente
**Épica:** E3 – Compra
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 4
**Estado:** Por hacer

### Historia
Como cliente,
quiero ver claramente si mi pago fue aprobado, rechazado o sigue pendiente al volver de Wompi,
para saber si mi compra quedó hecha o si debo intentarlo de nuevo.

### Contexto
Después de pagar, Wompi devuelve al cliente a Zenda. Sin un mensaje claro, el cliente puede pagar dos veces o creer que compró cuando no fue así.

### Criterios de aceptación
Escenario 1: Pago aprobado (camino feliz)
  Dado que mi pedido quedó "Pagado"
  Cuando Wompi me devuelve a Zenda
  Entonces veo "¡Gracias por tu compra, Ana!", "Tu pedido ZEN-20261115-7K3QD fue confirmado", el resumen de productos, el total pagado y la dirección de entrega, y el aviso "Te enviamos la confirmación a ana@ejemplo.com"

Escenario 2: Pago pendiente (alterno)
  Dado que pagué con PSE y el banco aún no confirma
  Cuando vuelvo a Zenda
  Entonces veo "Estamos esperando la confirmación de tu banco. Esto puede tardar unos minutos." y la página se actualiza sola cada 5 segundos durante 2 minutos

Escenario 3: Pago rechazado (alterno)
  Dado que mi pago fue rechazado
  Cuando vuelvo a Zenda
  Entonces veo "Tu pago no fue aprobado. No se realizó ningún cobro." y el botón "Intentar de nuevo", que me lleva al carrito con mis productos

Escenario 4: Enlace inválido (error)
  Dado que ingreso a la página de resultado con una referencia o un token de acceso que no coinciden
  Cuando la página carga
  Entonces veo la página "No encontramos esta página" (404) y no se muestra ningún dato del pedido

### Reglas de negocio
- RN1: La página solo muestra el pedido si la referencia **y** el token de acceso coinciden (protege los datos personales del cliente).
- RN2: Si el pedido sigue "Pendiente de pago" pero Wompi devolvió un id de transacción, Zenda consulta el estado a la API de Wompi y lo actualiza, aplicando las mismas reglas de COM-03.
- RN3: Si después de 2 minutos sigue pendiente, se muestra "Te avisaremos por correo cuando tu banco confirme el pago."
- RN4: Se muestra el celular enmascarado (ej. "300 *** 4567").

### Requisitos no funcionales
- Seguridad: la página no se indexa en buscadores (`noindex`); el token de acceso es aleatorio y de al menos 128 bits.
- Accesibilidad: el resultado se anuncia como encabezado principal; los estados no dependen solo del color (llevan ícono y texto).
- Responsive: legible en celular sin zoom.

### Diseño / Interfaz
- Aprobado: ícono de verificación, "¡Gracias por tu compra, {nombre}!", "Tu pedido {referencia} fue confirmado", resumen, "Te enviamos la confirmación a {correo}", botón "Seguir comprando".
- Pendiente: ícono de reloj, "Estamos esperando la confirmación de tu banco. Esto puede tardar unos minutos."
- Rechazado: ícono de alerta, "Tu pago no fue aprobado. No se realizó ningún cobro.", botón "Intentar de nuevo".

### Notificaciones y correos
No aplica (el correo lo envía COM-05).

### Datos
Lee **Pedido** y **LineaPedido**; puede actualizar **Pedido** mediante la consulta de respaldo (RN2).

### Dependencias
- COM-02 y COM-03.

### Fuera de alcance
- Historial de pedidos del cliente (E5).
- Seguimiento del envío (E5).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| COM-04-CP1 | 1 | E2E | Pago sandbox con tarjeta aprobada | Mensaje de gracias y resumen correcto |
| COM-04-CP2 | 2 | Integración | Pedido pendiente + respuesta de Wompi PENDING | Mensaje de espera y actualización automática |
| COM-04-CP3 | 3 | E2E | Pago sandbox con tarjeta rechazada | Mensaje de rechazo; "Intentar de nuevo" lleva al carrito con productos |
| COM-04-CP4 | 4 | E2E | Referencia válida + token incorrecto | 404 sin datos |
| COM-04-CP5 | 1 | Unitaria | `enmascararCelular("3001234567")` | "300 *** 4567" |
| COM-04-CP6 | 2 | Integración | Webhook no recibido + API de Wompi APPROVED | El pedido pasa a PAGADO mediante el respaldo |

### Notas técnicas
- Ruta `src/app/pedido/resultado/page.tsx`; consulta de respaldo a `GET /v1/transactions/{id}` de Wompi (sandbox).
- La actualización automática se hace con un componente cliente con un intervalo limitado.

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

## COM-05 · Enviar correo de confirmación de compra

**ID:** ZTV-23 (provisional COM-05)
**Título:** Enviar correo de confirmación de compra
**Épica:** E3 – Compra
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 4
**Estado:** Por hacer

### Historia
Como cliente,
quiero recibir un correo con el detalle de mi compra cuando el pago sea aprobado,
para tener un comprobante y la referencia de mi pedido.

### Contexto
El correo es la prueba que guarda el cliente y genera confianza. Además, mientras no exista el panel de administración, el aviso al vendedor es la única forma de que se entere de que debe despachar un pedido. El envío lo hace el servicio de Notificaciones al recibir el evento "pedido pagado" (ZTV-25).

### Criterios de aceptación
Escenario 1: Correo al cliente (camino feliz)
  Dado que un pedido pasa a "Pagado"
  Cuando el servicio de Notificaciones recibe el evento "pedido pagado" (ZTV-25)
  Entonces el cliente recibe en menos de 2 minutos un correo con el asunto "Confirmación de tu pedido ZEN-20261115-7K3QD en Zenda", que incluye los productos, las cantidades, los precios, el envío, el total, la dirección de entrega y el aviso de modo de pruebas

Escenario 2: Aviso al vendedor (alterno)
  Dado que un pedido pasa a "Pagado"
  Cuando se envía el correo al cliente
  Entonces el vendedor recibe un correo con el asunto "Nuevo pedido pagado: ZEN-20261115-7K3QD – $ 162.000" con los datos de entrega y contacto del cliente

Escenario 3: Falla del servicio de correo (error)
  Dado que el servicio de correos no responde
  Cuando se intenta el envío
  Entonces se reintenta hasta 3 veces; si sigue fallando, el pedido sigue "Pagado" (el pago no se revierte) y queda registrado "correo pendiente" con una alerta en los logs

Escenario 4: Sin duplicados (alterno)
  Dado que el correo de un pedido ya fue enviado
  Cuando llega de nuevo el mismo evento "pedido pagado"
  Entonces no se envía un segundo correo

### Reglas de negocio
- RN1: El correo de confirmación se envía solo para pedidos "Pagado", una sola vez por pedido.
- RN2: Los montos del correo salen de los datos del evento (copia del pedido, RN2 de COM-02), no del catálogo actual.
- RN3: El correo del vendedor (`CORREO_VENDEDOR`) y la llave de Resend viven solo en el servicio de Notificaciones.
- RN4: Mientras Zenda esté en modo de pruebas, todo correo incluye: "Este es un pedido de prueba. No se realizó ningún cobro real."

### Requisitos no funcionales
- Seguridad: la llave de Resend es una variable de entorno; el correo no incluye datos de pago, solo el método (ej. "Tarjeta terminada en 4242" si Wompi lo informa).
- Accesibilidad: versión HTML con buen contraste y versión de texto plano; las imágenes llevan texto alternativo.
- Responsive: el diseño del correo se lee bien en Gmail y Outlook, tanto en celular como en escritorio.
- Rendimiento: el envío no retrasa la respuesta del webhook (se hace después de responder a Wompi).

### Diseño / Interfaz
- Cliente: encabezado "Zenda", "¡Hola, {nombre}! Recibimos tu pago.", tabla de productos, totales, dirección, "Referencia: {referencia}", nota de modo de pruebas.
- Vendedor: "Nuevo pedido pagado", referencia, total, productos, datos de entrega y contacto.

### Notificaciones y correos
| Qué | A quién | Cuándo | Canal |
|---|---|---|---|
| Confirmación de compra | Cliente (correo del pedido) | Al pasar a "Pagado" | Correo (Resend) |
| Aviso de nuevo pedido | Vendedor (`CORREO_VENDEDOR`) | Al pasar a "Pagado" | Correo (Resend) |

### Datos
- Base de datos del servicio de Notificaciones: **EnvioCorreo** (id, eventoId, destinatario, tipo, estado: ENVIADO / PENDIENTE / FALLIDO, intentos, enviadoEn).

### Dependencias
- ZTV-25 (recepción del evento).
- Cuenta de Resend (plan gratuito) con la llave como variable de entorno.
- ⚠ Limitación: sin un **dominio propio verificado**, Resend solo permite enviar correos al dueño de la cuenta. En pruebas eso basta (los correos llegan al PO); para enviar a clientes reales se necesita un dominio.

### Fuera de alcance
- Correos de cambio de estado del pedido (E5), de bienvenida (E4) y de carrito abandonado (E9).
- Factura electrónica adjunta.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| COM-05-CP1 | 1 | Integración | Pedido PAGADO + Resend simulado | Una llamada con el asunto y el contenido correctos |
| COM-05-CP2 | 1 | Aceptación | Compra sandbox completa | El PO recibe el correo real en su bandeja |
| COM-05-CP3 | 2 | Integración | Pedido PAGADO | Correo al `CORREO_VENDEDOR` con los datos de contacto |
| COM-05-CP4 | 3 | Integración | Resend simulado que falla 3 veces | 3 intentos; estadoCorreo = FALLIDO; pedido sigue PAGADO |
| COM-05-CP5 | 4 | Integración | Reprocesar APPROVED | Sin segundo envío |
| COM-05-CP6 | 1 | Unitaria | Snapshot: 2 × $ 45.000 + 1 × $ 60.000, envío $ 12.000 | HTML y texto con "$ 90.000", "$ 60.000", envío "$ 12.000" y total "$ 162.000" |

### Notas técnicas
- Plantillas con React Email; envío con el SDK de Resend.
- El código vive en `apps/notificaciones`. El servicio responde "recibido" y envía después con `after()` de Next.js; si se necesitan reintentos con espera, se usan Vercel Workflows.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas (cuenta Resend; limitación de dominio)
- [ ] Aprobada por el Product Owner

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner

---

## COM-07 · Pagar con Mercado Pago en lugar de Wompi

**ID:** ZTV-86 (provisional COM-07)
**Título:** Pagar con Mercado Pago en lugar de Wompi
**Épica:** E3 – Compra
**Tipo:** Historia
**Prioridad (MoSCoW):** Must
**Estimación:** 5
**Sprint:** 3 (agregada en la Sprint Review del 2026-11-22)
**Estado:** Hecho (aceptada por el PO en la Sprint Review del 2026-11-22; v0.4.0)

### Historia

Como visitante,
quiero pagar mi pedido en la página segura de Mercado Pago,
para pagar con tarjeta, PSE u otros medios sin entregarle mis datos bancarios a la tienda.

### Contexto

COM-02 y COM-03 se construyeron con Wompi, pero Wompi exige registrar un comercio (RUT y cuenta Bancolombia) incluso para las llaves de prueba. Mercado Pago da credenciales de prueba con una cuenta personal (solo cédula). Se cambia solo la conexión con la pasarela. Stripe se descartó: no opera con negocios colombianos sin una empresa en EE. UU.

### Criterios de aceptación

Escenario 1: Pagar en Mercado Pago (camino feliz)
Dado que estoy en el resumen final con 3 × Camiseta básica de algodón M / Negro y total $ 161.700
Cuando toco "Pagar $ 161.700"
Entonces se crea el pedido "Pendiente de pago" y llego a la página de pago de Mercado Pago con $ 161.700 COP y el detalle de productos y envío

Escenario 2: Pago aprobado (alterno)
Dado un pedido "Pendiente de pago"
Cuando Mercado Pago avisa con una firma válida un pago aprobado con la misma referencia y el mismo monto
Entonces el pedido pasa a "Pagado", se descuenta el stock y se vacía el carrito (reglas de COM-03)

Escenario 3: Aviso falso (error)
Dado un aviso al webhook cuya firma no coincide
Cuando llega
Entonces se responde 400 y nada cambia

Escenario 4: Mercado Pago no disponible (error)
Dado que no es posible crear la orden de pago en Mercado Pago o faltan las credenciales
Cuando toco "Pagar"
Entonces veo "No pudimos conectar con la pasarela de pago. Tu carrito sigue guardado; intenta de nuevo en unos minutos." y el pedido queda "Cancelado"

### Reglas de negocio

- RN1: Solo se aceptan pagos de prueba mientras la tienda esté en pruebas. Ajustada en ZTV-89 (2026-11-22): Mercado Pago entrega hoy el Access Token de prueba con el prefijo `APP_USR-` (antes `TEST-`), igual que el de producción. Se aceptan ambos prefijos y, antes de crear la orden de pago, Zenda confirma con `/users/me` que la cuenta es de prueba (etiqueta `test_user`); si no lo es o no se puede confirmar, no cobra (escenario 4) y deja una alerta. No se usa `live_mode`: Mercado Pago advierte que los pagos de prueba con `APP_USR-` pueden llegar con `live_mode: true`.
- RN2: El monto y los productos de la orden de pago los fija el servidor con la copia del pedido.
- RN3: El estado del pago no se toma del aviso: Zenda lo consulta a Mercado Pago con su credencial privada.
- RN5 (ZTV-90, aprobada por el PO el 2026-11-22): la firma del aviso se verifica solo si `MERCADOPAGO_SECRETO_WEBHOOK` está configurada. Sin ella, el aviso se atiende igual porque RN3 garantiza que nada cambia sin la confirmación de Mercado Pago. Motivo: los pagos de prueba los cobra el vendedor de prueba que crea Mercado Pago, cuyos avisos no se firman con la clave de la aplicación, y el panel no deja copiar esa clave.
- RN4: Se conservan las reglas de COM-02 (revalidación, doble clic, referencia) y de COM-03 (transacción, idempotencia, stock no negativo, "Requiere revisión").

### Requisitos no funcionales

- Seguridad: credenciales solo en variables de entorno; firma del aviso HMAC-SHA256 comparada en tiempo constante; sin datos personales del cliente en la orden de pago; Zenda nunca ve datos de tarjetas.
- Rendimiento: orden de pago en menos de 8 s (si no, escenario 4).
- Accesibilidad y responsive: la página de pago es de Mercado Pago; "Procesando…" se anuncia.

### Diseño / Interfaz

- Aviso bajo el botón: "Serás dirigido a Mercado Pago, nuestra pasarela de pagos segura. Modo de pruebas: no se realizan cobros reales."
- La Política de privacidad nombra a Mercado Pago.

### Notificaciones y correos

No aplica (el correo es COM-05).

### Datos

- Pedido: `wompiTransaccionId` → `pasarelaTransaccionId` (renombrada, sin perder datos).
- EventoPago: proveedor "mercadopago" y estado original de Mercado Pago.

### Dependencias

- COM-02 y COM-03.
- Aplicación de Mercado Pago del PO; en Vercel `MERCADOPAGO_ACCESS_TOKEN` (de prueba, `APP_USR-…`) y `MERCADOPAGO_SECRETO_WEBHOOK`.
- Para avisos en el ambiente de revisión: acceso para automatizaciones de Vercel (Protection Bypass).

### Fuera de alcance

- Reembolsos y contracargos (se registran sin cambiar el pedido).
- Credenciales de producción (cobros reales).

### Casos de prueba

| ID caso    | Escenario | Tipo                     | Datos de prueba                                          | Resultado esperado                                                                                   |
| ---------- | --------- | ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| COM-07-CP1 | 1         | Unitaria + E2E (sandbox) | Pedido de 3 × Camiseta M / Negro + envío                 | Orden que suma $ 161.700, con referencia y regreso a Zenda; con credenciales lleva a mercadopago.com |
| COM-07-CP2 | 2         | Integración              | Aviso firmado de pago aprobado (consulta simulada)       | 200; PAGADO; stock 15 → 13                                                                           |
| COM-07-CP3 | 3         | Unitaria + integración   | Firma con otra clave, alterada o ausente                 | 400; no consulta; el pedido no cambia                                                                |
| COM-07-CP4 | 4         | Unitaria + E2E           | Mercado Pago con error, sin respuesta o sin credenciales | Mensaje exacto; pedido CANCELADO; carrito intacto                                                    |
| COM-07-CP5 | 1 y 2     | Aceptación (sandbox)     | Comprador y tarjeta de prueba de Mercado Pago            | El pedido llega a PAGADO                                                                             |
| COM-07-CP6 | RN1 | Unitaria | Token `APP_USR-…` de una cuenta con y sin la etiqueta `test_user` | Con `test_user` crea la orden de pago; sin ella, o si no se puede confirmar, no la crea (ZTV-89) |
| COM-07-CP7 | RN5 | Integración | Aviso sin firma, con y sin clave secreta configurada | Sin clave: se consulta el pago y se aplica (PAGADO); sin confirmación de Mercado Pago, nada cambia. Con clave: 400 (ZTV-90) |

### Notas técnicas

- `lib/compra/mercadopago.ts`: credenciales (`APP_USR-` o `TEST-`; ZTV-89), `esCuentaDePrueba` (GET `/users/me`), orden de pago (POST `/checkout/preferences` con `X-Idempotency-Key`), `verificarFirmaAviso` y `consultarPago` (GET `/v1/payments/{id}`).
- `notification_url` y `auto_return` solo con una dirección https. Si existe `VERCEL_AUTOMATION_BYPASS_SECRET`, el aviso lo lleva para atravesar la protección de Vercel.
- Webhook `POST /api/webhooks/mercadopago`: firma inválida → 400; tipo distinto de `payment` → 200; consulta fallida → 502 (Mercado Pago reintenta).
- Mercado Pago firma `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`; se confirmará con un aviso real en COM-07-CP5.
- Pago en el sandbox: ventana de incógnito, comprador de prueba de la aplicación y tarjetas de prueba. PR #41.

### Definición de Listo (DoR)

- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas (credenciales de prueba del PO)
- [x] Aprobada por el Product Owner (2026-11-22)

### Definición de Terminado (DoD)

- [x] Código en GitHub, revisado e integrado a `desarrollo` y a `main` (v0.4.0, PR #46)
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel (producción con v0.4.0)
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner (2026-11-22)
