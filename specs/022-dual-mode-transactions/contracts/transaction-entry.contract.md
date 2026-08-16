# Interface Contracts: Dual-Mode Transaction Creation

**Feature**: Dual-Mode Transaction Creation & Accounting UX Optimization  
**Branch**: `022-dual-mode-transactions`  
**Date**: 2026-08-16

---

## 1. Shared Monorepo Types & Enums (`shared/src/index.ts`)

```typescript
import { z } from 'zod';

// Mode of transaction entry UI
export enum TransactionMode {
  QUICK = 'QUICK',
  FREE_JOURNAL = 'FREE_JOURNAL',
}
export const TransactionModeSchema = z.nativeEnum(TransactionMode);

// Operation template for Quick Transaction
export enum QuickOperationType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
}
export const QuickOperationTypeSchema = z.nativeEnum(QuickOperationType);

// Journal Entry leg schema
export const JournalEntryRequestSchema = z.object({
  accountId: z.string().uuid(),
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive(),
});
export type JournalEntryRequest = z.infer<typeof JournalEntryRequestSchema>;

// Canonical Transaction creation request
export const CreateTransactionRequestSchema = z.object({
  accountingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  description: z.string().min(1, 'Description is required'),
  entries: z.array(JournalEntryRequestSchema).min(2, 'At least two entries are required'),
});
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;
```

---

## 2. Backend REST API Endpoints

### 2.1 Create Journal Transaction

- **Endpoint**: `POST /api/transactions`
- **Authentication**: Bearer JWT (`JwtAuthGuard`)
- **Isolation Level**: `SERIALIZABLE`
- **Request Body**: `CreateTransactionRequest`
- **Response**: `201 Created`
  ```json
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "accountingDate": "2026-08-16",
    "description": "Pago combustible utilitario",
    "status": "POSTED",
    "entries": [
      {
        "id": "e2a39281-54c3-4d43-982c-49520287a102",
        "accountId": "7b8f9e10-1234-5678-abcd-000000000001",
        "entryType": "DEBIT",
        "amount": 150.0,
        "amountBase": 150.0,
        "rateAtDate": 1.0
      },
      {
        "id": "a9b8c7d6-e5f4-3210-fedc-ba9876543210",
        "accountId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
        "entryType": "CREDIT",
        "amount": 150.0,
        "amountBase": 150.0,
        "rateAtDate": 1.0
      }
    ]
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Unbalanced entries, inactive account, non-operable system account, or closed accounting period.
  - `401 Unauthorized`: Missing or invalid bearer token.
  - `404 Not Found`: Account ID not found for current user.

---

## 3. Frontend Component Contracts & Props

### 3.1 `QuickTransactionForm`

```typescript
export interface QuickTransactionFormProps {
  accounts: AccountOption[];
  baseCurrency: CurrencyInfo;
  initialValues?: Partial<QuickTransactionFormValues>;
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  onQuickCreateAccount: (initialName: string, targetField: 'primary' | 'secondary') => void;
}

export interface QuickTransactionFormValues {
  accountingDate: string;
  operationType: QuickOperationType;
  primaryAccountId: string;
  secondaryAccountId: string;
  amount: number | '';
  description: string;
}
```

---

### 3.2 `FreeJournalEntryGrid`

```typescript
export interface FreeJournalEntryGridProps {
  accounts: AccountOption[];
  baseCurrency: CurrencyInfo;
  initialValues?: Partial<FreeJournalFormValues>;
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  onQuickCreateAccount: (initialName: string, lineIndex: number) => void;
}

export interface FreeJournalFormValues {
  accountingDate: string;
  description: string;
  lines: FreeJournalLineState[];
}

export interface FreeJournalLineState {
  id: string;
  accountId: string;
  debitAmount: number | '';
  creditAmount: number | '';
}
```

---

### 3.3 `AccountPickerSheet`

```typescript
export interface AccountPickerSheetProps {
  accounts: AccountOption[];
  selectedAccountId?: string;
  onSelect: (account: AccountOption) => void;
  allowedTypes?: Array<'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'>;
  filterMode?: 'ALL' | 'PAYMENT_ACCOUNTS' | 'EXPENSES' | 'INCOMES' | 'ASSETS';
  label: string;
  placeholder?: string;
  baseCurrency?: CurrencyInfo;
  onQuickCreateAccount?: (initialName: string) => void;
  error?: string;
  disabled?: boolean;
}
```
