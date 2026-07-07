# Feature Specification: Presupuestos Financieros (Budgeting) y Proyecciones de Caja

**Feature Branch**: `013-budget-planning`

**Created**: 2026-07-04
**Updated**: 2026-07-05

**Status**: Draft

**Input**: User description: "Tenemos que agregar todo esto a nuestro plan actual, que solo contempla presupuestos por ingresos y egresos, pero debemos incorporar tambien los presupuestos de ahorros e inversiones (movimiento de activos), y financiamiento (movimientos de pasivo). Esto es necesario para tener los siguientes reportes: Flujo de caja, Flujo de caja proyectado, Estado de resultados, Estado de resultados proyectado."

---

## Clarifications

### Session 2026-07-05
- Q: ¿Cómo debe comportarse el sistema si el usuario intenta modificar el flag isCashOrBank de una cuenta contable que ya tiene transacciones asociadas? → A: Bloquear la modificación del flag si la cuenta ya tiene transacciones (A) para preservar la consistencia histórica.
- Q: ¿Cómo deben tratarse las cuentas de tipo EQUITY (Patrimonio Neto) en el Módulo de Presupuestos y en la proyección del Flujo de Caja? → A: Excluirlas por completo del módulo de presupuestos e ignorarlas en las proyecciones (A) para simplificar el modelo de finanzas familiares.
- Q: Al mostrar la "Desviación de Caja" de las cuentas de activos y pasivos en el Dashboard de Ejecución, ¿cómo debe calcularse y señalizarse el desvío? → A: Desviación basada en impacto de liquidez corriente (A). Salidas de efectivo corriente superiores a lo planificado o cobros reales inferiores a lo planificado son desvíos negativos y se alertan en rojo.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicialización Automática de Presupuestos (Priority: P1)

Como administrador del sistema, cuando inicializo un nuevo Ejercicio Fiscal (Fiscal Year), quiero que el sistema genere automáticamente los periodos contables y un presupuesto vacío asociado a cada periodo para evitar tener que configurar los presupuestos de forma manual.

**Why this priority**: Es la base del flujo automatizado. Garantiza que todos los periodos contables tengan un presupuesto pre-generado listo para ser editado desde el inicio del ejercicio fiscal.

**Independent Test**: Crear un nuevo Ejercicio Fiscal "2026". Verificar en la base de datos o en la interfaz que se crearon los 12 periodos mensuales correspondientes y que cada uno posee un registro de Presupuesto asociado con montos presupuestados inicializados en cero.

**Acceptance Scenarios**:
1. **Given** que un usuario crea un Ejercicio Fiscal válido, **When** el sistema genera sus periodos mensuales, **Then** también crea un registro de Presupuesto para cada periodo.
2. **Given** un presupuesto recién inicializado, **When** se consulta su detalle por primera vez, **Then** todas las cuentas de resultado y de balance tienen asignado un monto presupuestado inicial de `0`.

---

### User Story 2 - Formulario de Presupuesto Unificado y Flexible (Priority: P1)

Como administrador financiero o usuario hogareño, quiero presupuestar no solo mis consumos (Ingresos/Gastos) sino también mi ahorro, inversión y deudas en una sola pantalla visualmente dividida, para planificar la totalidad del movimiento de mi dinero en el mes.

**Why this priority**: Permite ingresar la planificación real y modificar los límites presupuestarios ante contingencias operativas o cambios del negocio sin barreras técnicas.

**Independent Test**: Ir a la edición de un presupuesto mensual, validar que el formulario esté dividido en 3 bloques (Consumos, Ahorros e Inversiones, Deudas y Tarjetas). Completar los inputs en cada sección, guardar y verificar que persistan los datos en las secciones correspondientes al recargar.

**Acceptance Scenarios**:
1. **Given** la pantalla de edición de presupuesto, **When** se despliega el formulario, **Then** se muestran tres secciones claramente rotuladas:
   - **Consumos**: Cuentas de tipo `INCOME` y `EXPENSE`.
   - **Ahorros e Inversiones**: Cuentas de tipo `ASSET` (excluyendo efectivo/bancos).
   - **Deudas y Tarjetas**: Cuentas de tipo `LIABILITY`.
2. **Given** las secciones patrimoniales (Ahorros e Inversiones, Deudas y Tarjetas), **When** se cargan montos, **Then** la UI provee columnas de acción intuitivas:
   - Para Activos: "Ahorrar/Prestar" (guarda como valor negativo en la BD para representar salida de caja) y "Retirar/Cobrar" (guarda como valor positivo en la BD para representar entrada de caja).
   - Para Pasivos: "Pagar Deuda" (guarda como valor negativo para representar salida de caja) y "Recibir Préstamo/Financiar" (guarda como valor positivo para representar entrada de caja).

---

### User Story 3 - Carga Masiva Anual con Variaciones Manuales (Priority: P2)

Como administrador financiero, quiero definir el presupuesto de una cuenta específica de forma idéntica para todo el año y poder ajustar manualmente solo ciertos meses con variaciones leves, para optimizar el tiempo de carga del presupuesto anual.

**Why this priority**: Mejora significativamente la experiencia de usuario (UX) al evitar tener que cargar repetitivamente el mismo monto 12 veces por cuenta.

**Independent Test**: Ir a la edición de "Enero 2026", escribir `3.000.000 ₲` en la cuenta de gasto "Alquileres", hacer clic en "Replicar a todo el Ejercicio" y guardar. Luego, abrir la edición de "Junio 2026", verificar que "Alquileres" tiene `3.000.000 ₲`, cambiar el valor a `3.500.000 ₲` (variación manual) y guardar. Al consultar otros meses (como Diciembre), deben mantener `3.000.000 ₲`.

**Acceptance Scenarios**:
1. **Given** el formulario de edición de presupuesto de un periodo mensual, **When** el usuario hace clic en el botón "Replicar a todo el Ejercicio" al lado de una cuenta, **Then** el sistema propaga ese valor a la misma cuenta en los otros 11 presupuestos vinculados al mismo Ejercicio Fiscal.
2. **Given** que se ha replicado un monto anualmente para una cuenta, **When** el usuario modifica manualmente esa cuenta en un mes específico y guarda, **Then** el cambio se aplica únicamente a ese mes, sin alterar el resto de los meses del año.

---

### User Story 4 - Dashboard de Ejecución Presupuestaria Unificado (Priority: P1)

Como socio o administrador, quiero consultar la ejecución en tiempo real de mi presupuesto para contrastar la planificación con las transacciones reales ocurridas en las fechas del Periodo.

**Why this priority**: Permite el análisis financiero en tiempo real y la detección temprana de sobregastos o desviaciones del plan.

**Independent Test**: Hacer clic en "Ver Informe" en un presupuesto. El sistema debe calcular el Real Ejecutado sumando dinámicamente las líneas de asientos confirmados cuyas fechas contables caigan dentro de los límites del periodo del presupuesto, y mostrar la tabla comparativa con alertas en rojo para los desvíos.

**Acceptance Scenarios**:
1. **Given** el informe de ejecución de un periodo mensual, **When** se visualiza la tabla de Consumos, **Then** el "Disponible" para gastos se calcula como `Presupuestado - Real` y se resalta en rojo si es negativo (sobregasto).
2. **Given** el informe de ejecución, **When** se visualiza la tabla de Movimientos Financieros (Activos y Pasivos), **Then** la columna "Desviación de Caja" refleja la diferencia de liquidez real vs presupuestada y resalta en rojo los desvíos negativos en caja.
3. **Given** el informe de ejecución, **When** el usuario baja al final, **Then** se renderiza un cuadro de "Resumen de Liquidez" consolidado que muestra:
   - Saldo de Caja Inicial Real.
   - Flujo Neto de Consumos (Presupuestado vs. Real).
   - Flujo Neto Financiero (Presupuestado vs. Real).
   - Flujo de Caja Neto del Mes (Presupuestado vs. Real).
   - Saldo de Caja Final (Proyectado vs. Real).

---

### User Story 5 - Reportes de Flujo de Caja y Resultados (Real vs. Proyectado) (Priority: P1)

Como tomador de decisiones o administrador del hogar, quiero acceder a reportes dedicados de Flujo de Caja y Estado de Resultados, tanto en su versión histórica (real) como en su proyección a futuro basada en el presupuesto, para tomar decisiones financieras informadas.

**Why this priority**: Es el objetivo final de valor de negocio que justifica el módulo de presupuestos.

**Independent Test**: Ir a la sección de Reportes, seleccionar un Ejercicio Fiscal e ingresar al reporte de Flujo de Caja. Verificar que muestre una grilla mensual comparando lo real histórico con la proyección futura de caja para los meses que aún no han transcurrido o que poseen presupuesto.

**Acceptance Scenarios**:
1. **Given** el reporte **Estado de Resultados (Real vs. Proyectado)**, **When** el usuario selecciona un rango de períodos, **Then** el sistema calcula los ingresos y gastos devengados reales para los períodos pasados/cerrados y los ingresos y gastos presupuestados para los períodos futuros.
2. **Given** el reporte **Flujo de Caja (Real vs. Proyectado)**, **When** el usuario lo consulta, **Then** el sistema:
   - Para períodos históricos (Reales): Suma las entradas y restas las salidas reales ocurridas en las cuentas marcadas como efectivo y equivalentes (Caja y Bancos).
   - Para períodos proyectados (Futuros): Calcula la caja partiendo del saldo real del último período cerrado, sumando algebraicamente los presupuestos de resultados (`INCOME` y `EXPENSE`) y los presupuestos de movimientos patrimoniales (`ASSET` y `LIABILITY` con sus respectivos signos de afectación de caja).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST generar de forma automática un registro de Presupuesto (Budget) en relación 1-a-1 por cada Periodo (Period) que se cree al inicializar un Ejercicio Fiscal (Fiscal Year).
- **FR-002**: El presupuesto generado automáticamente MUST tomar el nombre de su Periodo correspondiente (por ejemplo: "Enero 2026") como nombre identificador.
- **FR-003**: El formulario de edición de presupuesto MUST mostrar el Nombre (Periodo) y las fechas del período como campos no editables (sólo lectura).
- **FR-004**: El formulario de edición de presupuesto MUST dividir visualmente las cuentas contables activas en tres bloques: Consumos (Ingresos y Gastos), Ahorros e Inversiones (Activos no líquidos), y Deudas y Tarjetas (Pasivos).
- **FR-005**: El sistema MUST permitir presupuestar montos tanto positivos como negativos en las cuentas patrimoniales del presupuesto (`ASSET` y `LIABILITY`) para representar de forma directa entradas o salidas de dinero en caja.
- **FR-006**: El sistema MUST pre-cargar los montos guardados anteriormente en los inputs del formulario de edición.
- **FR-007**: El sistema MUST proveer una opción de "Replicar a todo el Ejercicio" junto a cada cuenta en el formulario de edición, propagando el valor ingresado a los otros 11 meses del Ejercicio Fiscal.
- **FR-008**: El sistema MUST admitir un atributo `isCashOrBank` (boolean) en la entidad de cuentas contables (`Account`) para identificar cuáles cuentas del activo representan disponibilidad de efectivo/banco líquido.
- **FR-009**: El informe de ejecución presupuestaria MUST calcular en tiempo real las transacciones reales ocurridas en las fechas del Periodo.
- **FR-010**: El informe de ejecución presupuestaria MUST estructurar la información en tres bloques equivalentes a la pantalla de edición, resaltando en rojo cualquier desvío negativo en el Disponible o Desviación de Caja.
- **FR-011**: El informe de ejecución presupuestaria MUST incluir un cuadro de consolidación de liquidez al final del reporte para contrastar la caja neta real con la proyectada.
- **FR-012**: El sistema MUST proveer un reporte de **Estado de Resultados (Real vs. Proyectado)** mensualizado.
- **FR-013**: El sistema MUST proveer un reporte de **Flujo de Caja (Real vs. Proyectado)** mensualizado, calculando la proyección financiera a partir del presupuesto unificado y las políticas de afectación de caja asociadas a las cuentas patrimoniales.
- **FR-014**: El sistema MUST bloquear cualquier cambio al flag `isCashOrBank` de una cuenta si ésta ya posee transacciones (`JournalEntry`) asociadas en el libro diario.
- **FR-015**: El sistema MUST excluir las cuentas de tipo `EQUITY` del formulario de edición del presupuesto y de la lógica de proyecciones financieras.
- **FR-016**: La "Desviación de Caja" para cuentas de activos y pasivos en el informe de ejecución MUST calcularse basándose en el impacto de liquidez del mes corriente (salidas mayores o cobros menores a lo planificado son desvíos negativos).

---

### Edge Cases

- **Intento de modificación de `isCashOrBank`**: Si el usuario intenta cambiar el flag `isCashOrBank` de una cuenta que ya tiene movimientos, la API retornará un código HTTP 400 Bad Request y la UI deshabilitará esta opción.
- **Exclusión de EQUITY**: Las cuentas patrimoniales de tipo `EQUITY` no aparecerán en el planificador ni afectarán las proyecciones; cualquier movimiento patrimonial extraordinario (ej. aporte de capital) se presupuestará en cuentas de ingresos o pasivos autorizadas.
- **Ahorro de más (Impacto de caja)**: Si el usuario presupuesta ahorrar `-200` y transfiere `-250` reales, el Dashboard de Ejecución alertará un desvío negativo en la caja de `$50`, ya que se retiró más efectivo de la cuenta operativa del que estaba planificado.

---

### Key Entities *(include if feature involves data)*

- **Budget (Presupuesto)**: Relación 1-a-1 con `Period`.
  - Atributos: ID, ID Periodo (Relación única/Foreign Key), Fecha de Creación, Fecha de Actualización.
- **BudgetItem (Línea de Presupuesto)**: Detalle del monto presupuestado por cuenta.
  - Atributos: ID, ID Presupuesto (Relación), ID Cuenta Contable (Relación), Monto Presupuestado (número positivo o negativo).
- **Period (Periodo)**: Entidad contable existente. Su ciclo de vida controla la creación del Presupuesto.
- **Account (Cuenta Contable)**: Entidad contable existente.
  - Atributos extendidos: `isCashOrBank: boolean` (para marcar cuentas de disponibilidad líquida).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al crear un Ejercicio Fiscal, el sistema genera el 100% de los presupuestos correspondientes (12 registros en total) de forma síncrona.
- **SC-002**: La pantalla de edición del presupuesto clasifica correctamente el 100% de las cuentas del plan de cuentas en las tres secciones de la UI en menos de 1 segundo.
- **SC-003**: La replicación de un monto (positivo o negativo) a los 12 meses de un Ejercicio Fiscal se procesa con una sola interacción de usuario y se guarda correctamente en la base de datos.
- **SC-004**: Los reportes consolidados de Estado de Resultados y Flujo de Caja (Histórico y Proyectado) responden en menos de 1.5 segundos calculando dinámicamente los movimientos.
- **SC-005**: La interfaz resalta en color rojo al 100% de las cuentas que superen el límite de gasto o que presenten un desvío negativo en el flujo de caja del mes.

---

## Assumptions

- **A-001**: La creación del Ejercicio Fiscal ya cuenta con la lógica para auto-generar los periodos contables mensuales. El trigger/servicio de presupuestos se enganchará a este mismo proceso.
- **A-002**: Si se modifica un Periodo (ej. se cambian sus fechas), el presupuesto asociado hereda dinámicamente el nuevo rango de fechas para el cálculo de su ejecución real.
- **A-003**: Las cuentas de efectivo y bancos (Caja, Bancos, Cuenta de Ahorro a la vista) se marcan con `isCashOrBank = true`. Estas cuentas no se listan en el formulario de presupuestos (no se presupuesta el efectivo en sí mismo, sino los movimientos que entran o salen de él).
- **A-004**: Los importes se manejan en Guaraníes paraguayos (₲) sin necesidad de multimoneda.
- **A-005**: Las políticas de afectación de caja (Flujo de Caja Proyectado) definen que:
  - Cuentas de tipo `INCOME` y `EXPENSE` se suman y restan de forma devengada normal.
  - Cuentas de tipo `ASSET` (no equivalentes a efectivo): Ahorros/inversiones (salidas) se guardan como montos negativos; cobros/liquidaciones (entradas) se guardan como montos positivos.
  - Cuentas de tipo `LIABILITY`: Pagar deudas (salidas) se guardan como montos negativos; recibir préstamos (entradas) se guardan como montos positivos.
  - De esta forma, el neto se calcula sumando directamente los montos presupuestados: `Net Flow = Sum(INCOME.budgeted) - Sum(EXPENSE.budgeted) + Sum(ASSET.budgeted) + Sum(LIABILITY.budgeted)`.
- **A-006**: Para US2, las columnas de acción representan controles simples en la interfaz (botones o inputs guiados) que formatean de forma transparente el signo matemático al persistir en base de datos.
- **A-007**: Para US3, la variación manual en cualquier mes significa la capacidad de reescribir cualquier input específico de mes con cualquier valor numérico independiente.
