# Data Model Design

No backend data model or database schema modifications are required for this feature. 

## Client-Side State and Persistence

### ThemePreference
- **Data Type**: String enum (`"light" | "dark"`)
- **Persistence**: Persisted in `localStorage` under the key `"theme"`.
- **Initialization**: Loaded on client-side mount, falling back to system preference (`prefers-color-scheme`).

### Chart Datasets
- Recharts requires structured JavaScript objects for data binding, which are mapped from the API responses:
  - **PieChart**: `Array<{ name: string, value: number, percentage: number }>`
  - **NetWorthChart**: `Array<{ date: string, balance: number }>`
  - **IncomeStatementChart**: `Array<{ monthName: string, income: number, expense: number }>`
