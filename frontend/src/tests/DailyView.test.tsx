import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DailyView from '../components/DailyView';

describe('DailyView Sorting Order', () => {
  const baseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };
  const mockOnReverse = jest.fn();
  const mockOnDelete = jest.fn();

  test('should render transactions of the same day in descending order by createdAt', () => {
    const transactions = [
      {
        id: 'tx-1',
        accountingDate: '2026-08-04',
        createdAt: '2026-08-04T10:00:00.000Z',
        description: 'Asiento inicial',
        entries: [
          {
            id: 'e-1',
            accountId: 'acc-1',
            entryType: 'DEBIT' as const,
            amount: 500,
            account: { id: 'acc-1', name: 'Caja', type: 'ASSET' },
          },
          {
            id: 'e-2',
            accountId: 'acc-2',
            entryType: 'CREDIT' as const,
            amount: 500,
            account: { id: 'acc-2', name: 'Capital', type: 'EQUITY' },
          },
        ],
      },
      {
        id: 'tx-2',
        accountingDate: '2026-08-04',
        createdAt: '2026-08-04T14:30:00.000Z',
        description: 'Salario',
        entries: [
          {
            id: 'e-3',
            accountId: 'acc-3',
            entryType: 'DEBIT' as const,
            amount: 1500,
            account: { id: 'acc-3', name: 'Sueldos', type: 'EXPENSE' },
          },
          {
            id: 'e-4',
            accountId: 'acc-1',
            entryType: 'CREDIT' as const,
            amount: 1500,
            account: { id: 'acc-1', name: 'Caja', type: 'ASSET' },
          },
        ],
      },
    ];

    render(
      <DailyView
        transactions={transactions}
        onReverse={mockOnReverse}
        onDelete={mockOnDelete}
        baseCurrency={baseCurrency}
      />,
    );

    const asientoElem = screen.getByText('Asiento inicial');
    const salarioElem = screen.getByText('Salario');

    expect(asientoElem).toBeInTheDocument();
    expect(salarioElem).toBeInTheDocument();

    // Check DOM position: Salario (created later at 14:30) must appear before Asiento inicial (created at 10:00)
    const positionCompare = salarioElem.compareDocumentPosition(asientoElem);
    expect(positionCompare & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
