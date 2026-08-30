# Sistema Contable - Monorepo

Este es un monorepo para la aplicación de Contabilidad de partida doble con NestJS (Backend) y Next.js (Frontend).

## Requisitos Previos

- Node.js v18 o superior
- Docker y Docker Compose (para base de datos PostgreSQL)

---

## Base de Datos: Comandos de Montaje y Sembrado (Seeding)

Para facilitar las pruebas de flujos complejos (como el cierre de año contable o bloqueos de períodos mensuales), se implementó un sistema de **Sembrado Basado en Escenarios** en TypeScript/NestJS.

Los comandos se corren usando workspaces de npm desde la raíz del monorepo:

### 1. Recrear Base de Datos con Escenario Listo para Cierre (Recomendado)

Limpia todo el esquema de la base de datos local, lo recrea y siembra el escenario del año 2025 con movimientos contables reales balanceados de ingresos/egresos listos para procesar un cierre anual.

```bash
npm run db:reset --workspace=backend
```

### 2. Sembrar Escenario del Año ya Cerrado

Ideal para verificar bloqueos de periodos y los saldos iniciales del año siguiente (2026). Crea el escenario de movimientos del 2025, el ejercicio 2026, y ejecuta de forma programática el Caso de Uso de cierre contable registrando el asiento de pérdidas y ganancias de fin de año de forma automática.

```bash
npm run db:seed --workspace=backend -- --scenario=closed-year
```

### 3. Sembrar Base de Datos Limpia (Solo Monedas y Usuario)

Crea al usuario de pruebas y las monedas iniciales (PYG y USD), dejando el catálogo de cuentas contables vacío para que las vayas creando a demanda desde la aplicación.

```bash
npm run db:seed --workspace=backend -- --scenario=base
```

### 4. Limpieza del Esquema (Drop)

Borra todas las tablas de forma limpia respetando las dependencias de claves foráneas.

```bash
npm run db:drop --workspace=backend
```

### 5. Sincronizar el Esquema (Sync)

Recrea la estructura de tablas e índices del ORM de manera local sin pasar por migraciones.

```bash
npm run db:sync --workspace=backend
```

---

## Credenciales de Acceso de Prueba

Al sembrar cualquiera de los escenarios anteriores se creará el siguiente usuario de desarrollo:

- **Email**: `test@sistema.com`
- **Contraseña**: `password123`

---

## Estructura del Monorepo

- [shared/](file:///Users/ale/dev/sistema-contable/shared): Validaciones de esquemas compartidos y tipos de datos TypeScript.
- [backend/](file:///Users/ale/dev/sistema-contable/backend): API REST con NestJS y TypeORM.
  - [src/infrastructure/database/seeds/](file:///Users/ale/dev/sistema-contable/backend/src/infrastructure/database/seeds): Scripts de sembrado contable y escenarios.
- [frontend/](file:///Users/ale/dev/sistema-contable/frontend): Aplicación web con Next.js y TailwindCSS.

---

## Presupuestos y Proyecciones de Caja

Se han incorporado capacidades avanzadas de presupuestación y proyección financiera:

1. **Inicialización Automática**: Al crear un Ejercicio Fiscal se inicializan 12 presupuestos mensuales en cero.
2. **Matriz Anual**: Panel consolidado para visualizar y navegar los presupuestos de todo el año.
3. **Editor Tabular Inteligente**: Interfaz dinámica ("add-on-demand") para agregar partidas, definir importes (ahorros e inversiones se expresan como valores negativos) y replicar montos de forma anual.
4. **Control de Desviaciones (Real vs. Presupuestado)**: Tablas comparativas y KPIs de liquidez neta del mes.
5. **Proyecciones Financieras**: Estado de Resultados y Flujo de Caja Proyectado a 12 meses móviles (Rolling Forecast) con pre-apertura automática del siguiente año fiscal en modo planificación (`PLANNING`).
