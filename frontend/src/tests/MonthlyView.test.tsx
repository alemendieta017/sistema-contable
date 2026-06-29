import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import MonthlyView from '../components/MonthlyView';

describe('MonthlyView Local Timezone Grouping', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const baseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };

  test('should render current year summary header by default', () => {
    render(<MonthlyView transactions={[]} baseCurrency={baseCurrency} />);
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  test('should group transactions under correct local months according to system timezone', () => {
    const transactions = [
      {
        id: 'tx-1',
        date: '2026-06-01T04:00:00.000Z', // In UTC-4, this is Jun 1, 00:00:00. In UTC, this is Jun 1, 04:00:00.
        description: 'Ingreso Junio',
        entries: [
          {
            accountId: 'acc-1',
            entryType: 'CREDIT' as const,
            amount: 1000,
            amountBase: 1000,
            account: { type: 'INCOME' },
          },
          {
            accountId: 'acc-2',
            entryType: 'DEBIT' as const,
            amount: 1000,
            amountBase: 1000,
            account: { type: 'ASSET' },
          },
        ],
      },
      {
        id: 'tx-2',
        date: '2026-05-31T23:00:00.000Z', // In UTC-4, this is May 31, 19:00:00. In UTC, this is May 31, 23:00:00.
        description: 'Gasto Mayo',
        entries: [
          {
            accountId: 'acc-2',
            entryType: 'CREDIT' as const,
            amount: 200,
            amountBase: 200,
            account: { type: 'ASSET' },
          },
          {
            accountId: 'acc-3',
            entryType: 'DEBIT' as const,
            amount: 200,
            amountBase: 200,
            account: { type: 'EXPENSE' },
          },
        ],
      },
    ];

    render(<MonthlyView transactions={transactions} baseCurrency={baseCurrency} />);

    // Get the expected month for each transaction based on the local Date parsing in the test environment
    const m1Index = new Date(transactions[0].date).getMonth();
    const m2Index = new Date(transactions[1].date).getMonth();

    const months = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const m1Name = months[m1Index];
    const m2Name = months[m2Index];

    // Find table rows corresponding to these months
    const m1Row = screen.getByText(m1Name).closest('tr');
    const m2Row = screen.getByText(m2Name).closest('tr');

    expect(m1Row).toBeInTheDocument();
    expect(m2Row).toBeInTheDocument();

    // Verify m1 row has the income (e.g. u$s 1.000,00)
    expect(m1Row).toHaveTextContent('u$s 1.000,00');

    // Verify m2 row has the expense (e.g. u$s 200,00)
    expect(m2Row).toHaveTextContent('u$s 200,00');
  });
});
