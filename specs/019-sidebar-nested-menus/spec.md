# Feature Specification: Menús y Submenús Anidados en Sidebar y Navegación Móvil

**Feature Branch**: `019-sidebar-nested-menus`

**Created**: 2026-08-15

**Status**: Draft

**Input**: User description: "Implementar menus y sub menus en el sidebar. Por ejemplo, menu padre presupuesto y sub items para Planificacion de presupuesto y control de ejecucion. También mejorar el menú en mobile acorde a esto"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navegación Jerárquica Desplegable en Sidebar de Escritorio (Priority: P1)

Como usuario que navega por el sistema contable en escritorio, quiero ver los módulos relacionados organizados en grupos desplegables (como "Presupuestos" con "Planificación de Presupuesto" y "Control de Ejecución", y "Reportes" con sus distintos informes), para reducir el ruido visual y encontrar rápidamente la funcionalidad deseada manteniendo una vista estructurada y limpia.

**Why this priority**: Es la necesidad nuclear planteada por el usuario. El crecimiento del sistema añade nuevos módulos que saturan el menú plano actual; la jerarquización modular mejora sustancialmente la ergonomía y navegación diaria.

**Independent Test**: Puede probarse de manera independiente navegando por el sidebar en escritorio, haciendo clic en el menú padre "Presupuestos" para expandir/contraer sus opciones ("Planificación Presupuestaria", "Control de Ejecución") y accediendo a cada una de ellas de forma fluida.

**Acceptance Scenarios**:

1. **Given** que el usuario se encuentra en la interfaz de escritorio con el sidebar expandido, **When** visualiza el sidebar, **Then** debe ver los ítems organizados en ítems individuales (ej. Transacciones, Cuentas, Estadísticas, Períodos, Ajustes) y grupos con submenús desplegables (ej. "Presupuestos" y "Reportes").
2. **Given** que un grupo desplegable está cerrado, **When** el usuario hace clic en el encabezado del grupo padre (ej. "Presupuestos"), **Then** el grupo se despliega con una animación suave mostrando sus subítems ("Planificación Presupuestaria", "Control de Ejecución") y un indicador de chevron que rota.
3. **Given** que un grupo desplegable está abierto, **When** el usuario hace clic nuevamente en el encabezado padre, **Then** el grupo se contrae ocultando sus subítems.
4. **Given** que el usuario hace clic en un subítem (ej. "Control de Ejecución"), **When** la ruta cambia a `/budgets/control`, **Then** el subítem se resalta como activo y el grupo padre permanece expandido con un distintivo visual sutil.

---

### User Story 2 - Menú Móvil Jerárquico y Optimizado (Priority: P1)

Como usuario móvil, quiero acceder a los menús y submenús organizados en secciones claras dentro del drawer o panel de navegación móvil, para poder navegar rápidamente entre la planificación, control presupuestario, reportes y ajustes sin una lista desordenada ni interfaces sobrecargadas.

**Why this priority**: La experiencia móvil debe ser consistente con la jerarquía de escritorio, garantizando que los usuarios en teléfonos o tablets puedan acceder a todos los submenús de forma cómoda y ergonómica.

**Independent Test**: Puede probarse abriendo la aplicación en resolución móvil, abriendo el menú "Más" (o panel de navegación móvil), desplegando las secciones jerárquicas y seleccionando un subítem como "Planificación Presupuestaria" o "Control de Ejecución".

**Acceptance Scenarios**:

1. **Given** que el usuario está en un dispositivo móvil y pulsa el botón "Más" (o menú de navegación), **When** se abre el panel móvil, **Then** las opciones aparecen organizadas por categorías o grupos desplegables claros y legibles.
2. **Given** que el usuario abre una sección como "Presupuestos" o "Reportes" en el menú móvil, **When** visualiza los subítems, **Then** los elementos presentan áreas táctiles amplias (mínimo 44px de alto), tipografía clara y respuesta táctil inmediata.
3. **Given** que el usuario toca un subítem en el menú móvil, **When** se inicia la navegación, **Then** el panel móvil se cierra automáticamente y se redirige al usuario a la página de destino seleccionada.

---

### User Story 3 - Expansión Automática por Ruta Activa y Persistencia (Priority: P2)

Como usuario del sistema, quiero que al ingresar directamente a una URL profunda (ej. `/budgets/matrix` o `/reports/balance-sheet`) o recargar la página, el grupo padre correspondiente se encuentre automáticamente expandido y el subítem activo resaltado, para mantener siempre el contexto de ubicación en la aplicación.

**Why this priority**: Proporciona coherencia de navegación y contexto espacial inmediato evitando que el usuario deba abrir manualmente el menú padre para saber en qué sección se encuentra.

**Independent Test**: Puede probarse ingresando directamente a la URL `/budgets/control` y verificando que el menú padre "Presupuestos" se inicializa abierto y el enlace "Control de Ejecución" muestra el estilo de elemento activo.

**Acceptance Scenarios**:

1. **Given** que el usuario accede directamente a `/budgets/matrix` mediante enlace o recarga, **When** carga el sidebar, **Then** el menú "Presupuestos" se encuentra automáticamente expandido y "Planificación Presupuestaria" marcado como activo.
2. **Given** que el usuario navega a `/reports/income-statement`, **When** se actualiza la ruta, **Then** el menú "Reportes" se auto-expande (si estaba cerrado) resaltando "Estado de Resultados".

---

### User Story 4 - Navegación con Sidebar Colapsado (Compacto) en Escritorio (Priority: P2)

Como usuario que prefiere maximizar el espacio de trabajo en pantalla colapsando el sidebar a solo iconos, quiero poder interactuar con los grupos anidados (mediante menú flotante/popover o tooltip inteligente), para poder acceder a los submenús sin necesidad de expandir permanentemente la barra lateral.

**Why this priority**: Mantiene la funcionalidad completa de la navegación cuando el usuario decide trabajar con el sidebar minimizado.

**Independent Test**: Colapsar el sidebar en escritorio, hacer clic o interactuar con el icono de "Presupuestos", y verificar que aparece un submenú flotante accesible con sus subítems para seleccionar uno de ellos.

**Acceptance Scenarios**:

1. **Given** que el sidebar está en modo colapsado (solo iconos), **When** el usuario hace clic o pasa el cursor sobre el icono de un grupo padre con subítems (ej. "Presupuestos"), **Then** se despliega un panel flotante contextual (flyout/popover) mostrando el título del grupo y la lista de subítems.
2. **Given** que el panel flotante está visible, **When** el usuario selecciona un subítem, **Then** se navega a la ruta elegida y el panel flotante se cierra de inmediato.

---

### Edge Cases

- **Múltiples grupos abiertos simultáneamente**: El usuario puede configurar o mantener abiertos múltiples grupos sin que colisionen ni desborden de forma rota la altura de la pantalla (debe existir scrollbar estilizado si la lista de menús supera la altura de la ventana).
- **Rutas anidadas con sub-rutas o parámetros**: Si el usuario navega a una sub-ruta de un subítem (ej. `/budgets/matrix/2026-08`), el subítem "Planificación Presupuestaria" y el padre "Presupuestos" deben mantenerse activos y expandidos.
- **Transición fluida de colapso de sidebar**: Al alternar entre sidebar colapsado y expandido, el estado de las animaciones no debe generar saltos de contenido ni parpadeos.
- **Resoluciones intermedias (Tablets)**: En anchos de pantalla intermedios, la adaptación responsive debe alternar adecuadamente entre la navegación lateral de escritorio y el drawer/barra inferior móvil sin solapamientos.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE estructurar la navegación del sidebar en elementos individuales y grupos jerárquicos padres con subítems.
- **FR-002**: El sistema DEBE agrupar bajo el menú padre "Presupuestos" los subítems: "Planificación Presupuestaria" (ruta `/budgets/matrix` o `/budgets`) y "Control de Ejecución" (ruta `/budgets/control`).
- **FR-003**: El sistema DEBE agrupar bajo el menú padre "Reportes" (o "Informes Financieros") los subítems correspondientes a balances y estados contables ("Balance General", "Estado de Resultados", "Resultados Proyectados", "Caja Proyectada").
- **FR-004**: Los elementos raíz no agrupados (como "Transacciones", "Cuentas", "Estadísticas", "Períodos", "Ajustes") DEBEN mantenerse directamente accesibles en el primer nivel del menú.
- **FR-005**: Cada grupo padre en el sidebar DEBE permitir expandir y contraer su lista de subítems mediante clic en su encabezado, con indicador visual (chevron/flecha) animado.
- **FR-006**: El sistema DEBE detectar la ruta activa actual y auto-expandir automáticamente el grupo padre contenedor, resaltando visualmente el subítem activo.
- **FR-007**: En modo sidebar colapsado (ancho compacto con solo iconos), los grupos con subítems DEBEN ofrecer un mecanismo interactivo (como flyout/popover flotante o menú emergente) para acceder a sus opciones sin romper la interfaz.
- **FR-008**: La navegación móvil DEBE rediseñarse para presentar una jerarquía clara y organizada acorde a la estructura de grupos y subítems, reemplazando la cuadrícula plana por una lista estructurada o acordeón táctil.
- **FR-009**: Al hacer clic en cualquier subítem o ítem de navegación en móvil, el panel/drawer DEBE cerrarse automáticamente y realizar la transición de ruta.
- **FR-010**: El contenedor de navegación en el sidebar y en el drawer móvil DEBE soportar desplazamiento vertical (scroll) independiente cuando el contenido exceda la altura del viewport.
- **FR-011**: Todos los elementos interactivos DEBEN cumplir con estándares de accesibilidad, incluyendo contraste adecuado en tema claro y oscuro, estados `:hover` / `:focus-visible`, y atributos semánticos `aria-expanded` para menús desplegables.

### Key Entities

- **NavItem (Elemento de Navegación Simple)**: Representa un enlace directo de primer nivel con nombre, ruta (`href`), icono descriptivo y condición opcional de coincidencia activa.
- **NavGroup (Grupo de Navegación Jerárquico)**: Representa un contenedor de menú padre con nombre, icono distintivo, identificador de grupo, y una colección de `NavItem` secundarios anidados (`children`).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Los usuarios pueden acceder a "Planificación Presupuestaria" y "Control de Ejecución" en máximo 2 clics o interacciones desde cualquier pantalla.
- **SC-002**: Reducción del espacio vertical ocupado por la navegación principal en al menos un 25% gracias al agrupamiento modular de reportes y presupuestos.
- **SC-003**: 100% de coherencia en el estado activo: al cargar cualquier ruta hija profunda, el menú padre se expande automáticamente y el subítem exacto se resalta.
- **SC-004**: La interfaz móvil permite navegar a cualquier sección o subítem en menos de 3 segundos con una tasa de error de toque nula gracias a áreas táctiles de al menos 44px de alto.
- **SC-005**: Transiciones visuales de colapso y expansión fluidas a 60 FPS sin parpadeos ni distorsiones visuales en modo claro y oscuro.

## Assumptions

- Las rutas del backend y páginas Next.js existentes (`/budgets/matrix`, `/budgets/control`, `/reports/*`, `/transactions`, `/accounts`, etc.) se mantienen idénticas para no romper enlaces ni bookmarks existentes.
- El almacenamiento en `localStorage` del estado colapsado general del sidebar se mantiene como hasta ahora (`sidebar_collapsed`).
- El diseño utiliza los tokens de diseño existentes en el proyecto (TailwindCSS v4.3, iconos Lucide React, tema claro y oscuro coordinado con `theme-context`).
- La barra de navegación inferior móvil (`BottomNav`) mantiene accesos rápidos a las acciones más frecuentes (ej. Registro, Cuentas, Estadísticas, y "Más" para abrir el menú completo jerarquizado).
