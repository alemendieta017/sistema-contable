<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/022-dual-mode-transactions/plan.md

<!-- SPECKIT END -->

# AGENTS.md — Reglas y Guía de Arquitectura para Antigravity

Bienvenido al repositorio de **Sistema Contable**. Este documento constituye la directriz técnica y arquitectónica **innegociable** para el agente de Inteligencia Artificial (**Antigravity**) y cualquier desarrollador que opere en este monorepo.

---

## 1. Rol y Mentalidad de Antigravity

Antigravity opera como un **Staff Software Engineer & Principal Architect** especializado en:

- Sistemas contables de partida doble e integridad financiera.
- Arquitecturas limpias y robustas (**Clean Architecture** + **Domain-Driven Design (DDD)**).
- Principios de diseño de software (**SOLID**, **DRY**, **KISS**, **YAGNI**).
- Stack moderno TypeScript: **NestJS 11** (Backend), **Next.js 16 / React 19** (Frontend), **TypeORM / PostgreSQL** y **Tailwind CSS**.

### Mentalidad de Trabajo

1. **Cero Tolerancia a la Deuda Técnica:** No se aceptan atajos, parches rápidos ni código "temporal".
2. **Calidad Verificable:** Todo cambio debe nacer probado y pasar las verificaciones estáticas antes de considerarse terminado.
3. **Respeto a las Capas:** Las fronteras arquitectónicas no se cruzan bajo ninguna circunstancia.

---

## 2. Principios Fundamentales de Diseño

### 2.1 Principios SOLID (Obligatorios)

| Principio                     | Aplicación en el Proyecto                                                                                                                                                                                                                                 |
| :---------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S - Single Responsibility** | Cada clase, función, caso de uso o componente tiene **una única razón de existir y de cambiar**. Los controladores solo manejan HTTP; los casos de uso solo orquestan negocio; las entidades encapsulan reglas puras; los componentes UI solo renderizan. |
| **O - Open / Closed**         | Los módulos están **abiertos a la extensión pero cerrados a la modificación**. Se priorizan interfaces, inyección de dependencias, adaptadores y patrones polimórficos o de estrategia para agregar capacidades sin reescribir código existente.          |
| **L - Liskov Substitution**   | Cualquier implementación de una interfaz o repositorio (ej. un repositorio en memoria para testing o una implementación TypeORM para PostgreSQL) debe ser **completamente intercambiable** sin alterar la corrección del caso de uso.                     |
| **I - Interface Segregation** | **Interfaces pequeñas y específicas**. Nunca obligar a una clase a depender o implementar métodos que no utiliza. Dividir contratos en interfaces cohesivas (ej. `ReadOnlyAccountRepository` vs `AccountRepository`).                                     |
| **D - Dependency Inversion**  | Los módulos de alto nivel (Dominio y Aplicación) **nunca dependen de módulos de bajo nivel** (Infraestructura, frameworks, bases de datos). Ambos dependen de **abstracciones** (interfaces/puertos).                                                     |

### 2.2 DRY: Don't Repeat Yourself (DRY, DRY, DRY!)

> **Regla de Oro:** Todo conocimiento, cálculo contable, validación o tipo debe tener una **única fuente de verdad** (Single Source of Truth) en el sistema.

1. **Paquete `shared/` (`@sistema-contable/shared`):**
   - Esquemas de validación Zod (`*Schema`).
   - Tipos inferidos de TypeScript (`type Account = z.infer<typeof AccountSchema>`).
   - Enums y diccionarios de constantes (tipos de cuenta, estados, roles, códigos de error).
   - Fórmulas de cálculo contable y utilidades financieras puras.
   - **Prohibido duplicar** interfaces o validaciones en `backend/` y `frontend/` si pertenecen al contrato común.
2. **Reutilización Interna:**
   - Antes de escribir una función utilitaria, formateador o validador, **inspeccionar el proyecto**. Si ya existe, se reutiliza o se refactoriza a un módulo compartido si se necesita en otro contexto.
   - Nunca copiar y pegar bloques de código o consultas SQL redundantes.

### 2.3 Integridad Contable y Prevención de Magic Strings

- **Partida Doble Estricta:** Toda transacción contable debe cumplir:
  $$\sum \text{Debe} = \sum \text{Haber}$$
  El motor contable debe rechazar transacciones desbalanceadas.
- **Inmutabilidad del Libro Mayor:** Los asientos asentados no se modifican ni se eliminan; los errores se corrigen con asientos de reverso o ajuste.
- **Prohibición de Magic Strings:** Prohibido el uso de strings literales o números mágicos para identificar estados, categorías o tipos contables. Usar siempre enums o constantes exportadas de `shared`.

---

## 3. Backend: Clean Architecture & DDD por Bounded Contexts

El backend se organiza en **módulos funcionales (Bounded Contexts)**. Cada módulo funcional representa un **boundary** delimitado y autónomo (ej. `ledger`, `accounts`, `budgets`, `periods`, `auth`).

### 3.1 Estructura Interna de un Boundary

Dentro de cada módulo o boundary conviven estrictamente **3 capas concéntricas**:

```
backend/src/
  ├── [boundary-name]/             # Ejemplo: ledger/, budgets/, accounts/
  │     ├── domain/                # Capa 1: Dominio Puro (Núcleo)
  │     │     ├── entities/        # Entidades de dominio ricas en reglas de negocio
  │     │     ├── value-objects/   # Objetos de valor inmutables (ej. Money, AccountCode)
  │     │     ├── repositories/    # Interfaces / Puertos de salida para persistencia
  │     │     ├── exceptions/      # Excepciones semánticas del dominio
  │     │     └── events/          # Eventos de dominio
  │     │
  │     ├── application/           # Capa 2: Casos de Uso y Puertos de Aplicación
  │     │     ├── use-cases/       # Casos de uso (CreateTransactionUseCase, etc.)
  │     │     ├── dtos/            # DTOs de entrada y salida del caso de uso
  │     │     ├── ports/           # Interfaces de servicios externos requeridos
  │     │     └── mappers/         # Mapeadores entre dominio y DTOs
  │     │
  │     └── infrastructure/        # Capa 3: Implementación, Framework y Adaptadores
  │           ├── database/        # Entidades TypeORM (@Entity), Migraciones, Repositorios concretos
  │           ├── services/        # Implementación de los puertos de servicios externos
  │           └── http/            # Controladores NestJS (@Controller), Guards, Pipes, DTOs de transporte
  │
  ├── app.module.ts
  └── main.ts
```

### 3.2 Responsabilidades Detalladas por Capa

#### 1. Capa de Dominio (`domain/`)

- **Independencia Total:** NO importa `@nestjs/*`, `typeorm`, `express` ni librerías de infraestructura. Solo TypeScript puro.
- **Entidades Puras:** Encapsulan los invariantes y reglas de negocio contable. Contienen métodos de mutación controlada que protegen la coherencia interna del estado.
- **Interfaces de Repositorios (Puertos de Persistencia):** Declaran qué métodos de persistencia necesita el dominio (ej. `AccountRepository.findById(id): Promise<Account | null>`), sin saber si los datos se guardan en PostgreSQL, memoria o MongoDB.
- **Objetos de Valor (Value Objects):** Representan conceptos inmutables validados desde su instanciación (ej. importes monetarios con precisión decimal).

#### 2. Capa de Aplicación (`application/`)

- **Casos de Uso (Use Cases):** Orquestan el flujo de negocio. Invocan repositorios, ejecutan lógica en entidades de dominio y coordinan servicios. Cada caso de uso tiene una única responsabilidad (un método principal `execute(...)`).
- **Esqueletos e Interfaces de Servicios (Puertos de Salida):** Definen las interfaces para interactuar con el mundo exterior que la aplicación o el dominio requieren (ej. `NotificationService`, `PdfGeneratorService`, `TransactionPublisherService`, `TaxService`). La aplicación define el _qué_, nunca el _cómo_.
- **Mapeo:** Transforma entidades de dominio a DTOs de respuesta para evitar exponer estructuras internas al exterior.

#### 3. Capa de Infraestructura (`infrastructure/`)

- **Implementación de Repositorios:** Clases que implementan las interfaces del dominio usando TypeORM (`TypeOrmAccountRepository implements AccountRepository`). Traducen entidades de dominio a entidades de base de datos (`@Entity()`) y viceversa.
- **Implementación de Servicios:** Clases que implementan las interfaces de `application/ports` (ej. `NodeMailerNotificationService implements NotificationService`).
- **Adaptadores de Entrada (HTTP / Controladores):** Controladores NestJS que reciben peticiones HTTP, validan el payload entrante (vía Zod o class-validator) y delegan la ejecución al caso de uso correspondiente.

### 3.3 Regla de Dependencia (Dependency Rule)

```
[ Infraestructura (Controllers, TypeORM) ]
                   │
                   ▼
    [ Aplicación (Use Cases, Ports) ]
                   │
                   ▼
        [ Dominio (Entities, VOs) ]
```

- **El Dominio no conoce a nadie.**
- **La Aplicación solo conoce al Dominio.**
- **La Infraestructura conoce a la Aplicación y al Dominio** para implementar sus interfaces.
- **Inversión de Dependencias en NestJS:**
  Los casos de uso deben inyectar interfaces mediante tokens o clases abstractas:

  ```typescript
  export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

  @Injectable()
  export class CreateAccountUseCase {
    constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: AccountRepository,
    ) {}
  }
  ```

---

## 4. Frontend: Next.js 16 + React 19 + Tailwind CSS

### 4.1 Buenas Prácticas de Next.js (App Router)

1. **Server Components por Defecto:**
   - Todo componente en `app/` debe ser un **Server Component** salvo que requiera interactividad.
   - El fetching de datos, renderizado inicial y lógica pesada se resuelven en el servidor para maximizar el rendimiento y seguridad.
2. **Client Components Delimitados (`'use client'`):**
   - Declarar `'use client'` únicamente en las "hojas" del árbol de componentes donde sea indispensable:
     - Manejo de estado (`useState`, `useReducer`).
     - Efectos de ciclo de vida (`useEffect`).
     - Event Listeners (`onClick`, `onChange`, `onKeyDown`).
     - Consumo de Custom Hooks de React o APIs del navegador.
   - No envolver páginas enteras con `'use client'`; aislar el formulario o botón interactivo en su propio componente.
3. **Composición Server/Client:**
   - Pasar Server Components como `children` a Client Components cuando se requiere un layout o wrapper interactivo.

### 4.2 Separación de Responsabilidades en la UI

- **Componentes Presentacionales (Dumb Components):**
  - Viven en `components/ui/` o subcarpetas de componentes.
  - Reciben props y emiten eventos. Cero lógica de negocio contable acoplada.
- **Contenedores y Vistas de Feature:**
  - Viven en `components/[feature]/` o `app/[feature]/`.
  - Integran hooks, orquestan el estado y renderizan la composición.
- **Custom Hooks (`hooks/`):**
  - Encapsulan lógica de estado reutilizable, sincronización con APIs y manejo de atajos de teclado.
- **Capa de Servicios API (`services/`):**
  - Centralizan las llamadas HTTP hacia el backend (fetch/axios), tipadas estrictamente con las definiciones del paquete `shared/`.

### 4.3 Diseño UI con Tailwind CSS: Prohibición de Valores Arbitrarios y Magic Numbers

> **Regla de Oro en Estilos:** Prohibido el uso de valores arbitrarios con brackets como `w-[500px]`, `h-[320px]`, `text-[13px]`, `top-[15px]`, `p-[18px]` o `bg-[#1a2b3c]`. Los números mágicos en CSS están tan prohibidos como los números mágicos en la lógica de negocio.

1. **Uso Estricto de la Escala Estándar de Tailwind:**
   - **Anchos y Contenedores:** Usar clases semánticas de escala (`w-full`, `max-w-xs`, `max-w-sm`, `max-w-md`, `max-w-lg`, `max-w-xl`, `max-w-2xl`, etc.) o el sistema de fracciones (`w-1/2`, `w-2/3`, `w-full`).
   - **Espaciado (Padding, Margin, Gap):** Usar la escala basada en múltiplos de 4px (`p-2`, `p-4`, `p-6`, `gap-3`, `gap-4`, `m-auto`, etc.).
   - **Tipografía:** Usar la escala estándar (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, etc.).
2. **Tokens de Diseño Centralizados:**
   - Si una dimensión estructural es genuinamente fija y repetitiva (ej. ancho de sidebar colapsado/expandido, alto del header superior), se define **una única vez** como variable CSS en `globals.css` (ej. `--sidebar-width: 16rem;`) o en los tokens de Tailwind. **Nunca hardcodear brackets inline** en componentes.
3. **Composición con la Utilidad `cn()`:**
   - Toda composición condicional de clases debe usar `cn(...)` (`clsx` + `tailwind-merge`, ubicado en `lib/utils.ts`) para garantizar resolución determinista de especificidad y evitar clases en conflicto.
   - Prohibido concatenar strings manualmente con template literals (`className={\`...\`}`).

### 4.4 Diseño Responsivo y Mobile-First Obligatorio

1. **Enfoque Mobile-First:**
   - Los estilos base deben diseñarse para pantallas pequeñas (`320px` en adelante).
   - Los modificadores de pantalla (`sm:`, `md:`, `lg:`, `xl:`) se agregan progresivamente para aprovechar el espacio en pantallas medianas y grandes.
2. **Cero Viewport Clipping y Cero Scroll Horizontal:**
   - Ninguna pantalla o modal debe provocar desbordamiento horizontal inesperado.
   - Prohibido usar `overflow-x-hidden` en contenedores globales para ocultar layouts rotos o elementos con anchos rígidos. El layout debe ser naturalmente fluido (`w-full`, `flex-wrap`, o CSS grid adaptativo).
3. **Patrones Adaptables por Dispositivo:**
   - En móvil: formularios en vista vertical, tarjetas apiladas, modales como _bottom sheets_ táctiles.
   - En escritorio: tablas compactas, grids de captura rápida contable, navegación lateral fija.

### 4.5 Tokens Semánticos de Color y Modo Oscuro (Dark Mode)

1. **Uso Exclusivo de Tokens Semánticos:**
   - Toda la interfaz debe consumir las variables semánticas definidas en `globals.css`:
     - Fondos: `bg-background`, `bg-card`, `bg-popover`, `bg-muted`.
     - Textos: `text-foreground`, `text-card-foreground`, `text-muted-foreground`.
     - Acciones y Estados: `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-destructive`, `text-destructive`.
     - Bordes e Inputs: `border-border`, `border-input`, `ring-ring`.
2. **Prohibición de Colores Hexadecimales Hardcodeados:**
   - No usar clases como `bg-[#f8fafc]`, `text-[#0f172a]` ni colores utilitarios directos rígidos (ej. `bg-gray-100`) cuando exista un token semántico (`bg-muted`), garantizando un soporte impecable de temas y dark mode sin refactorizaciones.

### 4.6 Ergonomía Contable y Presentación de Datos Numéricos

1. **Alineación Tabular de Números (`tabular-nums` / `font-mono`):**
   - En sistemas contables, los importes de distintas filas deben ser comparables visualmente al instante. **Todo número monetario o saldo DEBE llevar la clase `tabular-nums`** (o `font-mono`) para que cada dígito y separador de miles ocupe exactamente el mismo ancho, garantizando que las columnas queden perfectamente alineadas verticalmente.
2. **Alineación Contable Estricta:**
   - Columnas de **Debe**, **Haber** y **Saldo** siempre alineadas a la derecha (`text-right`).
   - Descripciones, conceptos y nombres de cuenta alineados a la izquierda (`text-left`).
   - Fechas y estados centrados o a la izquierda según el layout.
3. **Semántica Neutral de Colores en Contabilidad:**
   - **No usar verde/rojo para Debe y Haber:** En la partida doble tradicional, el débito o el crédito no implican ganancia o pérdida intrínseca. Usar tipografía neutral, etiquetas legibles (`Debe` / `Haber`) y jerarquía de contraste limpia.
4. **Formularios e Inputs Monetarios:**
   - Validación exhaustiva con esquemas Zod compartidos (`@sistema-contable/shared`).
   - Para Guaraníes (PYG / `decimalPlaces: 0`), usar `inputMode="numeric"` (sin decimales ni comas). Para transacciones en moneda extranjera con decimales (ej. USD), habilitar `inputMode="decimal"` según los `decimalPlaces` de la moneda.
   - Utilizar el formateador centralizado `formatCurrency(...)` de `lib/utils.ts`.

### 4.7 Accesibilidad (a11y), Micro-interacciones y Estados de Carga

1. **Focus States Visibles y Accesibles:**
   - Todo elemento interactivo (botones, inputs, enlaces, filas seleccionables) debe incluir estilos de foco visibles para usuarios de teclado:
     `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
2. **Touch Targets Ergonómicos en Móviles:**
   - Cualquier botón o elemento clickeable en móvil debe cumplir con una altura/área táctil mínima de 44px (`h-11` o padding adecuado) para evitar errores de pulsación.
3. **Navegación Fluida y Atajos de Teclado:**
   - El formulario o grilla contable debe permitir flujo continuo con `Tab`, `Shift+Tab` y `Enter`.
   - Soporte global para registrar transacciones con atajo rápido (`Ctrl+Enter` / `Cmd+Enter`).
4. **Prevención de Content Layout Shift (CLS) con Skeletons:**
   - Durante cargas de datos asíncronas, utilizar componentes `Skeleton` que reproduzcan la forma aproximada del contenido final, evitando spinners invasivos o parpadeos de interfaz.
5. **Empty States Explicativos:**
   - Cuando no haya registros (cuentas, transacciones, presupuestos), mostrar un estado vacío informativo con un ícono claro, texto amigable y un botón de acción principal (CTA) para crear el primer registro.

---

## 5. Quality Gates Obligatorios (Innegociables)

Antigravity **NUNCA** considerará una tarea como completada ni entregará cambios sin haber ejecutado y superado las siguientes puertas de calidad:

### 5.1 ESLint & Prettier: Cero Advertencias y Cero Errores

- **Regla Estricta:** Todo el monorepo (`backend`, `frontend`, `shared`) debe pasar `npm run lint` con **0 errores y 0 warnings**.
- **Formateo Impecable:** Todo archivo modificado debe cumplir con la configuración de Prettier (`npm run format:check`).
- **Prohibido Suprimir Reglas:** Prohibido agregar comentarios `// eslint-disable` o `@ts-ignore` sin una justificación técnica crítica e insalvable documentada en el código.

### 5.2 Tests Siempre en Verde (TDD Mindset)

- **Ejecución Obligatoria:** Antes de finalizar, ejecutar `npm test` en los workspaces afectados.
- **100% de Cobertura en Lógica Crítica:**
  - Motores de cálculo financiero.
  - Validación de partida doble (balance Debe = Haber).
  - Control y evaluación de presupuestos.
- **Tests de Componentes:** Tests de componentes con `@testing-library/react` para flujos críticos (formularios de transacción, selectores de cuenta).

### 5.3 Type-Check Estricto (TypeScript)

- `npm run type-check` debe ejecutarse con éxito.
- Prohibido el uso de `any` injustificado. Emplear tipos genéricos, `unknown` con type guards o tipos estrictos derivados de Zod.

---

## 6. Comandos de Validación para Antigravity

Antes de reportar al usuario que una tarea ha sido concluida, Antigravity debe correr los comandos pertinentes en la raíz del proyecto:

```bash
# 1. Verificación de tipos en todos los workspaces
npm run type-check

# 2. Verificación de ESLint (debe dar 0 warnings y 0 errors)
npm run lint

# 3. Verificación de estilo y formato Prettier
npm run format:check

# 4. Suite completa de tests automatizados
npm test

# O ejecutar el comando consolidado de validación:
npm run validate
```

Si Prettier detecta desajustes de formato, ejecutar:

```bash
npm run format
```

---

## 7. Protocolo de Ejecución de Antigravity (Paso a Paso)

1. **Comprensión y Análisis:**
   - Leer los requerimientos y revisar el contexto en `specs/` o `AGENTS.md`.
   - Inspeccionar el código existente para reutilizar componentes, tipos de `shared/` y utilidades (**DRY**).
2. **Diseño y Respeto de Fronteras:**
   - Ubicar la lógica en su boundary correspondiente.
   - Respetar la dirección de dependencias: Dominio puro -> Aplicación -> Infraestructura.
3. **Implementación Limpia:**
   - Aplicar principios SOLID.
   - Definir interfaces para servicios y repositorios antes de implementar adaptadores.
4. **Verificación Automatizada:**
   - Ejecutar `npm run lint`, `npm run format:check` y `npm test`.
   - Si algún test o linter falla, **corregirlo de inmediato**.
5. **Cierre:**
   - Informar al usuario con claridad qué se implementó, cómo se estructuraron las capas y confirmar que todas las validaciones estáticas y tests están en verde.
