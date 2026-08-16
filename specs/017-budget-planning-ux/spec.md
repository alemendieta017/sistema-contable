# Feature Specification: Budget Planning Matrix & Execution Control UX (Desktop & Mobile)

**Feature Branch**: `017-budget-planning-ux`

**Created**: 2026-08-12

**Updated**: 2026-08-15

**Status**: Ready for Planning

**Input**: User description: "Rediseño integral de Módulo de Presupuestos para Desktop y Mobile: Paradigma de Doble Eje (Matriz Anual 12 Meses en Desktop vs. Vista 'Mes Activo' con Strip deslizable y Deep-Dive por Rubro en Mobile), 4 bloques financieros ejecutivos (Ingresos, Gastos de Vida, Ahorro e Inversiones, Deudas y Financiación), carga inteligente con autorelleno simplificado, modal unificado de activo/pasivo sin verbosidad, menú contextual de 3 puntitos (Bottom Sheet en mobile), aprovechamiento al 100% del ancho de pantalla sin barra sticky de caja, separación de pantallas de Planificación y Control de Ejecución, tablero de Control de Ejecución y Disponible Residual mensual con semáforos visuales, y principios de ergonomía móvil (teclado decimal nativo, máscara monetaria fluida, Sticky Bottom Action Bar con Dirty State y optimización en Zona del Pulgar)."

## Clarifications

### Session 2026-08-12

- Q: ¿Cómo se deben gestionar los colores de dark/light theme, los labels del selector de año y el idioma de las leyendas en la UI? → A: Se debe respetar estrictamente el contraste en ambos temas (oscuro y claro), asegurando visibilidad en selects y leyendas. El selector de año debe llamarse simplemente "Año". Toda la UI debe estar 100% en español ("Ingresos", "Gastos de Vida", "Ahorro e Inversiones", "Deudas y Financiación", "Salida de efectivo", "Entrada de efectivo", etc.), eliminando cualquier término en inglés.
- Q: ¿Qué ajustes visuales y de interacción se requieren para mobile y la vista del grid? → A: La app debe ser Mobile First Responsive, garantizando visibilidad e interacción óptima en pantallas móviles sin forzar matrices inmanejables. Se elimina la leyenda redundante "Grid interactivo 12 Meses".

### Session 2026-08-13

- Q: ¿Cómo estructurar las secciones de la matriz presupuestaria y la carga de cuentas de Balance (Activos y Pasivos)? → A: La matriz y vista de control se dividen en 4 bloques financieros ejecutivos: 1. 🟢 INGRESOS (P&L, carga automática de cuentas de ingreso, flujo +), 2. 🔴 GASTOS DE VIDA (P&L, carga automática de cuentas de gasto, flujo -), 3. 🔵 AHORRO E INVERSIONES (Movimientos de Activo a demanda con botón [+ Presupuestar Activo]: Aporte/Inversión [-] o Rescate/Desinversión [+]), y 4. 🟣 DEUDAS Y FINANCIACIÓN (Movimientos de Pasivo a demanda con botón [+ Presupuestar Deuda]: Pago/Amortización [-] o Nuevo Préstamo/Financiación [+]). Una misma cuenta de balance puede tener ambas filas independientes si aplica.
- Q: ¿Cómo debe calcular el motor de ejecución (/budgets/control) el importe real ejecutado (Executed) para las cuentas de Balance (Activos y Pasivos) a partir de los asientos contables? → A: Mapear por partida doble de forma independiente: Para Salidas ([-] Aporte/Inversión y [-] Pago de Deuda) computar la suma de Débitos del mes; para Entradas ([+] Rescate/Desinversión y [+] Nuevo Préstamo) computar la suma de Créditos del mes.
- Q: ¿Cómo debe gestionarse el guardado de los datos ingresados en la matriz anual de 12 meses? → A: Guardado atómico explícito mediante botón [ 💾 Guardar Todo ] (en desktop) y Sticky Bottom Action Bar (en mobile) con estado de cambios pendientes (dirty state) y confirmación/advertencia al intentar abandonar la página con cambios sin guardar.
- Q: ¿Cómo deben agruparse y visualizarse las cuentas de P&L (Ingresos y Gastos) en la matriz anual? → A: Árbol jerárquico colapsable con subtotales calculados automáticamente de sólo lectura por rubro/categoría padre, permitiendo expandir/colapsar ramas y editar únicamente las cuentas hijas imputables.
- Q: ¿Se debe permitir la reasignación/traspaso de presupuesto entre cuentas de distintos bloques financieros? → A: Permitir reasignaciones entre cuentas de cualquier bloque financiero siempre que compartan la misma dirección de flujo de caja (Salida ↔ Salida [ej. Gastos a Inversiones o Deuda] y Entrada ↔ Entrada [ej. Ingresos a Financiación]).
- Q: ¿Se debe unificar el modelo de datos utilizando exclusivamente CashFlowDirection (INGRESO_EFECTIVO | EGRESO_EFECTIVO)? → A: Reutilizar CashFlowDirection (INGRESO_EFECTIVO / EGRESO_EFECTIVO) y derivar la semántica contable y visual de la tupla (account.type, cashFlowDirection), eliminando la necesidad de un enum FlowIntention separado.

### Session 2026-08-14

- Q: ¿Cómo se deben simplificar y unificar los modales y controles para presupuestar cuentas de balance (Ahorro e Inversiones, Deudas y Financiación)? → A: Se unifican en un único modal directo y no verboso denominado "Presupuestar Cuenta" (o "Presupuestar Activo/Pasivo") con solo 3 campos esenciales: 1. Selector de cuenta contable ("Seleccionar cuenta"), 2. Dirección de flujo con selector directo `[Salida de efectivo]` y `[Entrada de efectivo]`, y 3. Concepto / Descripción. Se eliminan textos redundantes y explicaciones extensas. Se elimina el botón inline "+ Agregar sub-línea" dentro de las filas, centralizando la adición en los botones de sección "+ Presupuestar Activo" y "+ Presupuestar Deuda".
- Q: ¿Cómo reemplazar la columna MOTOR y el botón interactivo de dirección de flujo en la matriz? → A: Se reemplaza la columna "MOTOR" por una columna de opciones con un botón de 3 puntitos (`•••`). El menú desplegable incluye: 1. "Rellenar" (abre el modal simplificado de autorelleno), 2. "Editar" (para cuentas de balance, abre el modal unificado para modificar la dirección de flujo o concepto), y 3. "Eliminar" (para cuentas de balance agregadas a demanda, con confirmación). Se retira el botón interactivo inline "EGRESO EFECTIVO" / "INGRESO EFECTIVO" de la celda de cuenta, reemplazándolo por una etiqueta visual informativa discreta.
- Q: ¿Cómo simplificar la terminología y opciones del modal de distribución automática? → A: Se reemplaza el término "Motor de Distribución Inteligente" y su jerga compleja por un modal limpio y directo de "Autorellenar Presupuesto", con opciones claras en lenguaje natural: "Distribuir monto total parejo en los 12 meses", "Replicar valor a los meses siguientes", "Incremento porcentual mensual (%)", "Ponderación histórica" y "Traer valores reales del año anterior".
- Q: ¿Cómo optimizar el aprovechamiento de pantalla (UI) y qué hacer con la barra sticky inferior de totales de caja? → A: La tabla y la pantalla deben ocupar el 100% del ancho disponible (`w-full`) sin contenedores que limiten el espacio horizontal. Se elimina la barra sticky inferior de totales de flujo de caja (Total Entradas, Total Salidas, Flujo Neto del Mes, Flujo Neto Acumulado), ya que esos análisis corresponden de manera exclusiva a la pantalla dedicada de Flujo de Caja.
- Q: ¿Cómo estructurar la navegación entre la Matriz Anual y el Control de Ejecución Mensual? → A: Deben ser dos pantallas independientes en el sistema y en el menú de navegación principal (Sidebar): 1. "Planificación Presupuestaria" / "Matriz Anual" (`/budgets/matrix`), y 2. "Control de Ejecución" (`/budgets/control`), en lugar de una vista única compartida con un toggle de cabecera.
- Q: ¿Cuál es el requerimiento de corrección para el selector de Año Fiscal? → A: El selector de año debe desplegar correctamente el nombre del año fiscal (`name`, ej. "2025", "2026") y el estado de cierre (`(Cerrado)` si `status === 'CLOSED'`), corrigiendo la visualización en blanco producida por referencias a propiedades inexistentes.

### Session 2026-08-15 (Mobile UX/UI & Ergonomics Deep-Dive)

- Q: ¿Cómo resolver la tensión entre la densidad analítica de escritorio (12 meses en pantalla) y la agilidad de consumo/edición en dispositivos móviles (viewport estrecho de ~390px)? → A: Implementar el **Paradigma de Doble Eje (Dual-Axis Paradigm)**:
  - **🖥️ Modo Desktop**: Matriz Anual completa de 12 columnas con edición inline, navegación por teclado (`Tab`, `Enter`, `Esc`), atajos (`Ctrl+D`), pegado desde portapapeles y visualización macro de estacionalidad.
  - **📱 Modo Mobile**: Vista enfocada "Mes Activo" con selector horizontal de meses (Pill Strip o Segmented Control deslizable con swipe), cards táctiles amplias agrupadas en acordeones colapsables por bloque financiero, y un modo **"Deep-Dive por Rubro"** en Bottom Sheet para planificar los 12 meses de una cuenta individual de forma vertical y ergonómica.
- Q: ¿Cómo debe funcionar el modo "Deep-Dive por Rubro" en dispositivos móviles? → A: Al tocar una cuenta o seleccionar "Ver desglose 12 meses" en el menú contextual (`•••`), se despliega un panel inferior (Bottom Sheet) con los 12 meses listados verticalmente. En la cabecera del sheet se integran accesos rápidos a las herramientas de distribución masiva existentes: `[ Distribuir parejo ]`, `[ Copiar de Ene a Dic ]` (replicar), y `[ Traer Real del Año Anterior + % ]`, permitiendo armar presupuestos anuales completos desde el móvil sin lidiar con una matriz inmanejable.
- Q: ¿Qué patrones ergonómicos y micro-interacciones deben aplicarse en mobile? → A:
  1. **Teclado Numérico Nativo**: Utilizar `inputmode="numeric"` para monedas enteras sin decimales como el Guaraní (PYG / ₲) para abrir de inmediato el teclado numérico limpio (0-9) sin punto/coma decimal innecesario (o `inputmode="decimal"` condicional si la moneda maneja decimales como USD).
  2. **Formateo Monetario Fluido en Guaraníes**: Máscara de miles con punto (ej. `₲ 150.000`) en tiempo real que permita tipear cifras sin pérdida de foco ni saltos de cursor.
  3. **Zona del Pulgar (Thumb Zone)**: Todos los controles críticos (Guardar cambios, Selector de mes, Reasignar presupuesto, Menús de acción) deben ubicarse en la mitad inferior de la pantalla o en una barra fija inferior.
  4. **Bottom Sheets (Drawers) en reemplazo de Modales Centrados**: Todos los diálogos (Autorellenar, Presupuestar Cuenta, Reasignar Fondos, Menú 3 puntos, Deep-Dive) deben abrirse como hojas deslizables inferiores (`Drawer` / `Bottom Sheet`), evitando que el teclado virtual tape los controles o genere desbordamientos.
  5. **Sticky Bottom Action Bar para Dirty State**: Una barra flotante anclada al fondo de la pantalla que se activa de inmediato cuando hay cambios pendientes de guardar (`[ 💾 Guardar Cambios (X pendientes) ]` y `[ Descartar ]`).

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Desktop 12-Month Matrix Inline Planning & Direct Cell Editing (Priority: P1)

As a financial planner or manager on a desktop device, I want an interactive 12-month matrix view (`/budgets/matrix`) utilizing 100% of the screen width with inline grid editing, hierarchical category tree with collapsible branches and auto-calculated subtotals, a 3-dots options menu per row (`•••`), and full keyboard navigation (Tab, Enter, Escape, Copy-Paste), so that I can rapidly view, enter, and adjust annual budget allocations across all accounts without navigating single-month forms.

**Why this priority**: Delivers the core high-density spreadsheet experience essential for comprehensive annual financial planning sessions on desktop workstations.

**Independent Test**: A user can open `/budgets/matrix` on desktop, see the grid occupying 100% screen width, expand/collapse parent groups, navigate through cells with `Tab`/`Enter`, update values inline, verify parent subtotals recalculate in real time, trigger forward-fill via `Ctrl+D`, access row actions via `•••`, and save all changes atomically via `[ 💾 Guardar Todo ]`.

**Acceptance Scenarios**:

1. **Given** a user viewing `/budgets/matrix` on a desktop viewport, **When** the page renders, **Then** the grid expands to 100% viewport width without max-width constraints, displaying all 12 month columns, row options column (`•••`), and fiscal year dropdown showing name (`name`) and status (`(Cerrado)` if applicable).
2. **Given** P&L sections (Ingresos / Gastos de Vida), **When** reviewing categories, **Then** accounts are organized in a collapsible hierarchical tree with read-only parent subtotal rows updating dynamically when child accounts change.
3. **Given** an active cell in the matrix on desktop, **When** the user presses `Tab` (next month right), `Shift+Tab` (previous month left), `Enter` (same month next row down), or `Esc` (cancel edit), **Then** focus and editing transition seamlessly with zero latency.
4. **Given** unsaved edits in the matrix, **When** the user attempts to navigate away before clicking `[ 💾 Guardar Todo ]`, **Then** the system triggers a dirty state confirmation dialog warning of unsaved changes.
5. **Given** a user clicking `[ 💾 Guardar Todo ]`, **When** the request succeeds, **Then** all 12-month allocations across all sections are persisted atomically in a single backend transaction.

---

### User Story 2 - Mobile Adaptive Planning: Active Month View & 12-Month Deep-Dive Sheet (Priority: P1)

As a budget owner or financial planner on a mobile device (viewport $\le 768\text{px}$), I want an adaptive planning interface featuring an active month view with a swipeable horizontal month selector strip, collapsible financial block accordions, touch-friendly account cards with decimal inputs, and a dedicated 12-month "Deep-Dive por Rubro" Bottom Sheet, so that I can comfortably inspect, adjust, or plan complete annual lines on my phone without fighting a 12-column tabular grid.

**Why this priority**: Eliminates horizontal scroll fatigue and cramped touch targets on mobile devices, providing a fluid, ergonomic experience tailored to thumb-based micro-sessions and focused row adjustments.

**Independent Test**: A user opens `/budgets/matrix` on a mobile device, swipes the month selector strip from January to March, taps the "Supermercado" card, edits the monthly value using the native decimal keyboard, opens the 3-dots menu to view "Ver desglose 12 meses", applies "Distribuir parejo" in the bottom sheet, and saves changes via the Sticky Bottom Action Bar.

**Acceptance Scenarios**:

1. **Given** a user viewing `/budgets/matrix` on a mobile device, **When** the screen renders, **Then** the layout switches to the Mobile Adaptive view featuring:
   - Sticky top Fiscal Year selector and Swipeable Month Selector Strip (`[Ene] [Feb] [Mar] [Abr*] [May] ...`).
   - 4 Financial Block Accordions (🟢 Ingresos, 🔴 Gastos de Vida, 🔵 Ahorro e Inversiones, 🟣 Deudas y Financiación) displaying monthly subtotal sums in each accordion header.
2. **Given** an account card inside a mobile block, **When** viewed, **Then** it presents the account name, an accessible touch input with `inputmode="numeric"` (for integer currencies like Guaraníes ₲), a context label (_"Promedio anual: ₲ 120.000"_ or _"Mes anterior: ₲ 115.000"_), and a 3-dots menu button (`•••`).
3. **Given** a user tapping the 3-dots menu (`•••`) on an account card, **When** opened, **Then** an ergonomic Bottom Sheet slides up from the bottom containing:
   - ⚡ _Replicar este monto a los meses restantes_ (Forward fill).
   - 📈 _Ajustar con % de incremento_ (MoM %).
   - 🔍 _Ver desglose de los 12 meses de esta cuenta (Deep-Dive)_.
   - ✏️ _Editar cuenta / dirección de flujo_ (for balance rows).
   - 🗑️ _Eliminar fila_ (for on-demand balance rows).
4. **Given** a user tapping "Ver desglose de los 12 meses (Deep-Dive)", **When** the Deep-Dive Bottom Sheet opens, **Then** it renders a vertical list of all 12 months (Ene to Dic) with accessible inputs and top mass-distribution action buttons:
   - `[ Distribuir parejo ]`: Prorates a total annual amount equally across 12 months.
   - `[ Copiar de Ene a Dic ]`: Replicates January's value to all remaining months.
   - `[ Traer Real del Año Anterior + % ]`: Pre-populates historical ledger actuals with percentage adjustment.
5. **Given** pending unsaved changes in mobile view, **When** any input or auto-fill is modified, **Then** a Sticky Bottom Action Bar slides into the thumb zone showing `[ 💾 Guardar Cambios (N pendientes) ]` and `[ Descartar ]`.

---

### User Story 3 - Simplified Budget Auto-Fill & Baseline Loading (Priority: P2)

As a financial planner on desktop or mobile, I want a simplified, user-friendly Auto-fill tool ("Autorellenar Presupuesto") with clear options (distribuir monto parejo en 12 meses, replicar a los siguientes meses, incremento porcentual mensual, ponderación histórica, y traer real del año anterior), accessible from row menus and deep-dive sheets, so that I can rapidly generate realistic multi-month budgets without manual calculations.

**Why this priority**: Drastically cuts repetitive calculations through clear natural language options accessible seamlessly on desktop and mobile.

**Independent Test**: A user opens the auto-fill tool on an account row, selects "Distribuir monto total parejo en los 12 meses" with an annual amount of ₲ 1.200.000, and verifies that every month is set to ₲ 100.000.

**Acceptance Scenarios**:

1. **Given** an account row in desktop matrix or mobile view, **When** selecting "Rellenar", **Then** the simplified dialog opens (as a centered modal on desktop or a Bottom Sheet on mobile) with natural language options:
   - Distribuir monto total parejo en los 12 meses (flat prorate).
   - Replicar valor a los meses siguientes (forward fill).
   - Incremento porcentual mensual (MoM %).
   - Ponderación histórica (según estacionalidad del año anterior).
   - Traer valores reales del año anterior (+ Ajuste %).
2. **Given** a user editing March in the mobile deep-dive sheet or desktop grid, **When** triggering forward-fill, **Then** months April through December update immediately to match March's value.
3. **Given** a user initiating a budget for a new fiscal year, **When** they select "Traer Real del Año Anterior", **Then** historical accounting transactions from the preceding 12 months are aggregated using strict ISO date range shifting and loaded into the budget allocations.

---

### User Story 4 - Executive Monthly Budget Execution & Availability Dashboard (Priority: P2)

As a budget owner or financial manager on desktop or mobile, I want a dedicated Monthly Execution Control page (`/budgets/control`) in the navigation sidebar, displaying real-time available residual budget ($\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$) with color-coded gauge bars and directional budget reallocations in the thumb zone, so that I can monitor monthly spending health and make operational decisions independently from annual planning.

**Why this priority**: Separates macro annual planning from micro operational control into dedicated, highly responsive screens.

**Independent Test**: A user navigates to `/budgets/control` on mobile or desktop, views August 2026, checks progress gauge bars (Green <75%, Yellow 75-99%, Red >=100%), and taps "Reasignar Presupuesto" in the bottom action area to transfer surplus budget from an Expense account to an Investment allocation.

**Acceptance Scenarios**:

1. **Given** the system navigation sidebar, **When** viewed, **Then** "Planificación Presupuestaria" (`/budgets/matrix`) and "Control de Ejecución" (`/budgets/control`) appear as distinct, dedicated menu items leading to their respective full-screen pages.
2. **Given** the active period dashboard for August 2026, **When** new ledger transactions or committed orders are recorded, **Then** the dashboard displays $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$ in real time for each category, using Debits for Outflows and Credits for Inflows.
3. **Given** an account category reaching 85% consumption, **When** viewed, **Then** its progress bar turns yellow (warning); at 100% or higher, it turns red (overbudget alert).
4. **Given** an account running low on available funds, **When** the user clicks/taps "Reasignar Presupuesto", **Then** a modal (desktop) or Bottom Sheet (mobile) opens allowing transfers between any accounts sharing the same flow direction (Salida ↔ Salida [ej. Gastos a Inversiones o Deuda] y Entrada ↔ Entrada [ej. Ingresos a Financiación]).

---

### User Story 5 - 4 Executive Financial Blocks & Streamlined Unified Balance Budgeting (Priority: P1)

As an advanced personal finance manager, I want the budget organized into 4 distinct financial blocks (1. Ingresos, 2. Gastos de Vida, 3. Ahorro e Inversiones, 4. Deudas y Financiación), with automatic pre-population of P&L accounts, a single unified and non-verbose modal/bottom-sheet ("Presupuestar Cuenta") for on-demand Balance Sheet accounts with simple flow direction buttons (`[Salida de efectivo]` / `[Entrada de efectivo]`), and editing/deletion of balance rows directly via the 3-dots row menu (`•••`), so that my budget remains clean, uncluttered, and easy to maintain.

**Why this priority**: Eliminates confusing redundant options, removes nested "+ Agregar sub-línea" buttons inside rows, and provides a direct, minimal-friction budgeting flow for investment and debt accounts across all screen sizes.

**Independent Test**: A user clicks/taps `+ Presupuestar Activo` or `+ Presupuestar Deuda`, selects a balance account, chooses `[Salida de efectivo]`, enters a concept, and sees the clean row added to the active budget with editing and deletion options accessible via the 3-dots menu (`•••`).

**Acceptance Scenarios**:

1. **Given** the Budget Planning view (`/budgets/matrix`), **When** opened for a fiscal year, **Then** the view displays 4 separate executive sections: 🟢 Ingresos (P&L), 🔴 Gastos de Vida (P&L), 🔵 Ahorro e Inversiones (Activos), and 🟣 Deudas y Financiación (Pasivos).
2. **Given** the Balance sections, **When** the user clicks `+ Presupuestar Activo` or `+ Presupuestar Deuda`, **Then** a unified, non-verbose dialog (modal on desktop, Bottom Sheet on mobile) opens with only 3 core fields:
   - Selector de cuenta ("Seleccionar cuenta").
   - Dirección de Flujo: direct buttons `[Salida de efectivo]` and `[Entrada de efectivo]`.
   - Concepto: text description for the budget row.
3. **Given** an existing Balance account row, **When** reviewing the row, **Then** no inline "+ Agregar sub-línea" or toggle button is displayed; instead, a discreet non-interactive flow badge is rendered, and "Editar" inside `•••` reopens the unified dialog.
4. **Given** an on-demand balance row no longer needed, **When** the user selects "Eliminar" from `•••`, **Then** the system prompts for confirmation and removes the row and its associated records for that fiscal year.

---

### User Story 6 - Mobile Ergonomics & Micro-Interactions (Priority: P2)

As a mobile user, I want numeric fields to open the clean numeric keypad automatically (0-9 without decimal point for Guaraníes), currency values to format smoothly with thousands separators without cursor jumping, touch targets to be at least 44x44px, and dialogs to open as bottom sheets, so that data entry is frictionless and error-free on touchscreen devices.

**Why this priority**: Guarantees tactile ergonomics, prevents keyboard overlapping issues, and ensures rapid micro-sessions without input frustration.

**Independent Test**: A user taps an input field on a mobile device, verifies the system brings up the pure numeric keyboard (0-9), types "150000", verifies the value renders as "₲ 150.000" without the cursor leaping, and confirms all interactive buttons can be triggered easily with one hand in the thumb zone.

**Acceptance Scenarios**:

1. **Given** any numeric budget input field on a mobile viewport, **When** the field receives focus, **Then** it specifies `inputmode="numeric"` for integer currencies (Guaraníes ₲) displaying the native numeric keypad (0-9) without decimal point, and `inputmode="decimal"` if the active currency configures decimal places.
2. **Given** a user typing numeric amounts, **When** numbers are entered, **Then** currency formatting is applied smoothly without jumping the text insertion cursor or truncating characters.
3. **Given** any interactive element (buttons, pills, accordion headers, 3-dots triggers), **When** rendered on mobile, **Then** touch target areas maintain a minimum bounding dimension of $44 \times 44\text{px}$.
4. **Given** open sheets or dialogs on mobile, **When** the virtual keyboard opens, **Then** bottom sheets dynamically adapt with safe area insets (`env(safe-area-inset-bottom)`), preventing any buttons or input rows from becoming occluded.

---

### Edge Cases

- **Mobile Viewport Transitions & Screen Rotation**: When a user rotates their device or transitions between desktop and mobile viewport breakpoints ($768\text{px}$ boundary), the system MUST preserve all active dirty state changes and synchronize the currently active month and cell values without data loss.
- **Pasting Tabular Data into Desktop Grid**: When a user pastes spreadsheet data containing formatted currency strings, negative numbers in parentheses, or invalid text into the desktop matrix, the system MUST sanitize and parse valid numbers while flagging invalid cells without crashing.
- **First-Time Accounts with Zero Historical Ledger Records**: When triggering "Traer Real del Año Anterior", accounts created in the current year with zero prior transactions MUST default to 0 with a clear informational note.
- **Deleting Balance Rows with Existing Allocations**: When deleting an on-demand balance row with existing monthly values, the system MUST require explicit confirmation before clearing its records for that fiscal year.
- **Auditing Closed Accounting Periods**: Locked/closed fiscal months MUST render as read-only with a visual lock indicator on both desktop matrix cells and mobile cards/sheets.
- **Keyboard Overlap on Small Screens**: On small viewports ($\le 390\text{px}$), when editing the 12th month in the mobile Deep-Dive sheet with the software keyboard open, the sheet MUST auto-scroll the active field into comfortable view above the keyboard.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST organize the budget matrix (`/budgets/matrix`) and control dashboard (`/budgets/control`) into four executive financial blocks:
  1. 🟢 **INGRESOS (P&L)**: Automatic listing of all active Revenue accounts (`type === 'REVENUE'`), organized in a collapsible hierarchical tree with dynamic read-only parent subtotals and standard cash inflow direction (`cashFlowDirection = 'INGRESO_EFECTIVO'`).
  2. 🔴 **GASTOS DE VIDA (P&L)**: Automatic listing of all active Expense accounts (`type === 'EXPENSE'`), organized in a collapsible hierarchical tree with dynamic read-only parent subtotals and standard cash outflow direction (`cashFlowDirection = 'EGRESO_EFECTIVO'`).
  3. 🔵 **AHORRO E INVERSIONES (Activos)**: On-demand listing of Asset accounts (`type === 'ASSET'`) added via `+ Presupuestar Activo`.
  4. 🟣 **DEUDAS Y FINANCIACIÓN (Pasivos)**: On-demand listing of Liability accounts (`type === 'LIABILITY'`) added via `+ Presupuestar Deuda`.
- **FR-002**: System MUST implement the **Dual-Axis Paradigm (Modalidades Adaptativas de Planificación)** for `/budgets/matrix`:
  - **Desktop Viewport ($> 768\text{px}$)**: Interactive 12-month spreadsheet matrix occupying 100% available screen width (`w-full`), inline editing, full keyboard navigation (`Tab`, `Shift+Tab`, `Enter`, `Shift+Enter`, `Esc`), and multi-cell copy-paste.
  - **Mobile Viewport ($\le 768\text{px}$)**: Focused "Mes Activo" view with horizontal swipeable Month Selector Strip (`[Ene] [Feb] [Mar] ...`), 4 collapsible financial block accordions showing monthly subtotals in headers, touch-friendly account cards with decimal inputs, and contextual 3-dots action menus.
- **FR-003**: System MUST provide a mobile **"Deep-Dive por Rubro"** Bottom Sheet for any account line in `/budgets/matrix`, displaying:
  - Vertical list of all 12 months (Ene a Dic) with accessible numeric input fields.
  - Top mass-distribution action bar reusing existing auto-fill engine functionality:
    - `[ Distribuir parejo ]`: Prorates a total annual amount equally across 12 months.
    - `[ Copiar de Ene a Dic ]`: Replicates January's value to all remaining months.
    - `[ Traer Real del Año Anterior + % ]`: Loads prior-year historical ledger actuals with percentage adjustment.
- **FR-004**: System MUST provide a simplified Auto-fill tool ("Autorellenar Presupuesto") replacing complex jargon with clear, natural language options:
  - Distribuir monto total parejo en los 12 meses (flat prorate).
  - Replicar valor a los meses siguientes (forward fill / `Ctrl+D` / `Cmd+D`).
  - Incremento porcentual mensual (MoM %).
  - Ponderación histórica (según estacionalidad del año anterior).
  - Traer valores reales del año anterior (+ Ajuste %).
- **FR-005**: System MUST provide a baseline setup tool ("Traer Real del Año Anterior") to pre-populate annual budget matrices based on actual accounting ledger movements with optional percentage adjustments. The baseline historical calculation MUST deterministically shift period start/end dates back by exactly 1 year (ISO 8601) and execute PostgreSQL date range queries (`tx.accounting_date >= priorStartDate AND tx.accounting_date <= priorEndDate`) to avoid reliance on fiscal year name strings or invalid `LIKE` operations on `DATE` columns.
- **FR-006**: System MUST separate Annual Budget Planning (`/budgets/matrix`) and Monthly Execution Control (`/budgets/control`) into two independent, dedicated pages accessible directly from the main sidebar navigation.
- **FR-007**: System MUST provide a Monthly Execution Control Dashboard (`/budgets/control`) for selected active periods displaying:
  - Total Budgeted Amount, Total Executed Amount to date, and Total Available Residual Balance per section and account.
  - Calculation formula: $\text{Available} = \text{Budgeted} - \text{Executed} - \text{Committed}$.
  - Ledger mapping for `Executed`: For P&L accounts, Revenue calculates sum of Credits and Expense calculates sum of Debits. For Balance Sheet accounts, Outflows (`cashFlowDirection = 'EGRESO_EFECTIVO'`: Aportes a Inversión y Pagos de Deuda) calculate sum of Debits, while Inflows (`cashFlowDirection = 'INGRESO_EFECTIVO'`: Rescates de Inversión y Nuevos Préstamos) calculate sum of Credits.
- **FR-008**: System MUST display color-coded visual progress/gauge bars for budget consumption per category on desktop and mobile:
  - **Green**: Consumption < 75%.
  - **Yellow**: Consumption 75% - 99% (Warning threshold).
  - **Red**: Consumption $\ge$ 100% (Overbudget threshold).
- **FR-009**: System MUST provide quick budget re-allocation/transfer controls on the monthly dashboard allowing movement of available funds between accounts that share the same `cashFlowDirection` (Salida ↔ Salida [e.g. Gastos a Inversiones o Pagos de deuda] y Entrada ↔ Entrada [e.g. Ingresos a Nuevos Préstamos]) within the active period, presented as a centered modal on desktop and as a Bottom Sheet in the Thumb Zone on mobile.
- **FR-010**: System MUST provide a single unified, non-verbose workflow ("Presupuestar Cuenta" / "Presupuestar Activo/Pasivo") for Balance Sheet accounts with 3 essential fields:
  1. **Seleccionar cuenta**: Account selector of active Balance accounts.
  2. **Dirección de Flujo**: Direct toggle/buttons `[Salida de efectivo]` and `[Entrada de efectivo]`.
  3. **Concepto**: Text input for the budget row description/concept.
     Presented as a centered modal on desktop and a Bottom Sheet on mobile.
- **FR-011**: System MUST allow adding the same Balance Sheet account multiple times with distinct `cashFlowDirection` values (e.g., one row for loan disbursement inflow `INGRESO_EFECTIVO` and one row for loan repayment outflow `EGRESO_EFECTIVO`).
- **FR-012**: System MUST render discreet, non-clickable visual cash flow direction badges on balance rows (`Salida de efectivo` / `Entrada de efectivo`). Direction modification MUST be performed via the "Editar" option inside the row's 3-dots menu (`•••`), reopening the unified modal/sheet.
- **FR-013**: System MUST layout the desktop budget planning matrix to occupy 100% of the available screen width (`w-full`) without artificial max-width container constraints. The bottom sticky summary bar with cash flow aggregates is eliminated from the budget matrix, as cash flow aggregates are exclusively managed in the dedicated Cash Flow Statement screen.
- **FR-014**: System MUST adhere strictly to active Dark/Light theme color tokens across all components. The fiscal year selector label MUST read simply "Año", and the dropdown options MUST correctly render the fiscal year name string (`fy.name`, e.g. "2025", "2026") and status indicator (`(Cerrado)` when `fy.status === 'CLOSED'`).
- **FR-015**: System MUST present 100% of user interface strings, category labels, section headers, and totals in Spanish ("Ingresos", "Gastos de Vida", "Ahorro e Inversiones", "Deudas y Financiación", "Salida de efectivo", "Entrada de efectivo", "Autorellenar", "Concepto", "Distribuir parejo", "Replicar", "Guardar Cambios", "Descartar"), completely eliminating mixed English terminology.
- **FR-016**: System MUST provide a 3-dots options menu (`•••`) trigger on each row/card, replacing the "MOTOR" column, offering: "Rellenar" (opens auto-fill), "Editar" (opens unified dialog for balance accounts), "Eliminar" (for on-demand balance rows), and in mobile view "Ver desglose de los 12 meses".
- **FR-017**: System MUST implement mobile ergonomics and micro-interactions:
  - All numeric budget inputs MUST declare `inputmode="numeric"` for integer currencies (Guaraníes ₲, 0 decimals) to automatically invoke native 10-digit clean keypads (0-9) without decimal button confusion, or `inputmode="decimal"` conditionally when managing currencies with decimal precision.
  - Smooth currency mask formatting (thousands dot separator) preventing cursor jump or loss of focus.
  - Interactive elements MUST maintain touch target areas $\ge 44 \times 44\text{px}$.
  - Critical actions and navigation MUST be optimized for the ergonomic Thumb Zone (lower half of screen).
- **FR-018**: System MUST render all dialogs, row action menus, auto-fill forms, account creation flows, and transfer tools as Bottom Sheets (Drawers) on mobile viewports ($\le 768\text{px}$), with backdrop dismissal and swipe-down-to-close gestures.
- **FR-019**: System MUST persist budget modifications atomically:
  - **Desktop**: Top action bar button `[ 💾 Guardar Todo ]` with dirty state indication.
  - **Mobile**: Sticky Bottom Action Bar `[ 💾 Guardar Cambios (N pendientes) ]` and `[ Descartar ]` appearing only when dirty state is active.
  - System MUST display a confirmation dialog if the user attempts to navigate away with unsaved changes.
- **FR-020**: System MUST eliminate the "+ Agregar sub-línea" button inside balance account rows. Balance rows are added exclusively via the section header buttons `+ Presupuestar Activo` and `+ Presupuestar Deuda`, and removed via "Eliminar" in `•••` with user confirmation.

---

### Key Entities

- **Budget Matrix Allocation**: Represents a multi-period budget model containing monthly allocated numeric values mapped to specific accounting categories, fiscal years, and explicit `cashFlowDirection` (`INGRESO_EFECTIVO` | `EGRESO_EFECTIVO`). Combined with `account.type` (`REVENUE`, `EXPENSE`, `ASSET`, `LIABILITY`), it completely determines visual labeling, double-entry ledger matching, and net cash flow aggregation.
- **Budget Auto-Fill Parameter**: Parameterized auto-fill definition (flat prorate, trend %, historical weighting, forward fill) applied to compute monthly allocation distributions across desktop grid and mobile deep-dive sheets.
- **Monthly Execution Summary**: Period-specific calculated entity aggregating budgeted limits, actual ledger debits/credits, committed balances, remaining residual balance, and consumption percentage across the 4 financial blocks.
- **Budget Reassignment Record**: Audit record of funds transferred between account categories sharing the same `cashFlowDirection` within a budget period.
- **Mobile Planning State**: Client-side adaptive state tracking the currently selected active month in the month strip, dirty modifications count, and deep-dive drawer context.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Financial planners on desktop can complete full 12-month multi-account annual budget entry in under 5 minutes using inline matrix editing and simplified auto-fill tools (70% time reduction compared to single-form entry).
- **SC-002**: Mobile users can check monthly execution status or adjust an individual account's budget in under 30 seconds via the mobile active-month cards and thumb-zone actions.
- **SC-003**: 100% of cell edits and auto-fill calculations respond within 100ms with 60fps responsiveness on desktop spreadsheet grid and mobile touch cards across 100% viewport width.
- **SC-004**: 100% of mobile numeric inputs automatically invoke the native numeric keypad (`inputmode="numeric"` for Guaraníes ₲, 0 decimals), and 100% of mobile modals render as ergonomic bottom sheets without software keyboard clipping or horizontal overflow.
- **SC-005**: Budget owners can access "Control de Ejecución" directly from the sidebar navigation and identify account categories near or over budget limit within 3 seconds on both desktop and mobile viewports.
- **SC-006**: 95% of accidental overbudgeting scenarios are prevented due to real-time color-coded visual gauge indicators (Green/Yellow/Red) and residual balance calculations.
- **SC-007**: 100% of UI elements, fiscal year select options, and dropdown items maintain compliant WCAG AA color contrast in both Dark and Light themes with zero untranslated English strings.

---

## Assumptions

- The chart of accounts structure and account hierarchies are defined and active in the core ledger system.
- Historical accounting ledger transactions exist or can be queried for prior-year actual baseline calculations.
- On desktop viewports ($> 768\text{px}$), the 12-month budget matrix occupies 100% available screen width with spreadsheet keyboard navigation (`Tab`, `Enter`, `Esc`, `Ctrl+D`, Copy-Paste).
- On mobile viewports ($\le 768\text{px}$), the planning view adopts the Dual-Axis Active Month + Deep-Dive Bottom Sheet paradigm.
- Cash flow statement aggregations belong to the dedicated Cash Flow module and are omitted from the budget planning matrix.
- Period lock statuses (closed fiscal months) are enforced by the core accounting system and render read-only across desktop and mobile.
