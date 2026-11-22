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

La tienda usa PostgreSQL. En tu equipo corre un PostgreSQL 17 local (el mismo del CI), gratuito y sin cuentas; los binarios llegan con `npm install` (paquete `embedded-postgres`). Desde la raíz:

```bash
npm run bd:iniciar   # la crea la primera vez y la arranca; muestra las dos URL
```

Copia `.env.example` como `apps/tienda/.env.local` y pega ahí las dos URL que mostró (`DATABASE_URL` y `SHADOW_DATABASE_URL`). Luego:

```bash
npm run db:migrar -w tienda   # crea las tablas
npm run db:seed               # carga el catálogo de ejemplo (se puede repetir sin duplicar)
```

Los datos quedan en `.bd-local/` (ignorada por Git). La base solo acepta conexiones de este computador.

| Comando                | Para qué                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm run bd:iniciar`   | Arranca la base local (si ya está arrancada, no hace nada).                     |
| `npm run bd:estado`    | Dice si está arrancada.                                                         |
| `npm run bd:reiniciar` | La detiene y la vuelve a arrancar. **Si algo falla con la base, empieza aquí.** |
| `npm run bd:detener`   | La detiene.                                                                     |

Para empezar de cero: `npm run bd:detener`, borra la carpeta `.bd-local/` y vuelve a `npm run bd:iniciar`, `db:migrar` y `db:seed`.

- Tienda: http://localhost:3000
- Servicio de Notificaciones: http://localhost:3001/api/salud

## Comandos útiles

| Comando                    | Para qué                                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verificar`        | **Antes de un PR:** corre todo en orden (base, formato, lint, tipos, pruebas, datos, compilación y E2E) y se detiene en el primer error. Con `-- --sin-e2e` omite las E2E. |
| `npm run lint`             | Revisa estilo y reglas (incluye la regla que impide mezclar código entre aplicaciones).                                                                                    |
| `npm run typecheck`        | Revisa los tipos de TypeScript.                                                                                                                                            |
| `npm run build`            | Compila las aplicaciones.                                                                                                                                                  |
| `npm run format`           | Da formato al código con Prettier.                                                                                                                                         |
| `npm test`                 | Pruebas unitarias (Vitest).                                                                                                                                                |
| `npm run test:integracion` | Pruebas de integración contra la base de datos local (borran sus datos).                                                                                                   |
| `npm run db:seed`          | Carga el catálogo de ejemplo en la base de datos.                                                                                                                          |
| `npm run test:e2e`         | Pruebas de punta a punta en celular y escritorio (Playwright).                                                                                                             |

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
