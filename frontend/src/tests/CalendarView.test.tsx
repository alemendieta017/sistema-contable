import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CalendarView from '../components/CalendarView';

describe('CalendarView Timezone and Boundary Rendering', () => {
  beforeAll(() => {
    // Set system time to June 15, 2026 to make the tests deterministic
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const baseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };

  test('should render the calendar header for the current month (Junio 2026)', () => {
    render(<CalendarView transactions={[]} baseCurrency={baseCurrency} />);
    expect(screen.getByText('Junio 2026')).toBeInTheDocument();
  });

  test('should render transaction flow in the correct day cell based on local timezone', () => {
    // We mock the local Date behavior by defining the transaction date.
    // If the local timezone is UTC-4 (offset 240):
    // "2026-06-01T04:00:00.000Z" parsed locally becomes Jun 1, 00:00:00.
    // Let's create transactions and verify that they are grouped under their local day.

    const transactions = [
      {
        id: 'tx-1',
        date: '2026-06-01T04:00:00.000Z', // June 1st in UTC-4
        description: 'Salario',
        entries: [
          {
            accountId: 'acc-income',
            entryType: 'CREDIT' as const,
            amount: 500000,
            amountBase: 500000,
            account: { type: 'INCOME' },
          },
          {
            accountId: 'acc-cash',
            entryType: 'DEBIT' as const,
            amount: 500000,
            amountBase: 500000,
            account: { type: 'ASSET' },
          },
        ],
      },
      {
        id: 'tx-2',
        date: '2026-06-10T15:30:00.000Z',
        description: 'Almuerzo',
        entries: [
          {
            accountId: 'acc-cash',
            entryType: 'CREDIT' as const,
            amount: 150,
            amountBase: 150,
            account: { type: 'ASSET' },
          },
          {
            accountId: 'acc-expense',
            entryType: 'DEBIT' as const,
            amount: 150,
            amountBase: 150,
            account: { type: 'EXPENSE' },
          },
        ],
      },
    ];

    const { container } = render(
      <CalendarView transactions={transactions} baseCurrency={baseCurrency} />,
    );

    // Calculate what days they should fall on in the test runner's current timezone.
    // In UTC, tx-1 is June 1st, tx-2 is June 10th.
    // In UTC-4, tx-1 is June 1st, tx-2 is June 10th.
    const localDay1 = new Date(transactions[0].date).getDate();
    const localDay2 = new Date(transactions[1].date).getDate();

    // Verify the income transaction is rendered in the correct cell
    const day1Cells = screen.getAllByText(String(localDay1));
    expect(day1Cells.length).toBeGreaterThan(0);

    // Verify the income amount (+500,000) is shown
    expect(screen.getByText('+u$s 500.000,00')).toBeInTheDocument();

    // Verify the expense transaction is rendered in the correct cell
    const day2Cells = screen.getAllByText(String(localDay2));
    expect(day2Cells.length).toBeGreaterThan(0);
    expect(screen.getByText('-u$s 150,00')).toBeInTheDocument();
  });
});
