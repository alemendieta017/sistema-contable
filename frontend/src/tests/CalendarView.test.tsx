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

  test('should render transaction flow in the correct day cell based on local timezone', () => {
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

    render(
      <CalendarView
        transactions={transactions}
        baseCurrency={baseCurrency}
        currentDate={new Date('2026-06-15T12:00:00.000Z')}
      />
    );

    const localDay1 = new Date(transactions[0].date).getDate();
    const localDay2 = new Date(transactions[1].date).getDate();

    const day1Cells = screen.getAllByText(String(localDay1));
    expect(day1Cells.length).toBeGreaterThan(0);
    expect(screen.getByText('+u$s 500.000,00')).toBeInTheDocument();

    const day2Cells = screen.getAllByText(String(localDay2));
    expect(day2Cells.length).toBeGreaterThan(0);
    expect(screen.getByText('-u$s 150,00')).toBeInTheDocument();
  });
});
