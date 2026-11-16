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

- Tienda: http://localhost:3000
- Servicio de Notificaciones: http://localhost:3001/api/salud

## Comandos útiles

| Comando             | Para qué                                                                                |
| ------------------- | --------------------------------------------------------------------------------------- |
| `npm run lint`      | Revisa estilo y reglas (incluye la regla que impide mezclar código entre aplicaciones). |
| `npm run typecheck` | Revisa los tipos de TypeScript.                                                         |
| `npm run build`     | Compila las aplicaciones.                                                               |
| `npm run format`    | Da formato al código con Prettier.                                                      |

## Reglas del repositorio

- La rama `main` solo recibe cambios por pull request.
- Las ramas se nombran `tipo/ID-descripcion` (ej. `feat/ZTV-12-listado-productos`).
- Las credenciales nunca se suben: van en `.env.local` (ignorado por Git) o en Vercel. Ver `.env.example`.

Backlog en Jira (proyecto ZTV) y documentación en Confluence (espacio ZENDA).
