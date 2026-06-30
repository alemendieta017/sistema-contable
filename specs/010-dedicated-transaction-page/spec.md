# Feature Specification: Dedicated Transaction Entry Page & Operations

**Feature Branch**: `010-dedicated-transaction-page`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "/speckit-specify quiero refactorizar el formulario de carga de asiento contable. quiero que sea una pantalla dedicada para darle mas importancia y aprovechar mejor el espacio. Debe ser una pantalla fullscreen en mobile. con mejor optimizacion de espacio y una experiencia de UX UI exquisita. /speckit-clarify tambien quiero aumentar la experiencia de manejo de transacciones, quiero que se pueda editar un asiento contable actual. Que tambien se pueda copiar un asiento para tener de base los datos de un asiento. Que se pueda eliminar un asiento sin necesariamente tener que anularlo. tambien quiero aumentar la experiencia de registro de fechas permitiendo tambien setear fecha y hora, no solo el dia de la transaccion"

## Clarifications

### Session 2026-06-30

- **Q1**: How should the date field be initialized when duplicating a transaction? → **A**: Option A - Default to Today's Date. The date input defaults to the current day. Users can change it if needed.
- **Q2**: Should the transaction date support time registration as well? → **A**: Yes, the transaction registration experience must support date and time, not just the day.
- **Q3**: Are there restrictions on editing or deleting transactions from past periods? → **A**: Option A - Unrestricted. Users can edit or delete any transaction in the ledger at any time since there is no closed period/fiscal year feature.
- **Q4**: Should changing the date and time of an existing transaction be allowed when editing? → **A**: Option A - Fully Editable Date/Time. Users can modify the transaction date/time to any value.




## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dedicated Desktop Transaction Screen (Priority: P1)

As a desktop user or professional accountant, I want to record journal entries on a dedicated, spacious page rather than a constrained modal, so that I can see all accounts, amounts, date, and description clearly with optimal screen utilization.

**Why this priority**: Core requirement. Transitioning from a modal-based design to a dedicated desktop workspace ensures readability and scalability for complex multi-line journal entries.

**Independent Test**: Navigate to `/transactions/new` (or click "Nueva Transacción" on the Sidebar or page header). Verify that a dedicated full-page editor loads, utilizing the wide grid grid spacing.

**Acceptance Scenarios**:
1. **Given** I click the "Nueva Transacción" button on the sidebar, **When** the page loads, **Then** I am navigated to `/transactions/new` showing a spacious layout with transaction headers (Date, Description) and entry rows.
2. **Given** the dedicated screen, **When** I fill out the transaction and click "Guardar Asiento", **Then** the transaction is persisted, a success indicator is shown, and I am redirected back to the `/transactions` view.
3. **Given** I am editing on desktop, **When** I click "Cancelar", **Then** I am returned to the previous transactions list page.

---

### User Story 2 - Fullscreen Mobile Form Experience (Priority: P1)

As a mobile user, I want a fullscreen, distraction-free transaction loading experience that hides the general navigation sidebar/headers and focuses entirely on the entry form, so that I can easily enter transactions on-the-go without visual clutter.

**Why this priority**: Required for mobile usability. Fits the user's specific request for a "fullscreen mobile screen" to optimize constrained vertical space.

**Independent Test**: Resize the browser to a mobile width (< 640px) or use a phone. Open `/transactions/new`. Verify that the layout takes 100% of the viewport height and the standard app layout navigation elements are hidden, presenting a dedicated mobile layout.

**Acceptance Scenarios**:
1. **Given** a mobile viewport, **When** I open the transaction page, **Then** the main sidebar and top headers are hidden, and a fullscreen sheet view appears with a mobile-optimized header (e.g. Back/Cancel icon and a visual Save trigger).
2. **Given** the mobile view, **When** I tap to choose an account, **Then** a searchable selection drawer or dropdown overlay appears, optimized for touch inputs.
3. **Given** a mobile view, **When** I scroll vertically, **Then** the bottom action bar (containing total Debe, total Haber, difference, and the Submit button) remains sticky at the bottom of the screen or behaves cleanly.

---

### User Story 3 - Exquisite UX/UI & Micro-interactions (Priority: P2)

As a power user, I want autocomplete accounts, smart defaults (e.g. automatic opposite type selection and prefilled balancing amount), clean inline validation, and smooth animations, so that the data entry process feels premium, responsive, and prevents entry errors.

**Why this priority**: Aligns with the user's request for an "exquisite UX/UI experience" and better space optimization.

**Independent Test**: Focus on the input fields, press tab, add rows, observe the balancing values update instantly with smooth transitions, and verify visual markers.

**Acceptance Scenarios**:
1. **Given** a transaction with an active unbalanced difference (e.g., Debe = 1,000, Haber = 0), **When** I click "Agregar Apunte", **Then** the new line is added with "HABER" selected automatically, and the amount field is pre-filled with the difference of `1,000`.
2. **Given** a new entry row is added or removed, **When** the list changes, **Then** the row animates in or out smoothly (e.g. slide-in/fade-in) instead of popping instantly.
3. **Given** the transaction is perfectly balanced, **When** the status changes, **Then** the difference indicator turns green with a checkmark and the save button is animated to its active, enabled state.

---

### User Story 4 - Editing Existing Transactions (Priority: P2)

As a user, I want to edit the details of an existing transaction using the dedicated screen, so that I can correct errors directly instead of having to cancel and recreate it.

**Why this priority**: Highly requested enhancement to improve transaction management flexibility.

**Independent Test**: Click the "Edit" button on a transaction card/row on `/transactions`. Verify it navigates to the dedicated transaction page loaded with that transaction's date, description, and entries, allowing modifications.

**Acceptance Scenarios**:
1. **Given** an existing transaction, **When** I click its "Editar" button, **Then** I am redirected to `/transactions/edit/:id` (or `/transactions/new?edit=:id`) with all inputs populated with the current transaction data.
2. **Given** a transaction loading for editing, **When** I modify fields and click "Guardar", **Then** the updates are saved via a `PUT` request and I am returned to the transactions list showing the modified values.

---

### User Story 5 - Copying/Duplicating Transactions (Priority: P2)

As a user, I want to copy an existing transaction as a template to create a new transaction quickly, saving time for repetitive entries.

**Why this priority**: Speeds up repetitive work by eliminating manual input for recurring transaction structures.

**Independent Test**: Click "Copiar" on an existing transaction. Verify it navigates to `/transactions/new?cloneFrom=:id`, prefilling description and entry lines, while setting the date to the current date.

**Acceptance Scenarios**:
1. **Given** an existing transaction, **When** I click "Copiar", **Then** I navigate to `/transactions/new?cloneFrom=:id`, and all fields (description, accounts, entries) are pre-loaded, but saving it creates a brand new transaction.
2. **Given** the copy page loads, **When** the form initializes, **Then** the transaction date defaults to the current date instead of the source transaction's date, allowing immediate saving.

---

### User Story 6 - Permanent Deletion (Priority: P2)

As a user, I want to delete a transaction completely from the ledger if it was entered in error, without generating a reversal transaction, to keep my reports clean.

**Why this priority**: Crucial for cleaning up wrong entries during setup or manual reconciliation.

**Independent Test**: Click the "Eliminar" button on a transaction, confirm the action, and verify the transaction disappears from list views and ledger totals.

**Acceptance Scenarios**:
1. **Given** a transaction list, **When** I click "Eliminar" on a transaction, **Then** a confirmation dialog is displayed.
2. **Given** the confirmation dialog, **When** I confirm, **Then** the transaction is permanently deleted (via `DELETE /api/transactions/:id`) and list balances are updated.

---

### Edge Cases

- **No Internet / Save Failure**: If saving fails due to a network or validation error from the backend, the screen must display the error clearly without losing any user input, allowing them to fix and retry.
- **Many Row Items**: If a transaction has more than 5-10 entries, the form must not expand the page indefinitely. The layout should handle list expansion gracefully (e.g., scrollable area or standard page flow that keeps total banners visible).
- **Accidental Navigation**: If a user has entered data and tries to navigate away (by clicking Back or Cancel), the system should show a confirmation prompt to prevent loss of draft data.
- **Modifying Reversals**: A reversed/reversal transaction should not be editable to maintain transaction integrity. The "Editar" button MUST be hidden or disabled for reversed transactions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement a dedicated route at `/transactions/new` for recording accounting entries.
- **FR-050**: The old `TransactionModal` trigger inside the sidebar, header, and floating actions MUST be updated to navigate the user to `/transactions/new`.
- **FR-002**: On desktop viewports (>= 640px), the page layout MUST use a clean card-based structural system with a sidebar or top section for metadata (date, glosa/concept) and a central wide table for entry rows.
- **FR-003**: On mobile viewports (< 640px), the page MUST render in fullscreen mode, hiding the global sidebar, global header, and tab navigation.
- **FR-004**: On mobile viewports, the entry rows MUST be rendered in a touch-friendly stacked design or high-density vertical layout, ensuring they don't scroll horizontally.
- **FR-005**: Account selection MUST support interactive searching/autocompletion (Combobox pattern) to make account selection fast without scrolling through a long dropdown.
- **FR-006**: The page MUST calculate totals dynamically on the client side:
  - Total Debits (Debe)
  - Total Credits (Haber)
  - Difference (absolute difference between debits and credits)
- **FR-007**: The "Guardar" button MUST be disabled if the transaction is unbalanced (Difference > 0) or contains empty required fields.
- **FR-008**: The screen design MUST follow modern high-end UI patterns: custom fonts, glassmorphism card styles, subtle gradients, and animated feedback states (using TailwindCSS and Lucide React icons).
- **FR-009**: The system MUST support editing existing transactions. A route `/transactions/edit/:id` (or query param `/transactions/new?edit=:id`) will load the transaction details in the dedicated entry page. Saving will call `PUT /api/transactions/:id`.
- **FR-010**: The system MUST support cloning/copying transactions. The route `/transactions/new?cloneFrom=:id` will prefill all fields except the date, which defaults to today. Saving will create a new transaction (`POST /api/transactions`).
- **FR-011**: The system MUST support permanently deleting transactions via a `DELETE /api/transactions/:id` endpoint.
- **FR-012**: Deletion of any transaction MUST require an explicit user confirmation dialog to avoid accidental data loss.
- **FR-013**: The transaction entry page MUST allow setting both the date and time of the transaction (using a datetime-local input field or equivalent), and properly parse and persist the full timestamp.


### Key Entities

- **JournalEntryTransaction**: The overall transaction payload:
  - `id`: Optional unique identifier (provided when editing).
  - `date`: ISO timestamp string containing both date and time (with timezone).
  - `description`: The concept/glosa.
  - `entries`: Array of journal entry lines.
- **JournalEntryLine**: Individual debit or credit line:
  - `accountId`: The associated account.
  - `entryType`: "DEBIT" or "CREDIT".
  - `amount`: Numeric value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The dedicated transaction screen utilizes 100% of the container width on desktop, fitting at least 8 columns/actions comfortably.
- **SC-002**: On mobile, the interface uses 100% of the viewport height with custom top and bottom action bars, preventing standard screen navigation from overlapping the workspace.
- **SC-003**: Client-side arithmetic and balance checking are computed and displayed instantly (<50ms) upon any change to row values.
- **SC-004**: Navigating away from a dirty form (with edited fields) shows a warning dialog to prevent data loss.

## Assumptions

- The backend transaction creation API `POST /api/transactions` will be consumed as-is. New API endpoints `GET /api/transactions/:id`, `PUT /api/transactions/:id`, and `DELETE /api/transactions/:id` will be introduced.
- The default base currency (e.g. USD, PYG) is fetched and applied to formatting and placeholders on the dedicated page.
- Standard TailwindCSS v4 classes are used for the UI layout and styling.
- Editing and deleting transactions is unrestricted across all historical dates, since no period locking or closure rules are currently enforced in the database model.


