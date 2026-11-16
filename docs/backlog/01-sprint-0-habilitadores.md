# Sprint 0: habilitadores técnicos (Épica E0 – Fundaciones técnicas)

> **Objetivo del sprint:** el entorno está listo para que cada cambio se pruebe y se publique solo.
> Total: 15 puntos (incluye ZTV-24, agregada por la arquitectura C; su ficha está en `05-ajustes-arquitectura-c.md`).

---

## S0-01 · Crear repositorio y proyecto Next.js con TypeScript

**ID:** ZTV-5 (provisional S0-01)
**Título:** Crear repositorio y proyecto Next.js con TypeScript
**Épica:** E0 – Fundaciones técnicas
**Tipo:** Habilitador técnico
**Prioridad (MoSCoW):** Must
**Estimación:** 2
**Sprint:** 0
**Estado:** Por hacer

### Historia
Como equipo de desarrollo,
quiero un repositorio en GitHub con un proyecto Next.js y TypeScript ya configurado,
para que todo el código de Zenda tenga un único lugar, historial de cambios y una estructura común.

### Contexto
Todavía no existe código. Antes de construir funcionalidades necesitamos el "esqueleto" del proyecto y un repositorio donde cada cambio quede registrado y se revise mediante pull requests (PR).

### Criterios de aceptación
Escenario 1: Proyecto funcionando en local (camino feliz)
  Dado que clono el repositorio e instalo las dependencias con `npm install`
  Cuando ejecuto `npm run dev`
  Entonces la página de inicio abre en `http://localhost:3000` y muestra el texto "Zenda – Próximamente"

Escenario 2: Rama principal protegida (alterno)
  Dado que el repositorio está creado
  Cuando alguien intenta subir cambios directamente a la rama `main`
  Entonces GitHub lo rechaza y exige un pull request

Escenario 3: Código con errores de tipos o de estilo (error)
  Dado un archivo con un error de TypeScript o de estilo
  Cuando ejecuto `npm run lint` y `npm run typecheck`
  Entonces el comando falla e indica el archivo y la línea del error

### Reglas de negocio
- RN1: La rama principal se llama `main` y solo recibe cambios por pull request.
- RN2: Ningún archivo con credenciales (`.env`, `.env.local`) se sube al repositorio; `.gitignore` los excluye y existe un `.env.example` sin valores reales.
- RN3: Las ramas siguen la convención `tipo/ID-descripcion` (ejemplo: `feat/ZTV-12-listado-productos`).

### Requisitos no funcionales
- Seguridad: repositorio privado mientras aprendemos.
- Rendimiento, accesibilidad y responsive: No aplica (no hay interfaz de cliente todavía).

### Diseño / Interfaz
Página temporal con el texto centrado "Zenda – Próximamente".

### Notificaciones y correos
No aplica.

### Datos
No aplica.

### Dependencias
- Git instalado en el equipo del PO.
- Cuenta de GitHub del PO (el repositorio queda a su nombre).

### Fuera de alcance
- Pruebas automáticas y CI (S0-02), base de datos (S0-03) y despliegue (S0-04).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| S0-01-CP1 | 1 | Aceptación | Repositorio recién clonado | `npm run dev` levanta la página con "Zenda – Próximamente" |
| S0-01-CP2 | 2 | Aceptación | `git push` directo a `main` | GitHub rechaza el push |
| S0-01-CP3 | 3 | Aceptación | Archivo con `const x: number = "a"` | `npm run typecheck` falla señalando el archivo y la línea |

### Notas técnicas
- `create-next-app` con App Router, TypeScript, ESLint y Tailwind CSS; carpeta `src/`.
- Scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `format` (Prettier).
- Protección de rama en GitHub: PR obligatorio y checks obligatorios (se activan en S0-02).
- Explicación sencilla: **Next.js** sirve las páginas de la tienda y también la lógica del servidor en un solo proyecto. **TypeScript** detecta errores antes de ejecutar el código.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas (Git, cuenta de GitHub)
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner

---

## S0-02 · Configurar pruebas automáticas e integración continua

**ID:** ZTV-6 (provisional S0-02)
**Título:** Configurar pruebas automáticas e integración continua
**Épica:** E0 – Fundaciones técnicas
**Tipo:** Habilitador técnico
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 0
**Estado:** Por hacer

### Historia
Como Product Owner,
quiero que cada pull request ejecute automáticamente todas las pruebas,
para que ningún cambio que rompa la tienda llegue a la rama principal.

### Contexto
El plan de calidad exige pruebas de regresión en cada PR. Esta historia instala las herramientas (Vitest para pruebas unitarias y de integración, Playwright para E2E) y el flujo de GitHub Actions que las ejecuta y bloquea la integración si fallan.

### Criterios de aceptación
Escenario 1: PR con pruebas exitosas (camino feliz)
  Dado un pull request cuyo código pasa lint, tipos, pruebas unitarias y E2E
  Cuando se abre o se actualiza el PR
  Entonces GitHub Actions muestra el check "CI" en verde y se habilita el botón de integrar

Escenario 2: Ejecución local (alterno)
  Dado que tengo el proyecto en mi equipo
  Cuando ejecuto `npm test` y `npm run test:e2e`
  Entonces se ejecutan las mismas pruebas que en GitHub Actions y veo el resumen en la terminal

Escenario 3: PR con una prueba fallida (error)
  Dado un pull request con una prueba que falla
  Cuando termina el flujo de GitHub Actions
  Entonces el check "CI" queda en rojo, el PR no se puede integrar y el reporte de Playwright queda disponible como archivo descargable del flujo

### Reglas de negocio
- RN1: Un PR solo se integra si el check "CI" está en verde.
- RN2: La suite completa (lint, tipos, unitarias, E2E) corre en cada PR hacia `main`.
- RN3: El flujo de CI debe tardar menos de 10 minutos.

### Requisitos no funcionales
- Rendimiento: CI < 10 minutos (usa caché de dependencias y de navegadores de Playwright).
- Seguridad: los secretos de CI se guardan en GitHub Secrets, nunca en el código.
- Responsive: las pruebas E2E se ejecutan en dos tamaños de pantalla: celular (390×844) y escritorio (1280×800).

### Diseño / Interfaz
No aplica (solo se ve en la pestaña "Checks" del PR en GitHub).

### Notificaciones y correos
GitHub notifica por correo al autor del PR cuando el CI falla (configuración estándar de GitHub).

### Datos
No aplica.

### Dependencias
- S0-01 (repositorio creado).

### Fuera de alcance
- Pruebas contra la base de datos real (S0-03 agrega la base de datos de pruebas).
- Despliegue (S0-04).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| S0-02-CP1 | 1 | Integración | PR con una prueba unitaria de ejemplo (`formatearCOP(89900)` → "$ 89.900") | Check "CI" en verde |
| S0-02-CP2 | 1 | E2E | Prueba E2E que abre la página de inicio | Pasa en celular y en escritorio |
| S0-02-CP3 | 2 | Aceptación | `npm test` en local | Resumen con las pruebas aprobadas |
| S0-02-CP4 | 3 | Aceptación | PR con la aserción alterada a propósito | Check en rojo, integración bloqueada, reporte descargable |

### Notas técnicas
- Archivo `.github/workflows/ci.yml` con los pasos: instalar → lint → typecheck → `vitest run` → build → `playwright test`.
- Se aprovecha para crear la primera función de negocio real: `formatearCOP()` (formato de pesos colombianos con `Intl.NumberFormat('es-CO')`, sin decimales).
- Explicación sencilla: **GitHub Actions** es un computador en la nube que, en cada PR, revisa el código por nosotros siguiendo una lista de pasos.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas (S0-01)
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner

---

## S0-03 · Configurar base de datos con productos de ejemplo

**ID:** ZTV-7 (provisional S0-03)
**Título:** Configurar base de datos con productos de ejemplo
**Épica:** E0 – Fundaciones técnicas
**Tipo:** Habilitador técnico
**Prioridad (MoSCoW):** Must
**Estimación:** 3
**Sprint:** 0
**Estado:** Por hacer

### Historia
Como equipo de desarrollo,
quiero una base de datos PostgreSQL en Neon con el modelo de catálogo y productos de ejemplo,
para que las historias del catálogo tengan datos reales que mostrar y probar.

### Contexto
Mientras no exista el panel de administración, los productos se cargan por código (D6). El modelo incluye variantes desde el inicio (D5) para no tener que rehacer la base de datos cuando lleguen tallas y colores.

### Criterios de aceptación
Escenario 1: Carga de datos de ejemplo (camino feliz)
  Dado que la base de datos de desarrollo está vacía
  Cuando ejecuto `npm run db:seed`
  Entonces quedan creadas al menos 4 categorías y 20 productos activos, cada uno con al menos 1 variante, 1 foto, precio y stock

Escenario 2: Carga repetida (alterno)
  Dado que la base de datos ya tiene los datos de ejemplo
  Cuando ejecuto `npm run db:seed` otra vez
  Entonces no se duplican categorías ni productos

Escenario 3: Datos inválidos (error)
  Dado un producto de ejemplo con precio negativo o sin categoría
  Cuando se intenta guardar
  Entonces la carga falla con un mensaje que indica el producto y el campo inválido, y no se guarda ningún dato parcial

### Reglas de negocio
- RN1: Los precios se guardan como números enteros en pesos colombianos (sin centavos) y deben ser mayores que 0.
- RN2: Todo producto pertenece a exactamente una categoría.
- RN3: Todo producto tiene al menos una variante; el inventario (stock) se lleva por variante y nunca es negativo.
- RN4: El `slug` (texto de la URL) de productos y categorías es único, en minúsculas y sin tildes (ejemplo: `camiseta-basica-algodon`).
- RN5: Hay bases de datos separadas para desarrollo, pruebas (CI) y producción.

### Requisitos no funcionales
- Seguridad: la cadena de conexión solo vive en variables de entorno (`DATABASE_URL`), nunca en el código ni en el chat.
- Rendimiento: índices en `slug` y en `categoriaId`.
- Accesibilidad y responsive: No aplica.

### Diseño / Interfaz
No aplica.

### Notificaciones y correos
No aplica.

### Datos
- **Categoria:** id, nombre, slug, descripcion, orden, creadoEn.
- **Producto:** id, nombre, slug, descripcion, precio (entero COP), categoriaId, activo, creadoEn, actualizadoEn.
- **VarianteProducto:** id, productoId, sku, talla (opcional), color (opcional), stock (entero ≥ 0), precio (opcional; si está vacío usa el del producto).
- **ImagenProducto:** id, productoId, url, textoAlternativo, orden.

### Dependencias
- S0-01.
- Cuenta en Neon (plan gratuito). La crea el PO o se crea desde la integración de Vercel.

### Fuera de alcance
- Modelos de carrito, pedido, cliente y reseñas (llegan con sus historias).
- Subir fotos desde un panel (las fotos de ejemplo van en la carpeta `public/`).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| S0-03-CP1 | 1 | Integración | BD de pruebas vacía + seed | ≥ 4 categorías, ≥ 20 productos, cada uno con variante e imagen |
| S0-03-CP2 | 2 | Integración | Ejecutar el seed 2 veces | Mismo conteo que tras la primera vez |
| S0-03-CP3 | 3 | Unitaria | Producto con precio -100 | Error de validación "precio debe ser mayor que 0" |
| S0-03-CP4 | 3 | Unitaria | Variante con stock -1 | Error de validación, nada se guarda |

### Notas técnicas
- **Prisma** como ORM: `prisma/schema.prisma`, migraciones con `prisma migrate`, seed con `prisma/seed.ts` usando `upsert` por `slug` (así no se duplica).
- Validación con **Zod** antes de guardar.
- Neon tiene "ramas" de base de datos: una para desarrollo y otra para CI.
- Explicación sencilla: un **ORM** permite hablar con la base de datos usando TypeScript en lugar de SQL, y avisa si pedimos un campo que no existe.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas (S0-01, cuenta Neon)
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence (diagrama del modelo de datos)
- [ ] Aceptado por el Product Owner

---

## S0-04 · Desplegar automáticamente en Vercel

**ID:** ZTV-8 (provisional S0-04)
**Título:** Desplegar automáticamente en Vercel
**Épica:** E0 – Fundaciones técnicas
**Tipo:** Habilitador técnico
**Prioridad (MoSCoW):** Must
**Estimación:** 2
**Sprint:** 0
**Estado:** Por hacer

### Historia
Como Product Owner,
quiero que cada pull request genere una vista previa publicada en internet y que producción solo se actualice con mi aprobación,
para revisar los cambios desde mi celular antes de aceptarlos.

### Contexto
La DoD exige "Desplegado en Vercel". Las vistas previas por PR permiten hacer la revisión de aceptación sin instalar nada. La restricción del proyecto dice que nada llega a producción sin aprobación del PO.

### Criterios de aceptación
Escenario 1: Vista previa por PR (camino feliz)
  Dado un pull request abierto
  Cuando Vercel termina de construirlo
  Entonces aparece en el PR un comentario con el enlace a la vista previa y la página carga correctamente

Escenario 2: Paso a producción (alterno)
  Dado un PR aprobado por el PO e integrado a `main`
  Cuando Vercel termina el despliegue
  Entonces la URL de producción muestra la nueva versión

Escenario 3: Construcción fallida (error)
  Dado un PR cuyo código no compila
  Cuando Vercel intenta construirlo
  Entonces el despliegue queda marcado como fallido en el PR y la URL de producción sigue mostrando la versión anterior

### Reglas de negocio
- RN1: Producción solo se actualiza desde `main`, y a `main` solo llega lo aprobado por el PO (RN1 de S0-01).
- RN2: Las vistas previas usan la base de datos de desarrollo, nunca la de producción.
- RN3: Las variables de entorno se configuran en Vercel por ambiente (Preview / Production).

### Requisitos no funcionales
- Seguridad: HTTPS obligatorio (Vercel lo da por defecto).
- Rendimiento: el tiempo de construcción se mantiene dentro de los límites del plan Hobby.
- Responsive: la vista previa se revisa en celular y en escritorio.

### Diseño / Interfaz
No aplica (se usa la misma página temporal de S0-01).

### Notificaciones y correos
Vercel comenta en el PR el estado del despliegue y el enlace a la vista previa.

### Datos
No aplica.

### Dependencias
- S0-01 y S0-03.
- Cuenta de Vercel (Hobby) vinculada a GitHub.

### Fuera de alcance
- Dominio propio (por ahora se usa `*.vercel.app`).

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| S0-04-CP1 | 1 | Aceptación | PR de prueba | Comentario con el enlace; la página abre en el celular |
| S0-04-CP2 | 2 | Aceptación | Integrar PR a `main` | La URL de producción muestra el cambio |
| S0-04-CP3 | 3 | Aceptación | PR con error de compilación | Despliegue fallido; producción intacta |

### Notas técnicas
- Integración Git de Vercel + integración Neon–Vercel para las variables de entorno.
- La protección de rama + el PR obligatorio son el "botón de aprobación" del PO para producción.
- ⚠ Recordatorio: el plan Hobby no permite uso comercial. Si Zenda empieza a vender de verdad, hay que pasar a Pro.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main`
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions
- [ ] Desplegado en Vercel
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner

---

## S0-05 · Preparar Jira y Confluence para el proyecto

**ID:** ZTV-9 (provisional S0-05)
**Título:** Preparar Jira y Confluence para el proyecto
**Épica:** E0 – Fundaciones técnicas
**Tipo:** Habilitador técnico
**Prioridad (MoSCoW):** Must
**Estimación:** 2
**Sprint:** 0
**Estado:** Por hacer

### Historia
Como Product Owner,
quiero un proyecto Scrum en Jira y un espacio en Confluence con las plantillas acordadas,
para gestionar el backlog, los sprints y los planes de prueba en un solo lugar.

### Contexto
El acuerdo de trabajo define Jira para el backlog y Confluence para la documentación y los planes de prueba. Al iniciar el proyecto no existían; ahora Claude está conectado a Atlassian y puede registrar historias y páginas directamente.

### Criterios de aceptación
Escenario 1: Backlog registrado (camino feliz)
  Dado un proyecto Scrum en Jira con la clave "ZTV"
  Cuando se registran las historias de este backlog
  Entonces cada una tiene su épica, MoSCoW, puntos y sprint en campos de Jira, y la descripción sigue la plantilla

Escenario 2: Plantillas en Confluence (alterno)
  Dado el espacio "Zenda" en Confluence
  Cuando se crea una página nueva
  Entonces están disponibles las plantillas "Historia de usuario", "Plan de pruebas de sprint" e "Informe de pruebas"

Escenario 3: Sin conexión de Claude con Atlassian (error)
  Dado que Claude no tiene conexión con Jira ni con Confluence
  Cuando se necesite registrar una historia
  Entonces Claude entrega el contenido listo para pegar (Markdown) y la historia queda registrada manualmente por el PO

### Reglas de negocio
- RN1: La clave del proyecto en Jira es `ZTV` y los IDs se generan como `ZTV-1`, `ZTV-2`, etc.
- RN2: La prioridad se registra en el campo personalizado "MoSCoW" (Must, Should, Could, Won't), en Historia y Error.
- RN3: Cada sprint tiene su página de plan de pruebas en Confluence, enlazada desde el sprint en Jira.
- RN4: Los habilitadores técnicos se registran como Historia con la etiqueta `habilitador-tecnico`.

### Requisitos no funcionales
- Seguridad: los tokens de Atlassian no se comparten por chat; la conexión se hace desde los conectores de la app.
- Rendimiento, accesibilidad y responsive: No aplica.

### Diseño / Interfaz
Tablero Scrum con las columnas: Por hacer → En progreso → En pruebas → Hecho.

### Notificaciones y correos
Las notificaciones estándar de Jira al PO cuando una historia cambia a "En pruebas".

### Datos
No aplica.

### Dependencias
- Cuenta Atlassian (plan gratuito, hasta 10 usuarios).
- Opcional: conectar Atlassian en la app de Claude para que yo registre las historias directamente.

### Fuera de alcance
- Automatizaciones avanzadas de Jira.

### Casos de prueba
| ID caso | Escenario | Tipo | Datos de prueba | Resultado esperado |
|---|---|---|---|---|
| S0-05-CP1 | 1 | Aceptación | Historia S0-01 registrada | Campos nativos llenos; la descripción respeta la plantilla |
| S0-05-CP2 | 2 | Aceptación | Página nueva en el espacio Zenda | Las 3 plantillas disponibles |
| S0-05-CP3 | 3 | Aceptación | Sin conector | Markdown listo para pegar entregado |

### Notas técnicas
- Las plantillas se generan a partir de CLAUDE.md, la única fuente de verdad del formato.
- Esta historia la ejecutamos en conjunto: tú creas las cuentas y yo preparo el contenido.

### Definición de Listo (DoR)
- [x] Historia y contexto claros
- [x] Criterios de aceptación completos (3 escenarios)
- [x] Reglas de negocio definidas
- [x] Estimada en 8 puntos o menos
- [x] Dependencias identificadas
- [x] Aprobada por el Product Owner (2026-11-15)

### Definición de Terminado (DoD)
- [ ] Código en GitHub, revisado e integrado a `main` — No aplica (no hay código)
- [ ] Plan de pruebas de la historia ejecutado y casos aprobados
- [ ] Pruebas automatizadas pasando en GitHub Actions — No aplica
- [ ] Desplegado en Vercel — No aplica
- [ ] Documentado en Confluence
- [ ] Aceptado por el Product Owner
