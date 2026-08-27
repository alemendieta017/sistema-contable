<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/022-dual-mode-transactions/plan.md

<!-- SPECKIT END -->

# AGENTS.md — Reglas Arquitectónicas y Quality Gates

Directrices técnicas innegociables para **Antigravity** y desarrolladores en este monorepo (NestJS 11 + Next.js 16 + TypeScript + Tailwind CSS).

---

## 1. Backend: Clean Architecture & DDD por Boundaries

La lógica backend se estructura en **Bounded Contexts (módulos funcionales)** autónomos (`ledger/`, `budgets/`, `accounts/`, etc.). Cada módulo contiene estrictamente 3 capas concéntricas:

1. **`domain/` (Núcleo Puro):**
   - Entidades puras con reglas de negocio e invariantes protegidos (sin decoradores TypeORM ni librerías de infraestructura).
   - Value Objects inmutables, excepciones semánticas y eventos de dominio.
   - Interfaces/Puertos de persistencia (`AccountRepository`, etc.).
2. **`application/` (Casos de Uso y Puertos de Salida):**
   - Casos de uso atómicos (`CreateTransactionUseCase`, método `execute`).
   - DTOs y mappers entre dominio y aplicación.
   - Interfaces/Esqueletos de servicios externos (`NotificationService`, `PdfService`, etc.) que conectan el dominio con el exterior.
3. **`infrastructure/` (Adaptadores y Persistencia):**
   - Implementaciones concretas de repositorios (`TypeOrmAccountRepository`) y entidades de BD (`@Entity`).
   - Implementaciones de servicios externos (`application/ports`).
   - Controladores HTTP NestJS (`@Controller`), Pipes de validación y DTOs de red.

**Regla de Dependencias & Inversión:**

- `Infrastructure -> Application -> Domain`. El dominio no conoce capas externas.
- Inversión de dependencias en NestJS mediante Tokens (`Symbol` o clases abstractas) para desacoplar casos de uso de implementaciones.

---

## 2. Principios de Diseño: SOLID, DRY & Reglas Contables

- **SOLID Estricto:**
  - **S:** Clases, funciones y componentes con una única razón para cambiar.
  - **O:** Extensión mediante interfaces, puertos y adaptadores; evitar modificar código existente probado.
  - **L:** Implementaciones de repositorios y servicios 100% intercambiables (producción vs testing).
  - **I:** Interfaces pequeñas y cohesivas; no obligar a implementar métodos innecesarios.
  - **D:** Módulos de alto nivel dependen de abstracciones, nunca de detalles de bajo nivel.
- **DRY (Don't Repeat Yourself - ¡DRY, DRY, DRY!):**
  - **Única Fuente de Verdad:** Esquemas Zod, tipos TypeScript inferidos (`z.infer`), enums, constantes y utilidades financieras residen exclusivamente en `@sistema-contable/shared`.
  - Prohibida la duplicación de tipos, contratos o validaciones entre backend y frontend.
  - Reutilizar helpers y componentes existentes antes de crear nuevos.
- **Reglas Contables:**
  - **Partida Doble:** Toda transacción debe balancear estrictamente: $$\sum \text{Debe} = \sum \text{Haber}$$.
  - **Inmutabilidad:** Asientos asentados no se modifican ni eliminan; se corrigen mediante reversiones o ajustes.
  - **Cero Magic Strings:** Estados, tipos de cuenta y roles deben usar enums o constantes de `shared/`.

---

## 3. Frontend: Next.js 16 + React 19 + Tailwind CSS

### 3.1 Arquitectura de Componentes

- **Server Components por defecto:** Todo componente es de servidor salvo necesidad interactiva.
- **Client Components (`'use client'`):** Restringidos estrictamente a hojas del árbol con estado (`useState`), efectos (`useEffect`), listeners o consumo de browser APIs.
- **Separación UI / Negocio:** Componentes presentacionales (`components/ui/`) desacoplados de lógica; Custom Hooks para estado y side-effects; llamadas API centralizadas en `services/`.

### 3.2 Tailwind CSS y Estándares de Diseño

- **Prohibición de Valores Arbitrarios (No Magic Numbers):**
  - **PROHIBIDO** el uso de brackets arbitrarios (`w-[500px]`, `h-[300px]`, `text-[13px]`, `p-[18px]`, `bg-[#1a2b]`).
  - Usar la escala estándar de Tailwind (`max-w-md`, `max-w-xl`, `w-full`, múltiplos de 4px: `p-2`, `p-4`, `gap-3`, etc.).
  - Dimensiones estructurales fijas repetitivas (ej. ancho de sidebar) se declaran como variables CSS en `globals.css`, nunca inline.
- **Mobile-First & Cero Clipping:**
  - Diseño base para móviles (`320px`+) con modificadores responsivos progresivos (`sm:`, `md:`, `lg:`).
  - Prohibido el scroll horizontal y prohibido tapar layouts rotos con `overflow-x-hidden`.
  - Formularios adaptables: bottom sheets en móvil, tablas y grids fluidos en escritorio.
- **Tokens Semánticos de Color:**
  - Usar variables de `globals.css` (`bg-background`, `text-foreground`, `bg-card`, `bg-muted`, `border-border`, `bg-primary`, etc.). Prohibido hardcodear colores HEX inline.
- **Composición con `cn()`:** Toda clase condicional o extensible debe componerse con `cn(...)` (`lib/utils.ts`).

### 3.3 Ergonomía Contable y Accesibilidad (a11y)

- **Alineación Tabular (`tabular-nums`):** Obligatorio en todo importe o saldo monetario para alineación vertical precisa de dígitos.
- **Alineación Financiera:** Débitos, Créditos y Saldos alineados a la derecha (`text-right`); conceptos y cuentas a la izquierda (`text-left`).
- **Semántica Neutral:** No usar verde/rojo para Debe/Haber; usar etiquetas y badges neutros.
- **Inputs Monetarios:** `inputMode="decimal"` (o `numeric` según `decimalPlaces` de la moneda); formatear vía `formatCurrency(...)`.
- **Accesibilidad:**
  - Focus visible accesible (`focus-visible:ring-2 focus-visible:ring-ring`).
  - Touch targets $\ge 44$px en móviles (`h-11` o padding adecuado).
  - Soporte de teclado fluido (`Tab`, `Shift+Tab`) y atajo para asentar (`Ctrl+Enter`).
  - Skeletons para carga (cero CLS) y empty states claros con CTA.

---

## 4. Quality Gates y Criterios de Aceptación (Definition of Done)

Ninguna tarea se considera completa ni entregable si no supera el 100% de estas verificaciones:

1. **ESLint:** `0 errors` y `0 warnings` con `npm run lint`. Prohibido `eslint-disable` sin justificación crítica documentada.
2. **Prettier:** Código 100% formateado con `npm run format:check` (corregir con `npm run format`).
3. **Type-Check:** Cero errores de tipos en todos los workspaces con `npm run type-check`. Cero uso de `any` injustificado.
4. **Tests en Verde:** Suite completa en verde con `npm test`. Cobertura obligatoria del 100% en motores de cálculo financiero y balance contable.

---

## 5. Comando Único de Validación

Antes de reportar una tarea como completada, ejecutar obligatoriamente:

```bash
npm run validate
```

_(Ejecuta: `npm run type-check && npm run lint && npm test`)_.
