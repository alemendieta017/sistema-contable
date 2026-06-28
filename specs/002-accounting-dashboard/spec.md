# Feature Specification: Accounting Dashboard and Core Modules

**Feature Branch**: `002-accounting-dashboard`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Necesito que la aplicación sea tipo dashboard contable, mobile first pero que en desktop tenga un sidebar. debemos tener las siguientes opciones en el menú: El menú tendrá los siguientes items: - Transacciones - Estadísticas - Cuentas -- Tipos de cuentas -- Gestor de cuentas - Configuracion ..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Responsive Layout & Global Interface Elements (Priority: P1)

Como usuario de contabilidad personal, quiero acceder a mi aplicación desde mi teléfono móvil con una navegación táctil cómoda, o desde mi computadora con una barra lateral completa, contando siempre con un buscador de transacciones rápido y un botón flotante para registrar nuevos asientos.

**Why this priority**: Define el marco visual y de navegación principal de la aplicación. Es fundamental para la experiencia de usuario y el acceso a todos los módulos.

**Independent Test**: Cargar la aplicación en resoluciones móviles (<768px) para verificar el menú móvil/drawer y el botón flotante, y en resoluciones de escritorio (>1024px) para verificar la barra lateral permanente y el buscador superior.

**Acceptance Scenarios**:

1. **Given** un dispositivo móvil con pantalla estrecha (<768px), **When** se abre la aplicación, **Then** la navegación se presenta mediante un menú inferior o drawer optimizado para pantallas táctiles, y se visualiza el botón flotante para crear asientos.
2. **Given** una pantalla de escritorio (>1024px), **When** se abre la aplicación, **Then** se muestra una barra lateral izquierda fija con las opciones: Transacciones, Estadísticas, Cuentas (con sub-menú para Tipos de Cuentas y Gestor de Cuentas), y Configuración. En la cabecera superior se muestra el buscador global de transacciones.
3. **Given** cualquier pantalla de la aplicación, **When** el usuario presiona el botón flotante de creación, **Then** se abre el formulario modal para la carga de asientos contables.

---

### User Story 2 - Historial de Transacciones Multimodal y Filtros (Priority: P1)

Como usuario financiero, quiero ver mi historial de transacciones agrupado de tres formas distintas (Diario, Calendario y Mensual) y aplicar filtros globales de cuentas y categorías para analizar mis movimientos y balances parciales.

**Why this priority**: Permite la visualización, control e inspección del libro diario bajo distintas perspectivas temporales de acuerdo a la necesidad de análisis.

**Independent Test**: Ingresar a la sección "Transacciones", cambiar entre vistas Diario, Calendario y Mensual, y validar que al seleccionar una cuenta o rubro específico, los totales y las transacciones mostradas se actualicen correctamente en tiempo real.

**Acceptance Scenarios**:

1. **Given** la vista "Diario" dentro de un mes determinado, **When** se listan las transacciones, **Then** se agrupan en secciones por día, mostrando en la cabecera de cada día el total de ingresos y egresos de esa fecha, además de tres tarjetas superiores con el resumen global de Ingresos, Egresos y Resultado del período completo.
2. **Given** la vista "Calendario", **When** se selecciona un mes calendario, **Then** se despliega una grilla mensual tipo Google Calendar donde cada día muestra sus totales de ingresos, egresos y saldo neto acumulado diario de forma macro.
3. **Given** la vista "Mensual" y un año seleccionado, **When** se despliega la información, **Then** se presenta una tabla donde cada fila corresponde a un mes del año, con columnas individuales de total ingresos, total egresos y balance resultante.
4. **Given** cualquiera de las tres vistas, **When** se selecciona un filtro de Cuenta, Rubro de Gasto o Rubro de Ingreso, **Then** las tarjetas de resumen y las transacciones reflejadas en la vista diaria, celdas de calendario, o filas mensuales se recalculan de inmediato.

---

### User Story 3 - Visualización y Administración de Cuentas (Priority: P2)

Como administrador de mis finanzas, quiero ver mis cuentas agrupadas por tipo de activo y pasivo, sus sumatorias parciales y totales, y disponer de un módulo administrativo para gestionar (ABM) las cuentas, modificar saldos iniciales y administrar los rubros (categorías) de ingresos y gastos.

**Why this priority**: Facilita el análisis patrimonial y de balance de saldos, además de la configuración de la estructura contable base del usuario.

**Independent Test**: Ir a "Cuentas", validar que los activos y pasivos estén clasificados en tablas con sus respectivos subtotales y que el balance de activos menos pasivos se muestre en los counters del encabezado.

**Acceptance Scenarios**:

1. **Given** la pantalla "Cuentas", **When** se accede a la vista principal, **Then** se muestran tres counters en la parte superior: Total Activos, Total Pasivos y Balance General. Abajo se listan las cuentas en tablas agrupadas por su tipo de cuenta contable, mostrando el saldo a la derecha de cada fila y la suma de saldos al pie de cada subgrupo.
2. **Given** el "Gestor de Cuentas", **When** el usuario realiza un ABM, **Then** puede crear, modificar o eliminar cuentas, asignar su saldo inicial/apertura, y gestionar el catálogo de rubros (categorías) asociados a Activos, Pasivos, Ingresos y Egresos.

---

### User Story 4 - Estadísticas Contables y Gráficos de Evolución (Priority: P2)

Como usuario analítico, quiero ver gráficos de distribución de mis ingresos y egresos ordenados de mayor a menor y el comportamiento histórico de mi patrimonio neto y estado de resultados a lo largo del tiempo.

**Why this priority**: Proporciona la capa visual y analítica para entender patrones de gasto, ahorro y evolución financiera de mediano/largo plazo.

**Independent Test**: Entrar al módulo de Estadísticas, seleccionar un período temporal y comprobar que los gráficos circulares muestren la distribución ordenada por porcentaje de ocupación y los gráficos temporales reflejen la evolución de saldos e ingresos/egresos históricos.

**Acceptance Scenarios**:

1. **Given** un rango de fecha seleccionado en Estadísticas, **When** se cargan los gráficos circulares de ingresos o egresos, **Then** se presentan las categorías de mayor a menor según su porcentaje sobre el total, detallando el porcentaje de ocupación y monto de cada categoría.
2. **Given** historial de transacciones, **When** se seleccionan los gráficos de evolución, **Then** se renderiza un gráfico de línea con la evolución histórica del Patrimonio Neto (Activos - Pasivos) y otro gráfico de columnas o líneas del Estado de Resultados (Ingresos vs Egresos) acumulados por período.

---

### User Story 5 - Configuración de Preferencias y Perfil (Priority: P3)

Como usuario del sistema, quiero definir la moneda principal de mi contabilidad, añadir monedas secundarias, modificar la contraseña de mi cuenta de seguridad y poder cambiar entre el modo claro y oscuro de la aplicación.

**Why this priority**: Permite la personalización básica de la experiencia del usuario y provee las opciones de control de perfil necesarias.

**Independent Test**: Ir al módulo de Configuración, cambiar el tema visual de claro a oscuro y comprobar que el cambio estético se aplique en todo el dashboard inmediatamente sin perder información.

**Acceptance Scenarios**:

1. **Given** la pantalla de configuración, **When** el usuario establece una moneda principal o agrega monedas adicionales, **Then** estas monedas quedan disponibles para ser utilizadas en el registro de transacciones.
2. **Given** la opción de seguridad del perfil, **When** el usuario ingresa su contraseña actual y una nueva válida, **Then** la contraseña se actualiza en el sistema.
3. **Given** el selector de tema visual, **When** el usuario cambia entre modo claro y oscuro, **Then** la interfaz adapta instantáneamente sus colores principales, manteniendo el tema claro como la opción por defecto en nuevos accesos.

---

### User Story 6 - Formulario de Asiento Contable Libre Multi-Item (Priority: P1)

Como encargado del registro, quiero cargar asientos contables reales ingresando múltiples líneas de débitos y créditos en un formulario balanceado para registrar operaciones complejas de forma confiable.

**Why this priority**: Es el motor principal de inserción de datos contables precisos y flexibles, superando las limitaciones de registros de partida simple de otras aplicaciones móviles.

**Independent Test**: Abrir el formulario de carga de asiento, agregar tres líneas de detalle (ej. dos débitos y un crédito), validar que el sistema muestre si está descuadrado y que solo permita guardar cuando la diferencia sea cero.

**Acceptance Scenarios**:

1. **Given** el formulario de nuevo asiento contable, **When** el usuario añade ítems, **Then** cada línea permite seleccionar la Cuenta/Categoría (rubro) afectada, agregar una descripción individual, definir el importe y el tipo de movimiento (Débito o Crédito).
2. **Given** un asiento con múltiples líneas cargadas, **When** la suma de todos los débitos es diferente de la suma de todos los créditos, **Then** el botón de guardar se mantiene deshabilitado o muestra un mensaje de validación indicando la diferencia y no permite procesar el asiento.
3. **Given** un asiento balanceado ($\sum \text{Débitos} = \sum \text{Créditos}$), **When** el usuario presiona guardar, **Then** se genera el asiento en el diario y se actualizan los saldos de todas las cuentas involucradas.

---

### Edge Cases

- **Validación Multimoneda en Asientos Libres**: Cuando un asiento incluye ítems en diferentes monedas, el sistema debe convertir cada valor a la moneda principal usando el tipo de cambio definido para esa fecha y validar el balance del asiento sobre los valores en moneda principal.
- **Rango Custom Invertido**: Al seleccionar un rango temporal customizado para transacciones o estadísticas, si la fecha de inicio es posterior a la fecha de fin, el sistema debe auto-corregir o mostrar un error de validación, impidiendo la búsqueda.
- **Cuentas y Rubros con Transacciones Asociadas**: Si se intenta eliminar una cuenta o rubro que tiene transacciones registradas históricamente, el sistema debe bloquear la eliminación física o realizar un borrado lógico (desactivar para nuevos asientos) para evitar dejar apuntes huérfanos o alterar balances históricos.
- **Edición de Asientos Históricos**: Cualquier corrección sobre asientos ya grabados debe requerir la generación de un asiento de reversión o ajuste para mantener la trazabilidad e inmutabilidad del libro diario.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La interfaz debe implementar un diseño responsive "mobile-first" que oculte el menú lateral en un panel colapsable/drawer en dispositivos móviles (<768px) y lo muestre de forma fija como sidebar en pantallas de escritorio (>1024px).
- **FR-002**: Se debe incluir un buscador global simple en la barra superior/cabecera persistente de la aplicación, permitiendo buscar transacciones por descripción, nota o importe de forma ágil.
- **FR-003**: El botón flotante de creación de asiento debe ser visible y persistente en la esquina inferior derecha en todas las pantallas principales de navegación.
- **FR-004**: El módulo de Transacciones debe permitir seleccionar y recordar el tipo de visualización activo: "Diario", "Calendario" o "Mensual".
- **FR-005**: En la vista de Transacciones Calendario, la vista estará estrictamente limitada a la temporalidad mensual actual seleccionada.
- **FR-006**: Los filtros de Cuenta, Rubro de Ingreso y Rubro de Gasto deben ser globales en el módulo de transacciones, afectando por igual a las tres representaciones visuales y sus counters sumatorios.
- **FR-007**: El módulo de Estadísticas debe calcular y graficar de forma ordenada las proporciones de ingresos y egresos según sus porcentajes sobre el total de forma descendente.
- **FR-008**: Los gráficos de evolución deben incluir una línea temporal de Patrimonio Neto calculado dinámicamente como $\text{Activos} - \text{Pasivos}$ al final de cada intervalo del período.
- **FR-009**: Las cuentas contables en la pantalla "Cuentas" deben organizarse de forma visual bajo agrupadores de activos, pasivos y patrimonio neto, mostrando saldo individual y la sumatoria acumulada por subgrupo.
- **FR-010**: El formulario de carga de transacciones debe permitir la edición libre de asientos con un número indeterminado de renglones o líneas (mínimo 2).
- **FR-011**: El sistema debe impedir la grabación de cualquier asiento en el que la suma total de débitos no sea igual a la suma total de créditos (en la moneda de registro equivalente en la moneda base).
- **FR-012**: El módulo de configuración debe permitir establecer la moneda principal y gestionar un listado de monedas adicionales válidas para el registro.
- **FR-013**: El tema visual por defecto debe ser Claro, permitiendo al usuario conmutar a tema Oscuro a través del panel de configuración.

### Key Entities *(include if feature involves data)*

- **Account (Cuenta)**: Representa el destino o procedencia de los fondos. Posee un nombre, tipo de cuenta (Activo, Pasivo, etc.), saldo y moneda.
- **Category (Rubro/Categoría)**: Representa la cuenta de resultado o clasificación asociada a ingresos y egresos (ej. Gastos de Comida, Ingresos por Salario).
- **Transaction (Transacción/Asiento)**: Encabezado del movimiento contable que contiene la fecha, descripción general, moneda e inmutabilidad.
- **JournalEntry (Apunte/Línea de Asiento)**: Cada uno de los registros individuales de débito o crédito asociados a una transacción, vinculados a una cuenta o categoría y un importe.
- **Currency (Moneda)**: Representa los tipos de divisa utilizables, su símbolo y su cotización respecto a la moneda principal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La interfaz debe adaptarse a diferentes resoluciones de pantalla en menos de 100ms tras el cambio de tamaño del viewport, acomodando el menú lateral o inferior de manera fluida.
- **SC-002**: Las transacciones devueltas por la búsqueda global deben filtrarse y mostrarse en pantalla en menos de 300ms tras ingresar el término en el buscador.
- **SC-003**: El 100% de las transacciones registradas deben guardarse con estado balanceado en base de datos.
- **SC-004**: Los gráficos del módulo de estadísticas deben cargarse y renderizarse en menos de 400ms al cambiar la temporalidad o aplicar filtros.

## Assumptions

- **A-001**: El almacenamiento del tema visual preferido (Claro/Oscuro) se realizará de manera local en el navegador (LocalStorage) o mediante preferencias persistidas de usuario.
- **A-002**: Las cotizaciones de cambio multimoneda se ingresan manualmente en el sistema en una tabla de cotizaciones para evitar llamadas a APIs externas en tiempo real.
- **A-003**: Se asume que el usuario operará sobre un plan de cuentas base pre-cargado que podrá expandir o modificar libremente mediante el Gestor de Cuentas.
