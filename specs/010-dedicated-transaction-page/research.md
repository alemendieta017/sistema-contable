# Research: Dedicated Transaction Entry Page & Operations

## 1. Routing & Page Modes (Frontend)

To implement the dedicated transaction screen with maximum code reuse and consistency, we will create a single page component at `frontend/src/app/transactions/new/page.tsx`. This page will dynamically adapt to three modes based on query parameters:

- **Create Mode**: Loaded via `/transactions/new` (defaults to blank form, current date/time).
- **Edit Mode**: Loaded via `/transactions/new?edit=:id` (fetches existing transaction from `GET /api/transactions/:id`, populates all fields, save button calls `PUT /api/transactions/:id`).
- **Clone Mode**: Loaded via `/transactions/new?cloneFrom=:id` (fetches existing transaction, populates description and entry lines, but sets date to the current date/time. Save button calls `POST /api/transactions`).

This avoids duplicate UI pages for creating, editing, and cloning.

## 2. API Design & Use Cases (Backend)

We will introduce three new API endpoints to handle single transaction retrieval, updates, and deletion.

### Endpoints
- `GET /api/transactions/:id`: Retrieve details of a specific transaction including its journal entries.
- `PUT /api/transactions/:id`: Update a transaction's details and journal entries.
- `DELETE /api/transactions/:id`: Permanently delete a transaction.

### Domain Rules & Restrictions
- **Immutability of Reversals**: A reversed transaction (`status === 'REVERSED'`) or a transaction that is a reversal itself (`reversalOfId !== null`) must NOT be editable. Attempting to call `PUT` on these will return `400 Bad Request`.
- **Cascade Deletion**: TypeORM relational mapping defines `onDelete: 'CASCADE'` for `journal_entries` pointing to `transactions`. Thus, deleting a transaction entity automatically deletes its associated journal entries at the database level.
- **Double-Entry Constraint**: Updates must satisfy the double-entry balancing rule (`sum(debits) === sum(credits)`) across base currency rates, validated inside a `SERIALIZABLE` database transaction.

## 3. Date & Time Persistence

The transaction entry page needs to allow setting both the date and time using a `<input type="datetime-local">` field.
We will add `formatLocalDateTimeWithOffset` to `frontend/src/lib/utils.ts` to convert the `YYYY-MM-DDTHH:MM` format of `datetime-local` into an ISO string with the client's timezone offset:

```typescript
export function formatLocalDateTimeWithOffset(dateTimeStr: string): string {
  if (!dateTimeStr || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateTimeStr)) {
    return dateTimeStr;
  }
  const [datePart, timePart] = dateTimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute);

  const offsetMinutes = localDate.getTimezoneOffset();
  const sign = offsetMinutes > 0 ? '-' : '+';
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mins = String(absOffset % 60).padStart(2, '0');
  const offsetStr = `${sign}${hours}:${mins}`;

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const formattedHour = String(hour).padStart(2, '0');
  const formattedMinute = String(minute).padStart(2, '0');
  return `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00.000${offsetStr}`;
}
```

This ensures the backend parses and stores the exact datetime provided.

## 4. Mobile Fullscreen Mode

Using Next.js App Router, we will update `frontend/src/components/MainLayout.tsx` to detect if the user is on the dedicated entry route:

```typescript
const isTransactionEntryPage = pathname === "/transactions/new" || pathname?.startsWith("/transactions/new/");
```

If active, we will apply classes to hide layout bars on mobile viewports (< 640px):
- Header: hidden on mobile, visible on desktop (`hidden sm:block`)
- Sidebar: hidden on mobile, visible on desktop (already `hidden lg:flex` by default)
- BottomNav: completely hidden (`{!isTransactionEntryPage && <BottomNav />}`)
- FloatingActionButton: completely hidden (`{!isTransactionEntryPage && <FloatingActionButton />}`)
- Main Container: remove page padding on mobile (`p-0 sm:p-6 lg:p-8`) to occupy 100% viewport width and height.

## 5. Accidental Navigation Prevention

To avoid losing draft data, we will hook into the window's `beforeunload` event to prompt users if they have modified any form fields:

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

For client-side SPA navigation inside Next.js, we will intercept cancel button clicks or back buttons to show an inline confirmation dialog.
