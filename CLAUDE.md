# Zenda — Tienda Virtual

## Contexto del proyecto
Estoy aprendiendo a construir software con IA usando Scrum. Claude actúa como equipo de desarrollo; yo soy el Product Owner y revisor final. El objetivo es tener una aplicación funcionando y también aprender en el proceso.

## Roles
- Product Owner (usuario): define qué se construye, prioriza el backlog y acepta o rechaza cada historia.
- Claude: redacta historias, propone planes de sprint, escribe código y pruebas, documenta y despliega. Explica las decisiones técnicas importantes en lenguaje sencillo.

## Marco de trabajo (Scrum)
- Sprints de 1 semana.
- Estimación en puntos de historia (Fibonacci: 1, 2, 3, 5, 8). Si una historia supera 8 puntos, se divide.
- Cada sprint tiene un objetivo claro en una frase.
- Ceremonias: planning y review como conversación con el PO; la daily es un resumen de estado (avances, bloqueos, siguiente paso); la retrospectiva ajusta cómo trabajamos.

## Formato de historias de usuario
Toda historia usa esta plantilla, sin omitir secciones (si una no aplica: "No aplica").

**ID:** [ZTV-###] (lo asigna Jira)
**Título:** [verbo + objeto, máximo 10 palabras]
**Épica:** [épica]
**Tipo:** Historia | Tarea | Bug
**Prioridad (MoSCoW):** Must | Should | Could | Won't (por ahora)
**Estimación:** [puntos Fibonacci]
**Sprint:** [número o "Backlog"]
**Estado:** Por hacer | En progreso | En pruebas | Hecho

### Historia
Como [rol: cliente, visitante, administrador], quiero [acción concreta], para [beneficio].

### Contexto
[2 a 4 líneas: por qué se necesita y qué problema resuelve.]

### Criterios de aceptación
Escenarios Dado / Cuando / Entonces. Mínimo: un camino feliz, un caso alterno y un caso de error.

### Reglas de negocio
- RN1: [regla concreta y verificable]

### Requisitos no funcionales
Rendimiento, seguridad, accesibilidad y responsive (celular, tablet, escritorio).

### Diseño / Interfaz
[Pantalla y mensajes exactos que ve el usuario.]

### Notificaciones y correos
[Qué se envía, a quién, cuándo y por qué canal.]

### Datos
[Entidades y campos involucrados.]

### Dependencias
[Historias, servicios externos o configuraciones.]

### Fuera de alcance
[Lo que esta historia NO incluye.]

### Casos de prueba
| ID caso | Escenario | Tipo (unitaria / integración / E2E / aceptación) | Datos de prueba | Resultado esperado |

### Notas técnicas
[Decisiones de implementación, endpoints, componentes. Las completa Claude al refinar.]

### Definición de Listo (DoR)
- Historia y contexto claros
- Criterios de aceptación completos (mínimo 3 escenarios)
- Reglas de negocio definidas
- Estimada en 8 puntos o menos
- Dependencias resueltas o identificadas
- Aprobada por el Product Owner

### Definición de Terminado (DoD)
- Código en GitHub, revisado e integrado a la rama principal
- Plan de pruebas de la historia ejecutado y casos aprobados
- Pruebas automatizadas pasando en GitHub Actions
- Desplegado en Vercel
- Documentado en Confluence
- Aceptado por el Product Owner

### Reglas de calidad (INVEST)
Independiente, Negociable, Valiosa, Estimable, Pequeña y Verificable. Si no cumple, proponer cómo dividirla o reescribirla antes de registrarla.

### Registro en Jira
- Título, historia, contexto, criterios y reglas → campo Descripción.
- Prioridad, estimación, épica, sprint y estado → campos nativos.
- Casos de prueba → subtareas o enlace al plan de pruebas en Confluence.

## Plan de pruebas y calidad
- Cada sprint tiene un plan de pruebas en Confluence: alcance, historias cubiertas, tipos de prueba, casos, datos de prueba, criterios de entrada y salida, riesgos.
- Cada criterio de aceptación → al menos un caso de prueba trazable (historia → criterio → caso → resultado).
- Tipos: unitarias (precios, descuentos, inventario, totales), integración (API, BD, pagos, correos), E2E con Playwright (registro, búsqueda, carrito, compra), aceptación (aprobación final del PO), regresión (suite completa en GitHub Actions en cada PR; si falla, no se integra).
- Al cierre de cada sprint: informe de pruebas (ejecutados, aprobados, fallidos, defectos y estado).
- Defectos en Jira como "Bug" (tipo Error): pasos para reproducir, resultado esperado y obtenido. Todo defecto se registra, aunque se corrija en el mismo sprint (acción A1 de la retrospectiva del Sprint 0).
- Clasificación en el campo "Tipo de defecto" (`customfield_10069`), según el estado de la historia afectada cuando se encuentra el defecto:
  - **En Sprint**: la historia aún no está en "Listo". Se enlaza a la historia, no lleva puntos, se corrige de inmediato y la historia no pasa a "Listo" mientras el bug esté abierto.
  - **Escapado**: la historia ya fue aceptada. Se enlaza a la historia original, lleva puntos y MoSCoW, y el PO lo prioriza en el backlog. Si afecta gravemente a producción, se corrige de inmediato como versión de corrección (vX.Y.1).
  - Claude propone la clasificación; si hay duda, decide el PO.
- Informe de defectos con JQL: los "En Sprint" se filtran por `sprint = "Sprint N"`; los "Escapado" por la fecha de creación (`created`) dentro de las fechas del sprint, porque nacen en el backlog.

## Desglose del trabajo y estimación (convención B, aprobada 2026-11-16)
Para decidir el tipo, tres preguntas en orden:
1. ¿El cliente o visitante nota el resultado en la tienda? → **Historia** (plantilla completa, puntos y MoSCoW).
2. ¿Es trabajo técnico que vale por sí solo (infraestructura, arquitectura, mantenimiento, deuda técnica, investigación)? → **Tarea**.
3. ¿Es un paso dentro de una Historia o de una Tarea? → **Subtarea** (sin puntos). Claude las crea en la planeación del sprint y las mueve a medida que avanza.
- Los defectos van como **Error** (ver "Plan de pruebas y calidad").
- Una Tarea grande lleva puntos, MoSCoW y criterios de aceptación, y se planea en el sprint como una historia. Las muy pequeñas se agrupan en una Tarea de mantenimiento por sprint, con cada trabajo como subtarea, para no inflar la velocidad.
- Ya no se usa la etiqueta `habilitador-tecnico`: lo que antes era "habilitador técnico" ahora es Tarea. Ejemplos: ZTV-26 (arquitectura) y ZTV-27 (mantenimiento posterior al Sprint 0). El diseño base de la tienda (ZTV-10) es Historia, porque el visitante lo ve.

## Herramientas
- Backlog y sprints: Jira
- Documentación y planes de prueba: Confluence
- Código y CI/CD: GitHub + GitHub Actions
- Despliegue: Vercel (plan Hobby, gratuito, mientras aprendemos)
- Base de datos: PostgreSQL en Neon (gratuito, integrado con Vercel) con Prisma
- Correos: Resend o similar (plan gratuito)
- Pagos: Wompi o Mercado Pago en modo sandbox

## Stack técnico
- Next.js con TypeScript
- Pruebas: Vitest (unitarias e integración) y Playwright (E2E)
- Automatizaciones: funciones de Vercel; Vercel Workflows para procesos con espera; GitHub Actions para tareas periódicas más frecuentes que una vez al día

## Restricciones
- Todo debe funcionar con planes gratuitos mientras aprendemos.
- Nada se despliega a producción sin aprobación del PO.
- Nunca pedir ni guardar contraseñas o llaves en el chat; las credenciales van como variables de entorno.
- Nunca guardar datos de tarjetas en nuestra base de datos; los pagos los procesa la pasarela.
- Si la tienda pasa a vender de verdad, avisar: el plan Hobby de Vercel no permite uso comercial.

## Forma de trabajar
- Responder en español.
- Antes de construir algo grande, mostrar el plan y esperar visto bueno.
- Si un requerimiento es ambiguo, preguntar antes de asumir.
- Al cerrar cada sesión, resumir: qué se hizo, qué queda pendiente y cuál es el siguiente paso.

## La aplicación: Zenda
Tienda virtual de un solo vendedor, con productos de todo tipo organizados por categorías y precios en pesos colombianos (COP).

Funcionalidades principales:
- Catálogo con categorías, búsqueda y filtros (precio, categoría, valoración).
- Ficha de producto con fotos, descripción, precio, variantes (talla, color) e inventario disponible.
- Registro e inicio de sesión de clientes.
- Carrito de compras y proceso de pago.
- Historial y seguimiento de pedidos.
- Reseñas y valoraciones de productos.
- Panel de administración: productos, inventario, pedidos y clientes.
- Notificaciones y correos: confirmación de registro, confirmación de compra, cambios de estado del pedido y recordatorio de carrito abandonado.

Construcción incremental: primero un MVP (catálogo, carrito y compra) y luego funcionalidades sprint a sprint.

## Decisiones de producto aceptadas (2026-11-15)
- D1 Pasarela: Wompi (sandbox).
- D2 MVP permite comprar como invitado; el registro llega después.
- D3 Envío fijo $12.000 COP a todo el país; gratis desde $200.000.
- D4 Precio mostrado = precio final con IVA incluido.
- D5 Variantes modeladas desde el Sprint 0; el selector de talla y color es "Should".
- D6 Productos del MVP cargados por seed (sin panel de administración).
- D7 Logo de texto "Zenda" y paleta sobria que el PO aprueba. Concretada el 2026-11-16 (ZTV-33): dirección «Vitrina», con blanco y negro (#111111), gris #5A5A5A, superficie #F2F2F2 y lima #C8F169 solo para «Nuevo»; esquinas rectas, sin sombras ni degradados; letra Archivo; logo «zenda» en minúscula; texto base de 17 px por el público de 18 a 70 años. El PO descartó las primeras opciones porque «se veían hechas por IA»: evitar patrones genéricos (crema y terracota, degradados, tarjetas redondeadas con sombra). Tokens en `apps/tienda/src/app/globals.css`.
- D8 (2026-11-16) Producción muestra los 21 productos de ejemplo hasta que lleguen los reales. Se cargan en la compilación de producción con `ZENDA_SEED_PRODUCCION=1`, una variable de Vercel solo para Production. Pendiente de confirmar con el PO: el aviso visible «Tienda en construcción: productos de ejemplo» (se decide en la planeación del Sprint 1, ZTV-10).
- D9 (2026-11-16) Versiones del producto, una por sprint: v0.1.0 Fundaciones (Sprint 0), v0.2.0 Catálogo, v0.3.0 Carrito, v0.4.0 Pago y v1.0.0 MVP. Las correcciones urgentes en producción salen como vX.Y.1. En Jira, cada historia lleva su versión ("fixVersion") y la versión se publica al cerrar el sprint.

Backlog e historias: `docs/backlog/`.
Flujo del MVP: `docs/diagramas/flujo-mvp.drawio` (fuente editable en draw.io) y `flujo-mvp.png`; incrustado en las épicas ZTV-2, ZTV-3 y ZTV-4 de Jira. Si el flujo cambia, se actualiza el `.drawio`, se exporta el PNG y se reemplaza en las épicas.

## Arquitectura (ADR-001, aprobada 2026-11-15)
- **Opción C, híbrido:** una aplicación principal (monolito modular en Next.js: catálogo, carrito, compra, pagos e inventario, con su base de datos) más un **servicio independiente de Notificaciones** (correos) con despliegue propio, que recibe el evento "pedido pagado".
- Pedido + inventario siguen en una sola transacción dentro de la aplicación principal.
- ADR en Confluence: "ADR-001 – Arquitectura de la aplicación" (página 229554).
- Diagrama de arquitectura: `docs/diagramas/arquitectura.drawio` (fuente editable) y `arquitectura.png`, publicado con la explicación de frontend y backend en la página de Confluence "Arquitectura de la aplicación: diagrama, frontend y backend" (884779, hija del ADR). Si la arquitectura cambia, se actualiza el `.drawio`, se exporta el PNG y se reemplaza en esa página.
- Historias derivadas aprobadas y registradas (2026-11-15): ZTV-24 (repositorio con dos aplicaciones, Sprint 0) y ZTV-25 (evento "pedido pagado", Sprint 4); ZTV-21 y ZTV-23 ajustadas. Detalle: `docs/backlog/05-ajustes-arquitectura-c.md`.
- Para empezar a escribir código falta la aprobación del Sprint 0 por el PO (DoR) y sus requisitos de entrada (Git y cuentas de GitHub, Vercel y Neon).

## Repositorio (GitHub)
- Repositorio **público** `coroneljuanc-coder/zenda` (decisión del PO 2026-11-15: GitHub Free solo protege ramas en repositorios públicos). Nunca se suben credenciales.
- `main` protegida: solo recibe cambios por pull request, también para administradores; sin force push ni borrado. El check "CI" se vuelve obligatorio al terminar ZTV-6.
- Ramas `tipo/ZTV-##-descripcion`; el PO revisa e integra cada pull request.

## Despliegue y ambientes (Vercel, aprobado 2026-11-15)
- Proyectos Vercel Hobby: `zenda-tienda` (`apps/tienda`) y `zenda-notificaciones` (`apps/notificaciones`), con Next.js, Node 24 y la opción "omitir proyectos no afectados".
- Producción: `https://zenda-tienda.vercel.app` y `https://zenda-notificaciones.vercel.app`. Solo cambian al integrar a `main`. Las vistas previas por PR exigen sesión en Vercel.
- Ambientes: desarrollo local (`prisma dev`), CI (PostgreSQL temporal), vista previa por PR (rama propia de Neon, que se borra al cerrar el PR) y producción (rama `main` de Neon). El UAT/`staging` está diferido hasta que exista el flujo completo de compra (decisión del PO del 2026-11-16) y se retoma en la planeación del Sprint 3. Detalle en Confluence, página "Ambientes".

## Configuración de Jira (proyecto ZTV, team-managed)
- Clave `ZTV`. Tablero: Por hacer → En curso → En pruebas → Listo.
- Prioridad MoSCoW en campo personalizado "MoSCoW" (Historia y Tarea: `customfield_10043`; Error: `customfield_10044`). Puntos: "Story point estimate".
- Tipos: Historia → Historia; trabajo técnico independiente → Tarea (comparte el campo MoSCoW `customfield_10043` con Historia); Bug → Error (con "Tipo de defecto", `customfield_10069`: En Sprint / Escapado); pasos técnicos de una historia → Subtarea.
- Épicas: ZTV-1 E0 Fundaciones, ZTV-2 E1 Catálogo, ZTV-3 E2 Carrito, ZTV-4 E3 Compra.
- Ficha completa de cada historia: Confluence > "Requisitos del producto" > épica > historia (enlazada desde Jira). Jira guarda estado, puntos, MoSCoW y sprint; Confluence guarda la ficha completa. Si una regla cambia, se actualiza en Jira, Confluence y `docs/backlog/`.
