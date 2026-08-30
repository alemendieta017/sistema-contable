# Feature Specification: Presupuestos Financieros (Budgeting) y Proyecciones de Caja

**Feature Branch**: `013-budget-planning`

**Created**: 2026-07-04
**Updated**: 2026-07-07

**Status**: Draft

**Input**: User description: "Tenemos que agregar todo esto a nuestro plan actual, que solo contempla presupuestos por ingresos y egresos, pero debemos incorporar tambien los presupuestos de ahorros e inversiones (movimiento de activos), y financiamiento (movimientos de pasivo). Esto es necesario para tener los siguientes reportes: Flujo de caja, Flujo de caja proyectado, Estado de resultados, Estado de resultados proyectado. Ademas, la experiencia de creacion de presupuesto quiero que sea ir agregando items al presupuesto, no que ya esten predefinidos y ocupando mucho lugar por fila, es decir, quiero que sea similar a una tabla, bien bonita y clean pero tabla al final, por cada rubro/fila. La agrupacion de ingresos egresos movimientos de caja etc obviamente deben ir agrupados. Puedes basarte en el diseño de Ejecución Presupuestaria como base."

---

## Clarifications

### Session 2026-07-05

- Q: ¿Cómo debe comportarse el sistema si el usuario intenta modificar el flag isCashOrBank de una cuenta contable que ya tiene transacciones asociadas? → A: Bloquear la modificación del flag si la cuenta ya tiene transacciones (A) para preservar la consistencia histórica.
- Q: ¿Cómo deben tratarse las cuentas de tipo EQUITY (Patrimonio Neto) en el Módulo de Presupuestos y en la proyección del Flujo de Caja? → A: Excluirlas por completo del módulo de presupuestos e ignorarlas en las proyecciones (A) para simplificar el modelo de finanzas familiares.
- Q: Al mostrar la "Desviación de Caja" de las cuentas de activos y pasivos en el Dashboard de Ejecución, ¿cómo debe calcularse y señalizarse el desvío? → A: Desviación basada en impacto de liquidez corriente (A). Salidas de efectivo corriente superiores a lo planificado o cobros reales inferiores a lo planificado son desvíos negativos y se alertan en rojo.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Inicialización Automática de Presupuestos (Priority: P1)

Como administrador del sistema, cuando inicializo un nuevo Ejercicio Fiscal (Fiscal Year), quiero que el sistema genere automáticamente los periodos contables mensuales y un presupuesto vacío (con montos en cero) asociado a cada periodo para evitar tener que configurar los presupuestos de forma manual.

**Why this priority**: Es la base de la automatización. Asegura la coherencia de datos vinculando cada periodo mensual a su correspondiente estructura de presupuesto desde su creación.

**Independent Test**: Crear un nuevo Ejercicio Fiscal "2026". Verificar en la base de datos o en la interfaz que se crearon los 12 periodos mensuales correspondientes y que cada uno posee un registro de Presupuesto asociado con montos presupuestados inicializados en cero.

**Acceptance Scenarios**:

1. **Given** que un usuario crea un Ejercicio Fiscal válido, **When** el sistema genera sus periodos mensuales, **Then** también crea un registro de Presupuesto para cada periodo.
2. **Given** un presupuesto recién inicializado, **When** se consulta su detalle por primera vez, **Then** todas las cuentas de resultado y de balance tienen asignado un monto presupuestado inicial de `0`.

---

### User Story 2 - Formulario de Presupuesto Mensual Granular y Tabular (Pantalla 1) (Priority: P1)

Como administrador financiero o usuario hogareño, quiero presupuestar mensualmente agregando partidas (rubros/cuentas) bajo demanda sobre una interfaz de tabla limpia (similar al diseño de Ejecución Presupuestaria) agrupando ingresos, egresos y movimientos de caja, evitando ver un listado interminable de cuentas vacías predefinidas para agilizar y simplificar la carga.

**Why this priority**: Es la pantalla central para la carga de datos del presupuesto, permitiendo el ingreso detallado de estimaciones de ingresos, egresos y variaciones patrimoniales.

**Independent Test**: Ir a la edición de un presupuesto mensual, verificar que la tabla se inicie limpia (mostrando únicamente las partidas presupuestadas existentes) y permita agregar un nuevo rubro (cuenta contable) de forma dinámica, asignarle un monto y guardarlo correctamente.

**Acceptance Scenarios**:

1. **Given** la pantalla de edición de presupuesto, **When** se visualiza el control maestro, **Then** se disponen selectores de Año Fiscal, Mes/Periodo, un botón "Copiar del mes anterior" (para duplicar de forma masiva los montos planificados del periodo N-1 al periodo actual) y un resumen de KPIs.
2. **Given** el presupuesto mensual, **When** se visualiza su contenido, **Then** se presenta en una estructura tabular limpia de tres secciones/pestañas:
   - **Ingresos**: Cuentas de tipo `INCOME` presupuestadas.
   - **Egresos**: Cuentas de tipo `EXPENSE` presupuestadas.
   - **Balance y Estructura (Act/Pas)**: Cuentas patrimoniales (`ASSET` excluyendo efectivo/bancos, y `LIABILITY`) presupuestadas.
3. **Given** cualquier sección del formulario, **When** se desea presupuestar una nueva partida, **Then** el usuario dispone de un botón "+ Agregar Partida" que añade una fila a la tabla con un selector de cuentas contables filtrado por la naturaleza de la pestaña.
4. **Given** la pestaña de Balance y Estructura, **When** se agrega una partida patrimonial, **Then** la fila provee un selector de "Tipo de Movimiento" (Débito/Crédito) e inputs en línea para el monto e impacto de caja, calculando el "TOTAL IMPACTO EN CAJA/BANCO" en el pie.
5. **Given** una fila añadida en cualquiera de las tablas, **When** el usuario requiere eliminarla o replicarla, **Then** se dispone de un botón para eliminar la partida de forma instantánea y una opción de "Replicar a todo el Ejercicio".

---

### User Story 3 - Matriz Anual de Presupuestos (Pantalla 2) (Priority: P2)

Como planificador, quiero ver el presupuesto consolidado de todas las cuentas del plan de cuentas a lo largo de los 12 meses en una única vista matricial para analizar la estacionalidad y poder navegar directamente a ajustar cualquier mes.

**Why this priority**: Optimiza el análisis del plan anual al consolidar las estimaciones mensuales en una única tabla de lectura masiva.

**Independent Test**: Acceder a la matriz anual de presupuestos para el año "2026". Confirmar que la tabla tiene 12 columnas correspondientes a los meses y que al hacer clic sobre el nombre del mes "Marzo" se navega al formulario de edición de presupuesto de Marzo 2026.

**Acceptance Scenarios**:

1. **Given** la vista matricial anual, **When** se selecciona un Ejercicio Fiscal, **Then** se renderiza una tabla donde las filas corresponden al árbol de cuentas contables (Ingresos y Gastos) y las columnas corresponden a los 12 meses.
2. **Given** las cabeceras de columna de la matriz mensual, **When** el usuario hace clic sobre el nombre de un mes, **Then** es redirigido a la Pantalla 1 (Carga Mensual) posicionada en ese periodo.

---

### User Story 4 - Reporte de Control de Desviaciones (Real vs. Presupuesto) (Pantalla 3) (Priority: P1)

Como administrador financiero, quiero contrastar en tiempo real las cuentas planificadas con las transacciones reales ocurridas en periodos abiertos o cerrados, visualizando desvíos absolutos e índices de alerta para tomar medidas correctoras.

**Why this priority**: Permite la auditoría en tiempo real y el control de la salud financiera del periodo.

**Independent Test**: Registrar una transacción real en una cuenta contable en el mes actual. Consultar el Reporte de Control del mes actual y verificar que la columna "Ejecutado Real" incrementa por el monto respectivo y la columna "Variación" se recalcula correctamente.

**Acceptance Scenarios**:

1. **Given** el reporte de control de un periodo mensual `ABIERTO` o `CERRADO`, **When** se consulta la tabla, **Then** se listan las columnas: Cuenta | Presupuestado | Ejecutado Real (acumulado del libro diario) | Variación Absoluta ($) | Variación Porcentual (%) | Alertas visuales.
2. **Given** el reporte de control, **When** se evalúa la desviación, **Then**:
   - Para gastos/consumos, se destaca en rojo (alerta de desvío crítico) si el Ejecutado Real es mayor al Presupuestado (sobregasto).
   - Para movimientos financieros (Activos/Pasivos), se calcula una "Desviación de Caja" basada en el impacto de liquidez; cobros reales inferiores o salidas reales superiores a lo planificado se alertan en rojo.

---

### User Story 5 - Reportes de Proyecciones Financieras (Caja y Estado de Resultados) (Pantallas 4 y 5) (Priority: P1)

Como tomador de decisiones, quiero ver un reporte consolidado plurimensual con una ventana móvil (Rolling Forecast) que combine datos reales pasados y proyecciones futuras, permitiendo alternar entre el Flujo de Caja (efecto líquido) y el Estado de Resultados (rentabilidad/devengado), para asegurar la solvencia futura del negocio.

**Why this priority**: Es el entregable estratégico de mayor valor del módulo de presupuestos contables. Evita la falta de liquidez imprevista.

**Independent Test**: Seleccionar la vista de reporte proyectado, validar la ventana móvil por defecto (último mes real + actual + 10 meses proyectados). Alternar entre Flujo de Caja y Estado de Resultados, y verificar que el arrastre del saldo de caja inicial coincide exactamente con el saldo final del último mes real.

**Acceptance Scenarios**:

1. **Given** el reporte de proyecciones, **When** se despliega la pantalla, **Then** se muestran dos controles clave:
   - Selector de Vista: [Flujo de Caja] / [Estado de Resultados].
   - Selector de Rango: [Año Calendario Completo] o [Ventana Móvil de 12 Meses (Rolling Forecast)].
2. **Given** la Ventana Móvil de 12 meses en Noviembre de 2026, **When** se renderizan las columnas de tiempo, **Then** el sistema muestra: Octubre 2026 (REAL) | Noviembre 2026 (PROYECTADO) | ... | Septiembre 2027 (PROYECTADO), cruzando límites de ejercicios fiscales.
3. **Given** las columnas de meses en proyecciones, **When** se visualizan, **Then** las columnas con datos reales e históricos tienen un fondo sutilmente diferente al de los meses proyectados, y muestran en sus cabeceras botones de acción contextuales:
   - Para mes REAL: Botón "Ver Asientos" (abre desglose de transacciones reales).
   - Para mes PROYECTADO: Botón "Ajustar Proyección" (redirige a la edición del presupuesto de ese mes).
4. **Given** la vista de **Flujo de Caja Proyectado**, **When** se calculan las filas, **Then** la tabla se desglosa estrictamente en:
   - **(+) Saldo Inicial de Caja**: (Saldo real conciliado para el primer mes; saldo final del mes anterior para los siguientes).
   - **(+) Ingresos Operativos**: (Cuentas de tipo `INCOME` cobradas / proyectadas).
   - **(+) Entradas de Activo/Pasivo**: (Amortizaciones cobradas, préstamos recibidos).
   - **(=) Total Entradas de Caja**
   - **(-) Egresos Operativos**: (Cuentas de tipo `EXPENSE` pagadas / proyectadas).
   - **(-) Salidas de Activo/Pasivo**: (Ahorro/inversión realizados, cuotas de amortización pagadas).
   - **(=) Total Salidas de Caja**
   - **(=) Flujo Neto del Periodo**: (Total Entradas - Total Salidas).
   - **(=) SALDO FINAL DE CAJA**: (Saldo Inicial + Flujo Neto).
5. **Given** la vista de **Estado de Resultados Proyectado**, **When** se calculan las filas, **Then** la tabla aplica estrictamente el principio de devengado (P&L):
   - Muestra Ingresos y Gastos devengados reales (meses pasados) y presupuestados (meses futuros).
   - Excluye amortizaciones de capital de pasivos (solo incluye los intereses devengados).
   - Excluye compras de bienes de uso / maquinaria (incluye las cuotas de depreciación proyectadas para el mes).

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST generar de forma automática un registro de Presupuesto (Budget) en relación 1-a-1 por cada Periodo (Period) que se cree al inicializar un Ejercicio Fiscal (Fiscal Year).
- **FR-002**: El presupuesto generado automáticamente MUST tomar el nombre de su Periodo correspondiente (por ejemplo: "Enero 2026") como nombre identificador.
- **FR-003**: El formulario de edición de presupuesto MUST mostrar el Nombre (Periodo) y las fechas del período como campos no editables (sólo lectura).
- **FR-004**: El formulario de edición de presupuesto MUST estructurar las partidas en una interfaz tabular limpia dividida en tres pestañas/agrupaciones principales: Ingresos (cuentas `INCOME`), Egresos (cuentas `EXPENSE`), y Balance y Estructura (cuentas patrimoniales `ASSET` y `LIABILITY` excluyendo disponibilidad).
- **FR-005**: El sistema MUST permitir presupuestar montos tanto positivos como negativos en las cuentas patrimoniales del presupuesto (`ASSET` y `LIABILITY`) para representar de forma directa entradas o salidas de dinero en caja.
- **FR-006**: El sistema MUST cargar y mostrar en la tabla de presupuesto únicamente aquellas cuentas que posean montos presupuestados previamente guardados, evitando pre-poblar celdas en cero innecesarias.
- **FR-007**: El sistema MUST proveer una opción de "Replicar a todo el Ejercicio" junto a cada cuenta en la tabla del presupuesto mensual, propagando el valor y la cuenta ingresada a los otros 11 meses del Ejercicio Fiscal.
- **FR-008**: El sistema MUST admitir un atributo `isCashOrBank` (boolean) en la entidad de cuentas contables (`Account`) para identificar cuáles cuentas del activo representan disponibilidad de efectivo/banco líquido.
- **FR-009**: El informe de ejecución presupuestaria MUST calcular en tiempo real las transacciones reales ocurridas en las fechas del Periodo.
- **FR-010**: El informe de ejecución presupuestaria MUST estructurar la información en tres bloques equivalentes a la pantalla de edición, resaltando en rojo cualquier desvío de caja negativo.
- **FR-011**: El informe de ejecución presupuestaria MUST incluir un cuadro de consolidación de liquidez al final del reporte para contrastar la caja neta real con la proyectada.
- **FR-012**: El sistema MUST proveer un reporte de **Estado de Resultados (Real vs. Proyectado)** mensualizado.
- **FR-013**: El sistema MUST proveer un reporte de **Flujo de Caja (Real vs. Proyectado)** mensualizado, calculando la proyección financiera a partir del presupuesto unificado y las políticas de afectación de caja asociadas a las cuentas patrimoniales.
- **FR-014**: El sistema MUST bloquear cualquier cambio al flag `isCashOrBank` de una cuenta si ésta ya posee transacciones (`JournalEntry`) asociadas en el libro diario.
- **FR-015**: El sistema MUST excluir las cuentas de tipo `EQUITY` del formulario de edición del presupuesto y de la lógica de proyecciones financieras.
- **FR-016**: La "Desviación de Caja" para cuentas de activos y pasivos en el informe de ejecución MUST calcularse basándose en el impacto de liquidez del mes corriente (salidas mayores o cobros menores a lo planificado son desvíos negativos).
- **FR-017**: El sistema MUST admitir tres estados en los periodos / ejercicios fiscales: `CERRADO`, `ABIERTO` y `PLANIFICACION`.
- **FR-018**: El estado `PLANIFICACION` de un Ejercicio Fiscal MUST deshabilitar el registro de transacciones contables reales (`JournalEntry`) pero MUST permitir la carga y persistencia de presupuestos.
- **FR-019**: El formulario de edición de presupuesto MUST incluir un botón maestro "Copiar del mes anterior" en la cabecera para duplicar de forma masiva los rubros y montos planificados del periodo N-1 al periodo actual.
- **FR-020**: El sistema MUST proveer una funcionalidad dinámica de "+ Agregar Partida" en cada pestaña/tabla que añade una nueva fila con un selector interactivo de cuentas contables que permite al usuario escoger rubros del catálogo.
- **FR-021**: La visualización de proyecciones de caja y estados de resultados MUST soportar scroll horizontal para los periodos temporales y colapso/expansión vertical (drill-down) en las filas del árbol de cuentas.
- **FR-022**: El reporte de Flujo de Caja Proyectado MUST arrastrar de forma continua los saldos: el Saldo Final de Caja del último mes `REAL` o `CERRADO` es automáticamente el Saldo Inicial del primer mes proyectado, y los saldos subsiguientes se arrastran en efecto dominó usando valores presupuestados.
- **FR-023**: El sistema MUST permitir alternar en la UI de reportes proyectados entre la visualización de "Año Calendario Completo" y "Ventana Móvil de 12 Meses" (Rolling 12 Months) cruzando ejercicios contables.
- **FR-024**: Las cabeceras de los meses en la matriz proyectada MUST incluir botones dinámicos interactivos: `Ver Asientos` para periodos cerrados/reales, y `Ajustar Proyección` para periodos futuros de planificación.
- **FR-025**: El sistema MUST pintar de colores visualmente diferenciados las columnas y/o indicadores de cabecera de los meses Reales históricos respecto a los meses Proyectados.
- **FR-026**: Las tablas de edición mensual MUST presentar una interfaz de fila compacta, limpia y tabular (estilo Ejecución Presupuestaria), donde cada fila cuente con una acción rápida de "Eliminar Partida".

---

### Edge Cases

- **Intento de modificación de `isCashOrBank`**: Si el usuario intenta cambiar el flag `isCashOrBank` de una cuenta que ya tiene movimientos, la API retornará un código HTTP 400 Bad Request y la UI deshabilitará esta opción.
- **Exclusión de EQUITY**: Las cuentas patrimoniales de tipo `EQUITY` no aparecerán en el planificador ni afectarán las proyecciones; cualquier movimiento patrimonial extraordinario (ej. aporte de capital) se presupuestará en cuentas de ingresos o pasivos autorizadas.
- **Ahorro de más (Impacto de caja)**: Si el usuario presupuesta ahorrar `-200` y transfiere `-250` reales, el Dashboard de Ejecución alertará un desvío negativo en la caja de `$50`, ya que se retiró más efectivo de la cuenta operativa del que estaba planificado.
- **Fin de Año Fiscal Rígido**: Cuando se consulta una ventana móvil en Noviembre 2026, si el Ejercicio Fiscal 2027 aún no se ha creado o pre-abierto en estado `PLANIFICACION`, el sistema generará automáticamente por debajo el Ejercicio 2027 con sus 12 periodos en estado `PLANIFICACION` para evitar cortes bruscos de visualización en el Rolling Forecast.

---

### Key Entities _(include if feature involves data)_

- **FiscalYear (Ejercicio Fiscal)**: Entidad contable extendida.
  - Atributos: ID, Año (ej: 2026), Estado (Enum: `CERRADO`, `ABIERTO`, `PLANIFICACION`).
- **Period (Periodo)**: Entidad contable extendida. Relación única con `FiscalYear`.
  - Atributos: ID, ID Ejercicio, Nombre, Fecha Inicio, Fecha Fin, Estado (heredado del Ejercicio o propio).
- **Budget (Presupuesto)**: Relación 1-a-1 con `Period`.
  - Atributos: ID, ID Periodo (Relación única/Foreign Key), Fecha de Creación, Fecha de Actualización.
- **BudgetItem (Línea de Presupuesto)**: Detalle del monto presupuestado por cuenta.
  - Atributos: ID, ID Presupuesto (Relación), ID Cuenta Contable (Relación), Monto Presupuestado (número positivo o negativo), Notas (texto).
- **Account (Cuenta Contable)**: Entidad contable existente.
  - Atributos extendidos: `isCashOrBank: boolean` (para marcar cuentas de disponibilidad líquida).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Al crear un Ejercicio Fiscal (ya sea `ABIERTO` o `PLANIFICACION`), el sistema genera el 100% de los presupuestos correspondientes (12 registros en total) de forma síncrona.
- **SC-002**: La pantalla de edición del presupuesto clasifica correctamente el 100% de las cuentas del plan de cuentas en las tres secciones de la UI en menos de 1 segundo.
- **SC-003**: La replicación de un monto a los 12 meses de un Ejercicio Fiscal o la duplicación del mes anterior (`Copiar del mes anterior`) se procesan con una sola interacción de usuario y se guardan correctamente en la base de datos.
- **SC-004**: Los reportes consolidados de Estado de Resultados y Flujo de Caja (Histórico y Proyectado) responden en menos de 1.5 segundos calculando dinámicamente los movimientos y arrastre de saldos.
- **SC-005**: La interfaz resalta en color rojo al 100% de las cuentas que superen el límite de gasto o que presenten un desvío de caja negativo en el flujo de caja del mes.

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
