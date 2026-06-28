# Feature Specification: Web Accounting App (Sistema Contable)

**Feature Branch**: `001-accounting-webapp`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Precisamos desarrollar una app contable para contabilidad personal y/o familiar con presupuestos que respete la partida doble. La idea es clonar una aplicación mobile que actualmente está en la playstore y se llama Registro Contable de RealByte pero que sea una webapp con una DB PostgresQl. Backend: nestjs. Frontend: nextjs mobile first. Te voy a dar información de la aplicación tales como archivos que genera, archivos sqlite y screenshots de pantallas cruciales para que hagas ingeniería inversa de cómo funciona y qué funcionalidades tenemos que incorporar a nuestro desarrollo. Una diferencia clave que quiero agregar a la funcionalidad de nuestro programa contable es que se puedan hacer asientos contables con varios items, ya que en la app mobile estaba limitada a solamente un debito y un credito por registro."

## Clarifications

### Session 2026-06-27

- Q: ¿Cómo se define y gestiona el plan de cuentas (sistema de cuentas) para el usuario? → A: El sistema de cuentas debe ser maleable; el usuario define libremente las cuentas que desee bajo los tipos base (Activos, Pasivos, Ingresos, Gastos, Patrimonio Neto, etc.).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de Transacciones Básicas (Ingreso, Gasto, Transferencia) (Priority: P1)

Como usuario de contabilidad personal, quiero registrar mis transacciones diarias (ingresos, gastos y transferencias) mediante formularios sencillos para mantener mi saldo actualizado sin necesidad de ser un experto contable.

**Why this priority**: Es el núcleo funcional que permite la captura de datos básica. Si un usuario no puede registrar un gasto o un ingreso, el sistema no tiene valor.

**Independent Test**: Registrar un gasto de $50,000 en la categoría "Comida" pagado en efectivo. El sistema debe reflejar la disminución en la cuenta "Efectivo" y el incremento en el gasto de "Comida".

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con una cuenta de activos "Efectivo" con saldo de $100,000, **When** registra un gasto de $30,000 en la categoría "Almuerzo" usando la cuenta "Efectivo", **Then** el saldo de "Efectivo" disminuye a $70,000 y se genera un asiento contable cuadrado de débito en gastos por $30,000 y crédito en activos por $30,000.
2. **Given** un usuario con una cuenta "Caja de Ahorros" con saldo de $500,000, **When** registra una transferencia de $100,000 a la cuenta "Efectivo", **Then** el saldo de "Caja de Ahorros" disminuye a $400,000, el saldo de "Efectivo" aumenta en $100,000, y el asiento contable registra débito en "Efectivo" y crédito en "Caja de Ahorros".

---

### User Story 2 - Asientos Contables Multi-Item (Priority: P1)

Como usuario avanzado, quiero registrar asientos contables con múltiples partidas (débitos y créditos) en una sola transacción para registrar compras complejas o distribuciones detalladas de dinero (ej. compras en el supermercado que incluyen comida y ropa, o pago de tarjeta de crédito que incluye intereses y comisiones).

**Why this priority**: Es el principal diferenciador y mejora clave solicitada sobre la aplicación móvil original de RealByte. Permite una contabilidad más precisa de partida doble.

**Independent Test**: Crear un asiento manual donde se debite "Comida" por $70,000 y "Ropa" por $30,000, y se acredite "Tarjeta de Crédito" por $100,000. El asiento debe validarse y guardarse correctamente.

**Acceptance Scenarios**:

1. **Given** un formulario de asiento contable libre, **When** el usuario introduce múltiples líneas (ej. Débito a Gasto A por $40, Crédito a Activo B por $40), **Then** el sistema permite guardar el asiento si la suma de todos los débitos es exactamente igual a la de los créditos.
2. **Given** un asiento contable donde la suma de débitos es de $100 y la suma de créditos es de $95, **When** el usuario intenta guardar el asiento, **Then** el sistema muestra un error de validación indicando que el asiento está descuadrado por $5 y no permite la persistencia.

---

### User Story 3 - Visualización de Saldos, Cuentas y Patrimonio Neto (Priority: P2)

Como jefe de hogar, quiero ver el listado de mis cuentas (efectivo, bancos, tarjetas) agrupadas y mi patrimonio neto en tiempo real para entender mi salud financiera de un vistazo.

**Why this priority**: Proporciona el reporte consolidado del estado financiero (balance). Es fundamental para la toma de decisiones.

**Independent Test**: Consultar la pantalla de cuentas y verificar que el patrimonio neto corresponda a la suma de todas las cuentas de activos menos las cuentas de pasivos (tarjetas de crédito).

**Acceptance Scenarios**:

1. **Given** que un usuario posee $1,000,000 en "Efectivo" (Activo), $2,000,000 en "Bancos" (Activo) y debe $500,000 en "Tarjeta de Crédito" (Pasivo), **When** accede a la sección de Cuentas, **Then** el sistema muestra las cuentas agrupadas por su tipo y un Patrimonio Neto total de $2,500,000.

---

### User Story 4 - Control y Seguimiento de Presupuestos (Priority: P2)

Como administrador del presupuesto familiar, quiero definir límites de gasto mensuales por categoría y ver el porcentaje de consumo para evitar gastar de más.

**Why this priority**: Es una funcionalidad clave de control financiero. Ayuda a planificar y controlar los gastos familiares.

**Independent Test**: Asignar un presupuesto de $1,000,000 a la categoría "Comida" para el mes actual y verificar que se calcule el consumo acumulado con cada nuevo gasto registrado en esa categoría.

**Acceptance Scenarios**:

1. **Given** un presupuesto de $500,000 en la categoría "Comida" para el mes en curso y gastos ya registrados por $200,000, **When** el usuario consulta la pantalla de presupuestos, **Then** el sistema muestra que se ha consumido el 40% ($200,000), restan $300,000 y muestra un indicador visual en color verde.
2. **Given** un presupuesto mensual recurrente (periodo 0) para "Transporte" de $100,000, **When** no se ha definido un presupuesto específico para el mes actual, **Then** el sistema aplica por defecto el presupuesto general de $100,000 para el mes actual.

---

### User Story 5 - Estadísticas y Gráficos de Distribución (Priority: P3)

Como usuario analítico, quiero ver gráficos circulares y de barras que resuman mis gastos e ingresos por categoría y periodo para identificar en qué se me va el dinero.

**Why this priority**: Mejora la experiencia de usuario y el análisis de datos a largo plazo. Es de menor prioridad que las transacciones y presupuestos.

**Independent Test**: Generar el gráfico de gastos del mes actual y verificar que las proporciones del gráfico coincidan con los totales sumados de las transacciones de cada categoría.

**Acceptance Scenarios**:

1. **Given** transacciones del mes que suman $800,000 en "Comida" y $200,000 en "Transporte", **When** el usuario abre la sección de estadísticas para el mes actual, **Then** el sistema muestra un gráfico de distribución donde "Comida" representa el 80% del gasto y "Transporte" el 20%.

---

### User Story 6 - Exportación a Excel y Respaldos (Priority: P3)

Como usuario precavido, quiero exportar mis transacciones a formato Excel y generar archivos de respaldo de mis datos para poder analizarlos fuera del sistema o guardarlos de forma segura.

**Why this priority**: Utilidad para portabilidad de datos y auditoría personal.

**Independent Test**: Exportar las transacciones de un mes y abrir el archivo generado para confirmar que las columnas coinciden con el formato del archivo original (`Registro Contable - Excel.xlsx`).

**Acceptance Scenarios**:

1. **Given** un listado de transacciones registradas, **When** el usuario presiona "Exportar a Excel", **Then** el sistema descarga un archivo con las columnas: Fecha, Cuenta, Categoría, Subcategorías, Nota, Importe Base, Tipo (Ingreso/Gasto/Transferencia), Descripción, Importe Transacción, Moneda.

---

### Edge Cases

- **Asientos con múltiples monedas (Multidivisa)**: Si un asiento multi-item involucra transacciones en diferentes monedas (ej. pagar en dólares con una tarjeta en guaraníes), ¿cómo se valida el cuadre? El sistema debe forzar a ingresar las tasas de cambio de forma que la conversión a la moneda base (ej. PYG) esté balanceada ($\sum \text{Débitos en Moneda Base} = \sum \text{Créditos en Moneda Base}$).
- **Cierre de Ciclos de Tarjetas de Crédito**: Manejar la generación automática de la transacción de pago de tarjeta de crédito al llegar la fecha de vencimiento si está configurado como pago automático, o alertar al usuario si es manual.
- **Categorías Eliminadas**: Si se elimina una categoría que tiene transacciones históricas o presupuestos asignados, el sistema no debe eliminar las transacciones. Debe impedir la eliminación física de categorías con transacciones asociadas y en su lugar realizar un borrado lógico (marcar como inactiva/eliminada) para preservar la integridad histórica del libro contable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema debe basarse estrictamente en la **partida doble**. Cada transacción (asiento contable) debe grabarse en un diario y estar compuesta por al menos dos apuntes (ítems).
- **FR-002**: Toda transacción debe cumplir la ecuación contable fundamental de cuadre: la suma de los importes de los apuntes de tipo Débito debe ser igual a la suma de los importes de los apuntes de tipo Crédito (convertidos a la moneda base del sistema).
- **FR-003**: El sistema debe proporcionar plantillas simplificadas de interfaz para registrar "Ingresos", "Gastos" y "Transferencias" que traduzcan la entrada del usuario en asientos contables balanceados de forma automática y transparente.
- **FR-004**: El sistema debe contar con un editor de asientos avanzado (Asiento Libre) para registrar transacciones complejas con un número arbitrario de apuntes de débitos y créditos.
- **FR-005**: El libro contable debe ser **inmutable y de solo anexión**. Las transacciones guardadas no pueden ser modificadas directamente ni eliminadas de la base de datos; cualquier corrección o anulación debe realizarse mediante un asiento de reversión o ajuste.
- **FR-006**: El sistema de cuentas debe ser completamente maleable y personalizable por el usuario. El usuario puede crear, renombrar y clasificar sus propias cuentas bajo los tipos contables base (Activos, Pasivos, Ingresos, Gastos, Patrimonio Neto, etc.) para estructurar su plan de cuentas.
- **FR-007**: El sistema debe permitir la definición de presupuestos mensuales por categoría (o subcategoría) de gastos. Si no hay un presupuesto explícito para un mes, se debe utilizar el presupuesto general por defecto (periodo 0).
- **FR-008**: El sistema debe soportar múltiples monedas, permitiendo definir una moneda base y actualizar las tasas de cambio para cuentas en monedas extranjeras.
- **FR-009**: Las categorías de gastos y de ingresos deben soportar un nivel de anidamiento de subcategorías (máximo 2 niveles de jerarquía).
- **FR-010**: El sistema debe permitir la exportación de transacciones filtradas por periodo a un formato compatible con hojas de cálculo (Excel), respetando la estructura de campos analizada en la ingeniería inversa.

### Key Entities *(include if feature involves data)*

- **Account (Cuenta)**: Representa una entidad financiera del usuario (ej. efectivo, cuenta bancaria, tarjeta de crédito). Atributos: ID, nombre, código/grupo, tipo (Activo, Pasivo, etc.), moneda, saldo actual, fecha de cierre (tarjetas), cuenta de pago asociada.
- **Category (Categoría/Cuenta de Resultado)**: Representa una clasificación de ingresos o gastos (ej. comida, transporte, salario). Atributos: ID, nombre, tipo (Ingreso, Gasto), categoría padre (PID), orden.
- **Transaction (Asiento Contable / Transacción)**: El encabezado del registro contable. Atributos: ID, fecha de la transacción, fecha de registro, descripción general, estado (Vigente, Anulado/Reversado), nota, tags, ruta de adjunto (foto).
- **JournalEntry (Apunte / Línea de Asiento)**: Cada una de las líneas que componen una transacción. Atributos: ID, ID de transacción, ID de cuenta (o categoría), tipo de movimiento (Débito, Crédito), importe en moneda de la transacción, tasa de cambio, importe en moneda base.
- **Budget (Presupuesto)**: Estructura de control para limitar el gasto. Atributos: ID, ID de categoría, tipo de periodo (ej. mensual), estado (activo/eliminado).
- **BudgetAmount (Importe de Presupuesto)**: El límite financiero asignado a un presupuesto para un periodo específico. Atributos: ID, ID de presupuesto, importe, periodo (ej. `YYYYMM` o `0` para el valor por defecto).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las transacciones persistidas en el sistema deben estar contablemente balanceadas ($\sum \text{Débitos} = \sum \text{Créditos}$) en moneda base en el momento de la confirmación.
- **SC-002**: Un usuario debe poder registrar un gasto común utilizando la interfaz simplificada en menos de 10 segundos.
- **SC-003**: El cálculo del Patrimonio Neto y de los consumos presupuestarios debe actualizarse en tiempo real (en menos de 500ms tras confirmar una transacción).
- **SC-004**: La tasa de error en la importación de respaldos existentes (en formato compatible con SQLite) debe ser del 0% para esquemas de datos estándar.

## Assumptions

- **A-001**: El sistema está pensado con un enfoque mobile-first (diseño adaptativo para pantallas de celulares), pero accesible vía web.
- **A-002**: Las tasas de cambio se ingresan manualmente en transacciones multimoneda o se toman de una tabla de cotizaciones diaria ingresada por el usuario. No se requiere integración automática con APIs de cotización externa en la primera versión.
- **A-003**: Se asume que el usuario requiere control de acceso y separación de datos por cada usuario/familia (multi-inquilino o multi-usuario), por lo que se implementará autenticación y asignación de espacio de trabajo contable.
- **A-004**: Los adjuntos (fotos de facturas o tickets) se almacenarán en el servidor de archivos o un bucket compatible, guardando solo la ruta/referencia en la base de datos.
