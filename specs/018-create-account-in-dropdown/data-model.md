# Data Model: Quick Account Creation from Account Dropdown

## Entities & Data Structures

### Account (Cuenta Contable)

Represents a ledger account within the company's Chart of Accounts (Plan de Cuentas).

| Attribute      | Type            | Validation Rules                                                     | Description                                                                 |
| -------------- | --------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `id`           | `UUID` (String) | Required, system-generated                                           | Unique identifier for the account                                           |
| `name`         | String          | Required, trimmed, 1-100 chars                                       | Display name of the account (e.g. "Servicios de Internet")                  |
| `type`         | Enum            | Required, one of `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE` | Account category/rubro type                                                 |
| `currencyId`   | `UUID` (String) | Required                                                             | Foreign key to `CurrencyEntity` (default base currency, e.g. PYG)           |
| `parentId`     | `UUID` (String) | Optional                                                             | Parent account ID for nested income/expense categories                      |
| `isCashOrBank` | Boolean         | Optional, default `false`                                            | Indicates cash/bank account for cash flow statements                        |
| `systemRole`   | Enum / String   | Optional, default `null`                                             | System role (e.g. `NET_INCOME`). Operable accounts must not be `NET_INCOME` |
| `companyId`    | `UUID` (String) | Required                                                             | Multi-tenant tenant ID                                                      |

### Quick Account Creation Request Payload (DTO)

Transmitted from frontend `AccountModal` to `POST /api/accounts`.

```typescript
interface CreateAccountDto {
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currencyId: string;
  parentId?: string | null;
  isCashOrBank?: boolean;
}
```

### Account Selection Callback State (`JournalEntryRow` & Parent Forms)

State maintained in `NewTransactionPage` / `TransactionModal` during inline account creation.

```typescript
interface Account {
  id: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  currencyId: string;
  parentId?: string | null;
  systemRole?: string | null;
}

interface QuickCreateTriggerState {
  lineIndex: number;
  initialName: string;
}
```

## State Transitions & Flow

1. **User interaction in `JournalEntryRow`**: User types non-existent account name or clicks "+ Crear Cuenta".
2. **Modal Invocation**: `quickCreateState` set to `{ lineIndex: index, initialName: search }`; `isAccountModalOpen` set to `true`.
3. **Modal Input & Submit**: `AccountModal` pre-fills `name` with `initialName`, user completes `type` and submits `api.accounts.create(...)`.
4. **Persistence & Response**: Server creates `AccountEntity` linked to active `companyId`, returning created `Account`.
5. **Auto-Selection**: Parent appends `newAccount` to `accounts` state array, updates `entries[lineIndex].accountId = newAccount.id`, and closes `AccountModal`.
6. **Form Continuity**: Transaction form remains open with all existing lines and amounts untouched.
