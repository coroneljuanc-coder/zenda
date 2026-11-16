# Zenda – Tienda virtual

Tienda virtual de un solo vendedor con precios en pesos colombianos. Proyecto de aprendizaje construido con Scrum.

## Estructura (arquitectura C, ADR-001)

| Carpeta               | Qué es                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/tienda`         | Aplicación principal (Next.js): catálogo, carrito, compra, pagos e inventario. Puerto 3000.    |
| `apps/notificaciones` | Servicio independiente que envía los correos al recibir eventos. Puerto 3001.                  |
| `packages/contratos`  | Contratos compartidos (forma de los mensajes). Es lo único que comparten las dos aplicaciones. |
| `docs/`               | Backlog, historias y diagramas.                                                                |

## Cómo correrlo en tu equipo

Requisitos: Node.js 20 o superior y Git.

```bash
npm install
npm run dev
```

### Base de datos local (una sola vez)

La tienda usa PostgreSQL. En tu equipo se usa `prisma dev`, una base local y gratuita que no necesita cuentas:

```bash
cd apps/tienda
npx prisma dev -n zenda --detach   # arranca la base local y muestra su URL "TCP"
```

Copia `.env.example` como `apps/tienda/.env.local` y pega ahí esa URL (`DATABASE_URL`) y la de la base sombra (`SHADOW_DATABASE_URL`, mismo texto con el puerto siguiente). Luego, desde la raíz:

```bash
npm run db:migrar -w tienda   # crea las tablas
npm run db:seed               # carga el catálogo de ejemplo (se puede repetir sin duplicar)
```

- Tienda: http://localhost:3000
- Servicio de Notificaciones: http://localhost:3001/api/salud

## Comandos útiles

| Comando                    | Para qué                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `npm run lint`             | Revisa estilo y reglas (incluye la regla que impide mezclar código entre aplicaciones). |
| `npm run typecheck`        | Revisa los tipos de TypeScript.                                                         |
| `npm run build`            | Compila las aplicaciones.                                                               |
| `npm run format`           | Da formato al código con Prettier.                                                      |
| `npm test`                 | Pruebas unitarias (Vitest).                                                             |
| `npm run test:integracion` | Pruebas de integración contra la base de datos local (borran sus datos).                |
| `npm run db:seed`          | Carga el catálogo de ejemplo en la base de datos.                                       |
| `npm run test:e2e`         | Pruebas de punta a punta en celular y escritorio (Playwright).                          |

La primera vez, instala el navegador de pruebas con `npx playwright install chromium`.

## Integración continua

Cada pull request hacia `main` ejecuta el check **CI** en GitHub Actions: formato, lint, tipos, pruebas unitarias, migraciones y pruebas de integración contra un PostgreSQL temporal, carga de datos de ejemplo, compilación y pruebas E2E. Si el check queda en rojo, el pull request no se puede integrar. Solo se prueba la aplicación que cambió; si cambia algo compartido, se prueban ambas.

## Bases de datos de las vistas previas

Cada vista previa de la tienda tiene su propia rama de base de datos en Neon (`preview/<rama-de-git>`), con las migraciones aplicadas y los datos de ejemplo cargados. Al cerrar o integrar un pull request, la tarea **Limpiar ramas de Neon** (`.github/workflows/limpiar-ramas-neon.yml`) borra esa rama para no superar el límite de 10 ramas de Neon Free. Necesita el secreto `NEON_API_KEY` en GitHub. También se puede ejecutar a mano desde la pestaña Actions, indicando la rama de Git.

## Reglas del repositorio

- La rama `main` solo recibe cambios por pull request.
- Las ramas se nombran `tipo/ID-descripcion` (ej. `feat/ZTV-12-listado-productos`).
- Las credenciales nunca se suben: van en `.env.local` (ignorado por Git) o en Vercel. Ver `.env.example`.

Backlog en Jira (proyecto ZTV) y documentación en Confluence (espacio ZENDA).
