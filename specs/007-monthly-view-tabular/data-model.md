# Data Model: Monthly View Tabular Format

No database schema modifications are required for this feature, as all calculations are computed on the client side based on the retrieved transaction list.

However, the client-side component aggregates transaction entries into the following structured data shape to render each table row:

## Monthly Aggregation Interface

```typescript
interface MonthlySummaryRow {
  monthIndex: number;      // 0 to 11 (representando de Enero a Diciembre)
  monthName: string;       // Nombre legible en español (e.g. "Enero")
  income: number;          // Suma de montos base de tipo CREDIT para cuentas INCOME
  expense: number;         // Suma de montos base de tipo DEBIT para cuentas EXPENSE
  net: number;             // Balance Neto (income - expense)
  txCount: number;         // Cantidad total de transacciones registradas en el mes
}
```

## Calculation Rules

1. **Transaction Inclusion**:
   - Only include transactions whose date matches the selected year: `new Date(tx.date).getFullYear() === selectedYear`.
   - Exclude reversed transactions: `tx.status !== "REVERSED"`.

2. **Income Entry Summation**:
   - Entry must be `CREDIT` type and belong to an `INCOME` account.
   - Use `entry.amountBase` if present (multi-currency handling), otherwise fallback to `entry.amount`.

3. **Expense Entry Summation**:
   - Entry must be `DEBIT` type and belong to an `EXPENSE` account.
   - Use `entry.amountBase` if present, otherwise fallback to `entry.amount`.
