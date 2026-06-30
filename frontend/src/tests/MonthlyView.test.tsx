import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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
    const onYearChange = jest.fn();
    render(
      <MonthlyView
        transactions={[]}
        baseCurrency={baseCurrency}
        currentYear={2026}
        onYearChange={onYearChange}
      />
    );
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  test('should call onYearChange when prev/next buttons are clicked', () => {
    const onYearChange = jest.fn();
    render(
      <MonthlyView
        transactions={[]}
        baseCurrency={baseCurrency}
        currentYear={2026}
        onYearChange={onYearChange}
      />
    );

    const prevButton = screen.getAllByRole('button')[0];
    const nextButton = screen.getAllByRole('button')[1];

    fireEvent.click(prevButton);
    expect(onYearChange).toHaveBeenCalledWith(2025);

    fireEvent.click(nextButton);
    expect(onYearChange).toHaveBeenCalledWith(2027);
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

    const onYearChange = jest.fn();
    render(
      <MonthlyView
        transactions={transactions}
        baseCurrency={baseCurrency}
        currentYear={2026}
        onYearChange={onYearChange}
      />
    );

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

    const m1Row = screen.getByText(m1Name).closest('tr');
    const m2Row = screen.getByText(m2Name).closest('tr');

    expect(m1Row).toBeInTheDocument();
    expect(m2Row).toBeInTheDocument();

    expect(m1Row).toHaveTextContent('u$s 1.000,00');
    expect(m2Row).toHaveTextContent('u$s 200,00');
  });
});
