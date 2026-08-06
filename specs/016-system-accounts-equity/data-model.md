# Data Model: Integration of Equity System Accounts and Fiscal Year Closing

## Entity Modifications

### 1. `Account` Entity / Model

#### Domain Model (`backend/src/domain/ledger/ledger.model.ts`)

```typescript
export type SystemRole = 'NET_INCOME' | 'RETAINED_EARNINGS';

export class Account {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly name: string,
    public readonly type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE',
    public readonly currencyId: string,
    public readonly parentId?: string,
    public readonly status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE',
    public readonly metadata?: Record<string, any>,
    public readonly systemRole?: SystemRole | null,
  ) {}
}
```

#### TypeORM Entity (`backend/src/infrastructure/database/entities/account.entity.ts`)

```typescript
@Entity('accounts')
@Index(['userId', 'name'], { unique: true })
@Index(['userId', 'systemRole'], { unique: true, where: 'system_role IS NOT NULL' })
export class AccountEntity {
  // ... existing columns ...

  @Column({ name: 'system_role', type: 'varchar', length: 30, nullable: true })
  systemRole: SystemRole | null;
}
```

### 2. Shared Types (`shared/src/index.ts`)

```typescript
export const SystemRoleSchema = z.enum(['NET_INCOME', 'RETAINED_EARNINGS']).nullable().optional();
export type SystemRole = 'NET_INCOME' | 'RETAINED_EARNINGS';

export const CreateAccountRequestSchema = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  currencyId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  isCashOrBank: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  systemRole: SystemRoleSchema,
});

export const CloseFiscalYearRequestSchema = z.object({
  retainedEarningsAccountId: z.string().uuid().optional(),
});
```

## State Transitions & Validation Rules

1. **System Role Uniqueness**: A `userId` can have at most one account with `systemRole = 'NET_INCOME'` and at most one with `systemRole = 'RETAINED_EARNINGS'`.
2. **Mandatory Type Constraints**:
   - Account with `systemRole = 'NET_INCOME'` MUST have `type = 'EQUITY'`.
   - Account with `systemRole = 'RETAINED_EARNINGS'` MUST have `type = 'EQUITY'`.
3. **Zero Balance Omission Rule**:
   - In Balance Sheet generation, accounts with `systemRole != null` AND `Math.abs(balance) < 0.0001` are omitted from the reported `equity` node list.
