# Seguridad de las dependencias

Registro de las alertas de `npm audit` y de lo que se decidió con cada una. Se revisa en cada tarea
de mantenimiento y antes de publicar una versión.

## Revisión del 2026-11-20 (ZTV-29)

`npm audit` reportó 10 alertas: 3 altas y 7 moderadas. Ninguna afecta a la tienda que ven los
visitantes: todas vienen de herramientas de desarrollo o de compilación.

### 3 altas: `effect` (corregidas)

- **Qué es:** `effect` 3.20.0 tiene una falla de rendimiento con expresiones regulares (ReDoS),
  corregida desde la 3.22.1. La trae fija `@prisma/config`, la configuración de Prisma, que se usa al
  compilar y al aplicar migraciones.
- **Arreglo propuesto por npm:** volver de Prisma 7 a Prisma 6. Se descartó porque es un cambio de
  versión mayor hacia atrás.
- **Arreglo aplicado:** `overrides` en el `package.json` de la raíz que fuerza `effect` 3.22.4,
  publicada el 2026-10-22. Es de la misma versión mayor (3.x) y no cambia su interfaz.
- **Verificación:** `prisma generate` y `prisma validate` funcionan; el CI corre migraciones, carga
  de datos, compilación y todas las pruebas con esta versión.
- **Aviso esperado:** `npm ls effect` muestra «invalid» porque Prisma pide exactamente la 3.20.0.
  Es solo un aviso de `npm ls`; la instalación (`npm ci` y `npm install`) conserva la 3.22.4.
- **Cuándo quitarlo:** cuando una versión de Prisma traiga `effect` 3.22.1 o superior, se borra el
  `overrides`.

### 7 moderadas: `minimatch` (aceptadas por ahora)

- **Qué es:** `minimatch` 10.x tiene una posible denegación de servicio con patrones de archivos
  muy complejos. La usan `typescript-eslint` y `eslint-config-next`, es decir, el revisor de estilo
  del código (ESLint).
- **Por qué no es un riesgo hoy:** ESLint solo corre en el computador de desarrollo y en el CI, con
  patrones escritos por nosotros. No procesa nada que envíen los visitantes y no forma parte de la
  tienda publicada.
- **Por qué no se corrigió ya:** el arreglo exige `typescript-eslint` 8.73.0 y `minimatch` 11.0.9,
  publicadas el 2026-11-16 (4 días antes de esta revisión) y, en el caso de `minimatch`, con cambio
  de versión mayor. La regla del equipo es no instalar versiones con menos de dos semanas.
- **Cuándo retomarlo:** en el mantenimiento del Sprint 2, si esas versiones ya tienen más de dos
  semanas y `eslint-config-next` las acepta.

## Revisión del 2026-11-22 (ZTV-84, acción A7)

`npm audit` sigue con las mismas 7 alertas moderadas de `minimatch` (cadena de `typescript-eslint`).
`npm audit --omit=dev`, es decir, lo que se publica: **0 alertas**.

- `typescript-eslint` 8.73.0, la versión que las corrige, se publicó el 2026-11-16: el 22 de
  noviembre tiene 6 días. Cumple las dos semanas el **2026-11-30**.
- `minimatch` 11.0.9 (2026-11-16) también cumple las dos semanas el 30 de noviembre. Forzarla con
  `overrides` sobre `typescript-eslint` 8.72.2 sería un cambio de versión mayor no probado por sus
  autores: se descarta.
- **Decisión:** se mantienen aceptadas. Se actualiza `typescript-eslint` a 8.73.0 en el mantenimiento
  del Sprint 4 (desde el 30 de noviembre), se corre `npm audit` y se anota aquí el resultado.
