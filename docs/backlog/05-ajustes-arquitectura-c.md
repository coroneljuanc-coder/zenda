# Ajustes al backlog por la arquitectura C (híbrido)

> Origen: ADR-001, aprobado por el PO el 2026-11-15 (Confluence, página 229554).
> Estado: **aprobado por el PO y registrado en Jira el 2026-11-15** (S0-06 = ZTV-24, COM-06 = ZTV-25; ajustes aplicados a ZTV-21 y ZTV-23 en Jira, Confluence y 04-epica-compra.md).

## Resumen de cambios

| Cambio | Historia | Épica | Pts | Sprint |
|---|---|---|---|---|
| Nueva | S0-06 · Estructurar el repositorio para dos aplicaciones | E0 | 3 | 0 |
| Nueva | COM-06 · Publicar y recibir el evento "pedido pagado" | E3 | 5 | 4 |
| Ajuste | ZTV-21 · Confirmar pago… — en lugar de "dispara el correo", ahora "registra el evento pedido pagado" | E3 | 5 (igual) | 3 |
| Ajuste | ZTV-23 · Enviar correo de confirmación — el correo sale del servicio de Notificaciones al recibir el evento | E3 | 3 (igual) | 4 |

**Totales:** MVP pasa de 64 a **72 puntos**. Sprint 0 pasa de 12 a **15 puntos**. Sprint 4 pasa de 6 a **11 puntos** (ZTV-22 + COM-06 + ZTV-23).

## Cómo queda la arquitectura (en sencillo)

- **Aplicación principal (`apps/tienda`):** catálogo, carrito, compra, pagos con Wompi e inventario. Tiene su propia base de datos.
- **Servicio de Notificaciones (`apps/notificaciones`):** solo envía correos. Tiene su propio despliegue en Vercel y su propia base de datos pequeña, donde registra los eventos recibidos y los correos enviados.
- **Contrato (`packages/contratos`):** la "plantilla" del mensaje que se envían. Es lo único que comparten las dos aplicaciones.
- **El mensaje (evento) "pedido pagado":** cuando un pago queda aprobado, la tienda guarda el evento en una "bandeja de salida" dentro de la misma transacción del pedido. Después lo entrega al servicio de Notificaciones con reintentos. Así, aunque el servicio esté caído, el evento no se pierde y el pago nunca se ve afectado.

---

## S0-06 · Estructurar el repositorio para dos aplicaciones

**ID:** ZTV-24 (provisional S0-06)
**Título:** Estructurar el repositorio para dos aplicaciones
**Épica:** E0 – Fundaciones técnicas
**Tipo:** Tarea
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 0
**Estado:** Hecho (aceptada por el PO el 2026-11-16; Sprint 0, versión v0.1.0)

### Historia
Como equipo de desarrollo,
quiero un solo repositorio con dos aplicaciones independientes (la tienda y el servicio de Notificaciones) y un paquete de contratos compartido,
para que cada una se pruebe y se despliegue por separado sin duplicar configuración.

### Contexto
La arquitectura aprobada (ADR-001, opción C) separa las notificaciones en un servicio propio. Organizar desde el inicio el repositorio en "espacios de trabajo" (workspaces) evita rehacer la estructura después y permite que cada aplicación tenga su propio despliegue en Vercel.

### Criterios de aceptación
Escenario 1: Las dos aplicaciones funcionan en local (camino feliz)
  Dado que clono el repositorio y ejecuto `npm install` en la raíz
  Cuando ejecuto `npm run dev`
  Entonces la tienda abre en `http://localhost:3000` con "Zenda – Próximamente" y el servicio responde en `http://localhost:3001/api/salud` con `{"estado":"ok"}`

Escenario 2: Un cambio en una sola aplicación (alterno)
  Dado un pull request que solo modifica `apps/notificaciones`
  Cuando corren GitHub Actions y Vercel
  Entonces solo se ejecutan las pruebas de Notificaciones y solo se construye el proyecto de Notificaciones en Vercel

Escenario 3: Dependencia prohibida entre aplicaciones (error)
  Dado que el código de `apps/notificaciones` importa un archivo interno de `apps/tienda`
  Cuando ejecuto `npm run lint`
  Entonces el comando falla indicando que solo se puede importar desde `packages/contratos`

### Reglas de negocio
- RN1: Las dos aplicaciones solo comparten el paquete `packages/contratos`; nunca importan código interno la una de la otra.
- RN2: Cada aplicación tiene su propio proyecto en Vercel, sus propias variables de entorno y su propia base de datos. No comparten base de datos.
- RN3: El repositorio pertenece a la cuenta personal de GitHub del PO (requisito de Vercel Hobby).

### Requisitos no funcionales
- Rendimiento: el CI completo sigue por debajo de 10 minutos; los cambios en una sola aplicación no ejecutan las pruebas de la otra.
- Seguridad: los secretos de cada aplicación se configuran por separado en Vercel y GitHub; ninguno vive en el código.
- Accesibilidad y responsive: No aplica.

### Diseño / Interfaz
No aplica (el servicio de Notificaciones no tiene pantallas; solo `/api/salud`).

### Notificaciones y correos
No aplica.

### Datos
No aplica (las bases de datos se crean en ZTV-7 para la tienda y en COM-06 para Notificaciones).

### Dependencias
- ZTV-5 (repositorio). Se trabaja en conjunto con ZTV-6 (CI) y ZTV-8 (despliegue).
- Cuentas de GitHub y Vercel del PO.

### Fuera de alcance
- La lógica de eventos y correos (COM-06 y ZTV-23).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| S0-06-CP1 | 1 | Aceptación | Repositorio recién clonado | Tienda en 3000 y `/api/salud` en 3001 responden |
| S0-06-CP2 | 2 | Aceptación | PR que cambia solo `apps/notificaciones` | Solo corren sus pruebas y solo se despliega ese proyecto |
| S0-06-CP3 | 3 | Aceptación | Import de `apps/tienda/...` dentro de Notificaciones | `npm run lint` falla con el mensaje de la regla |

### Notas técnicas
- npm workspaces: `apps/tienda` (Next.js), `apps/notificaciones` (Next.js solo con rutas de API), `packages/contratos` (tipos TypeScript y esquemas Zod).
- GitHub Actions con filtro por rutas modificadas; en Vercel, dos proyectos conectados al mismo repositorio con su carpeta raíz (Vercel Hobby permite hasta 25 proyectos por repositorio, y los despliegues de monorepo omitidos no cuentan en los límites).
- Regla de lint para límites entre aplicaciones (`no-restricted-imports`).

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [x] Código en GitHub, revisado e integrado a `main`
- [x] Plan de pruebas de la historia ejecutado y casos aprobados
- [x] Pruebas automatizadas pasando en GitHub Actions
- [x] Desplegado en Vercel
- [x] Documentado en Confluence
- [x] Aceptado por el Product Owner

---

## COM-06 · Publicar y recibir el evento "pedido pagado"

**ID:** ZTV-25 (provisional COM-06)
**Título:** Publicar y recibir el evento "pedido pagado"
**Épica:** E3 – Compra
**Tipo:** Tarea
**Prioridad (MoSCoW):** Must
**Estimación:** 5
**Sprint:** 4
**Estado:** Por hacer

### Historia
Como vendedor de Zenda,
quiero que cada pedido pagado genere un aviso confiable hacia el servicio de Notificaciones,
para que los correos salgan siempre, aunque ese servicio esté caído en el momento del pago.

### Contexto
Con la arquitectura C, la tienda y el servicio de Notificaciones son aplicaciones distintas que se comunican por la red. La red puede fallar, así que el aviso no puede perderse ni duplicarse, y el pago no puede depender de que el servicio responda.

### Criterios de aceptación
Escenario 1: Entrega normal (camino feliz)
  Dado que un pedido pasa a "Pagado" (ZTV-21)
  Cuando la tienda entrega el evento "pedido.pagado" al servicio de Notificaciones
  Entonces el servicio verifica la firma, lo registra y responde "recibido" en menos de 1 minuto desde el pago

Escenario 2: Servicio caído (alterno)
  Dado que el servicio de Notificaciones no responde
  Cuando la tienda intenta entregar el evento
  Entonces el pedido sigue "Pagado", el evento queda pendiente en la bandeja de salida y se reintenta hasta entregarse cuando el servicio vuelva (máximo 24 horas; después queda "fallido" con una alerta)

Escenario 3: Evento falso o mal formado (error)
  Dado un mensaje sin firma válida, con una firma de hace más de 5 minutos o que no cumple el contrato
  Cuando llega al servicio de Notificaciones
  Entonces se rechaza (401 si la firma no es válida, 400 si el formato no lo es), no se envía ningún correo y se registra una alerta

Escenario 4: Evento repetido (alterno)
  Dado un evento que el servicio ya recibió
  Cuando la tienda lo vuelve a entregar (por un reintento)
  Entonces el servicio responde "recibido" sin procesarlo de nuevo

### Reglas de negocio
- RN1: Cada pedido que pasa a "Pagado" genera exactamente un evento "pedido.pagado", guardado en la bandeja de salida en la misma transacción que el cambio de estado.
- RN2: El pago nunca espera la respuesta del servicio de Notificaciones.
- RN3: Cada evento lleva un identificador único, el tipo, la versión del contrato y la fecha; el servicio procesa cada identificador una sola vez.
- RN4: Los mensajes entre aplicaciones van firmados con un secreto compartido que solo existe como variable de entorno en ambas aplicaciones.
- RN5: El evento incluye solo los datos necesarios para los correos (referencia, nombre y correo del cliente, líneas, totales y dirección); nunca datos de pago.

### Requisitos no funcionales
- Confiabilidad: ningún evento se pierde; reintentos con espera creciente (1, 5, 15, 60 minutos…) hasta 24 horas.
- Seguridad: firma HMAC-SHA256 con marca de tiempo (rechaza mensajes de más de 5 minutos para evitar que se reenvíen copias); HTTPS obligatorio.
- Rendimiento: el servicio responde "recibido" en menos de 2 s y envía los correos después.
- Trazabilidad: cada evento queda registrado en ambos lados (enviado / recibido) con su identificador.
- Accesibilidad y responsive: No aplica (comunicación entre servidores).

### Diseño / Interfaz
No aplica.

### Notificaciones y correos
No aplica (esta historia transporta el aviso; los correos los define ZTV-23).

### Datos
- Tienda: **EventoSaliente** (id, tipo, version, datos, estado: PENDIENTE / ENTREGADO / FALLIDO, intentos, proximoIntentoEn, creadoEn, entregadoEn).
- Notificaciones (base de datos propia): **EventoRecibido** (id, tipo, version, recibidoEn, resultado).
- Contrato `pedido.pagado` v1 en `packages/contratos` (esquema Zod).

### Dependencias
- ZTV-21 (el pedido pasa a "Pagado") y S0-06 (estructura de dos aplicaciones).
- Proyecto de Neon para el servicio de Notificaciones (plan gratuito).

### Fuera de alcance
- Otros eventos (registro, cambio de estado, carrito abandonado), que llegan con E4, E5 y E9.
- Una cola de mensajes administrada externa.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| COM-06-CP1 | 1 | Integración | Pedido que pasa a PAGADO | Un EventoSaliente PENDIENTE creado en la misma transacción |
| COM-06-CP2 | 1 | Integración | Entrega a Notificaciones de prueba | 202 recibido; EventoSaliente ENTREGADO; EventoRecibido creado |
| COM-06-CP3 | 2 | Integración | Servicio simulado caído 2 intentos y luego disponible | Entregado al 3.er intento; pedido siempre PAGADO |
| COM-06-CP4 | 3 | Unitaria | Firma alterada / firma de hace 6 minutos | 401 en ambos casos |
| COM-06-CP5 | 3 | Unitaria | Evento sin `referencia` | 400 por contrato inválido |
| COM-06-CP6 | 4 | Integración | Mismo evento entregado 3 veces | Procesado una sola vez |
| COM-06-CP7 | 2 | Unitaria | `proximoIntento(intentos)` | 1, 5, 15, 60 minutos… y FALLIDO después de 24 h |

### Notas técnicas
- Patrón "bandeja de salida" (outbox): el evento se guarda junto con el pedido y luego se entrega. Primer intento inmediato con `after()` de Next.js; los reintentos con Vercel Workflows (procesos con espera). Al refinar se verifica su disponibilidad en el plan Hobby; si no está disponible, se usa una tarea de GitHub Actions cada 15 minutos.
- Endpoint del servicio: `POST /api/eventos` (encabezados `X-Zenda-Firma` y `X-Zenda-Fecha`).
- Variables de entorno: `SECRETO_EVENTOS` (en ambas apps) y `URL_NOTIFICACIONES` (en la tienda).

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (4 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence (contrato del evento)
- [ ] Aceptado por el Product Owner

---

## Ajuste a ZTV-21 · Confirmar pago y actualizar pedido e inventario

- Escenario 1, "Entonces": cambia "…y se dispara el correo de confirmación (COM-05)" por "…y se registra el evento 'pedido pagado' en la bandeja de salida (COM-06)".
- Notificaciones y correos: "Al quedar 'Pagado': se registra el evento 'pedido.pagado' (COM-06); los correos los envía el servicio de Notificaciones (ZTV-23)".
- Estimación sin cambios (5).

## Ajuste a ZTV-23 · Enviar correo de confirmación de compra

- Contexto: se agrega "El envío lo hace el servicio de Notificaciones al recibir el evento 'pedido pagado' (COM-06)".
- Escenario 1, "Cuando": cambia "termina el procesamiento del pago (COM-03)" por "el servicio de Notificaciones recibe el evento 'pedido pagado'".
- Escenario 4, "Cuando": cambia "se reprocesa el mismo evento de pago" por "llega de nuevo el mismo evento 'pedido pagado'".
- RN2: los montos salen de los datos del evento (copia del pedido), no del catálogo.
- RN3: `CORREO_VENDEDOR` y la llave de Resend viven solo en el servicio de Notificaciones.
- Datos: el estado del correo (ENVIADO / PENDIENTE / FALLIDO) se guarda en la base de datos del servicio de Notificaciones (**EnvioCorreo**: id, eventoId, destinatario, tipo, estado, intentos, enviadoEn), no en el Pedido.
- Dependencias: COM-06 en lugar de ZTV-21.
- Notas técnicas: el código vive en `apps/notificaciones`; React Email + Resend sin cambios.
- Estimación sin cambios (3).

## Plan de sprints actualizado (propuesto)

| Sprint | Historias | Pts |
|---|---|---|
| 0 | ZTV-5 a ZTV-9 + S0-06 | 15 |
| 1 | ZTV-10 a ZTV-13 | 12 |
| 2 | ZTV-16 a ZTV-18 + ZTV-14 (+ ZTV-15 si alcanza) | 14 (19) |
| 3 | ZTV-19 a ZTV-21 | 15 |
| 4 | ZTV-22 + COM-06 + ZTV-23 | 11 |
