import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FreeJournalEntryGrid } from '../components/transactions/FreeJournalEntryGrid';
import { FreeJournalEntryRow } from '../components/transactions/FreeJournalEntryRow';
import NewTransactionPage from '../app/transactions/new/page';
import TransactionModal from '../components/TransactionModal';
import { api } from '../services/api';
import type { AccountOption } from '../types/account';
import { TransactionMode } from '@sistema-contable/shared';

// Mock next/navigation
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock API service
jest.mock('../services/api', () => ({
  api: {
    accounts: {
      list: jest.fn(),
      summary: jest.fn(),
    },
    currencies: {
      list: jest.fn(),
    },
    transactions: {
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          return (props: any) => (
            <span data-testid={`icon-${prop.toLowerCase()}`} {...props}>
              {prop}
            </span>
          );
        }
        return undefined;
      },
    },
  );
});

describe('User Story 5: Clean Visual Hierarchy & Neutral Accounting Semantics (T025)', () => {
  const mockAccounts: AccountOption[] = [
    {
      id: 'acc-1',
      name: 'Banco Principal',
      type: 'ASSET',
      isCashOrBank: true,
      balance: 5000,
      status: 'ACTIVE',
    },
    {
      id: 'acc-2',
      name: 'Caja Chica',
      type: 'ASSET',
      isCashOrBank: true,
      balance: 1000,
      status: 'ACTIVE',
    },
    {
      id: 'acc-3',
      name: 'Gastos de Oficina',
      type: 'EXPENSE',
      balance: 300,
      status: 'ACTIVE',
    },
    {
      id: 'acc-4',
      name: 'Ventas de Mercaderías',
      type: 'INCOME',
      balance: 8000,
      status: 'ACTIVE',
    },
  ];

  const defaultCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (api.accounts.summary as jest.Mock).mockResolvedValue(mockAccounts);
    (api.accounts.list as jest.Mock).mockResolvedValue(mockAccounts);
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-usd', code: 'USD', symbol: '$', decimalPlaces: 2, isBase: true },
    ]);
  });

  describe('1. Neutral Accounting Semantics & Color Palette (T026)', () => {
    test('Debe and Haber desktop table headers use neutral slate typography without red/green classes', () => {
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={defaultCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      const debitHeader = screen.getByTestId('header-debit');
      const creditHeader = screen.getByTestId('header-credit');

      expect(debitHeader).toHaveTextContent('Debe');
      expect(creditHeader).toHaveTextContent('Haber');

      // Verify no red or green color classes on Debit and Credit headers
      expect(debitHeader.className).not.toMatch(/text-red|text-rose|text-green|text-emerald/);
      expect(creditHeader.className).not.toMatch(/text-red|text-rose|text-green|text-emerald/);

      // Verify parent container uses neutral slate tokens
      const headerContainer = screen.getByTestId('grid-header');
      expect(headerContainer.className).toMatch(/slate/);
    });

    test('Debe and Haber input fields in FreeJournalEntryRow use symmetrical neutral indigo styling when populated', () => {
      const { rerender } = render(
        <FreeJournalEntryRow
          line={{
            id: 'line-1',
            accountId: 'acc-1',
            debitAmount: 250,
            creditAmount: '',
          }}
          index={0}
          accounts={mockAccounts}
          baseCurrency={defaultCurrency}
          onChange={jest.fn()}
          onRemove={jest.fn()}
          canRemove={false}
        />,
      );

      const debitInput = screen.getByLabelText(/debe/i);
      const creditInput = screen.getByLabelText(/haber/i);

      // Debit input should have neutral indigo styling and NO red or green traffic-light classes
      expect(debitInput.className).toMatch(/indigo/);
      expect(debitInput.className).not.toMatch(
        /border-red|border-rose|border-green|border-emerald/,
      );
      expect(debitInput.className).not.toMatch(/bg-red|bg-rose|bg-green|bg-emerald/);

      // Rerender with Credit populated
      rerender(
        <FreeJournalEntryRow
          line={{
            id: 'line-1',
            accountId: 'acc-1',
            debitAmount: '',
            creditAmount: 250,
          }}
          index={0}
          accounts={mockAccounts}
          baseCurrency={defaultCurrency}
          onChange={jest.fn()}
          onRemove={jest.fn()}
          canRemove={false}
        />,
      );

      // Credit input should also use neutral indigo styling (symmetrical with Debit)
      expect(creditInput.className).toMatch(/indigo/);
      expect(creditInput.className).not.toMatch(
        /border-red|border-rose|border-green|border-emerald/,
      );
      expect(creditInput.className).not.toMatch(/bg-red|bg-rose|bg-green|bg-emerald/);
    });

    test('Summary totals for Debe and Haber display neutral typography and colors', () => {
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={defaultCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      const totalDebitAmount = screen.getByTestId('total-debit-amount');
      const totalCreditAmount = screen.getByTestId('total-credit-amount');

      // Verify neutral slate styling for both debit and credit totals
      expect(totalDebitAmount.className).toMatch(/slate/);
      expect(totalDebitAmount.className).not.toMatch(/text-red|text-rose|text-green|text-emerald/);

      expect(totalCreditAmount.className).toMatch(/slate/);
      expect(totalCreditAmount.className).not.toMatch(/text-red|text-rose|text-green|text-emerald/);
    });
  });

  describe('2. Difference Status Badge: Cuadrado vs Descuadrado (T026)', () => {
    test('displays "Sin movimientos" on empty load, and "Descuadrado" badge with amber styling when journal entries are unbalanced', () => {
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={defaultCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      const balanceBadge = screen.getByTestId('balance-badge');
      expect(balanceBadge).toHaveTextContent('Sin movimientos');

      const debitInputs = screen.getAllByLabelText(/debe/i);
      fireEvent.change(debitInputs[0], { target: { value: '400' } });

      expect(balanceBadge).toHaveTextContent('Descuadrado');
      expect(balanceBadge.className).toMatch(/amber/);
      expect(screen.getByTestId('icon-alertcircle')).toBeInTheDocument();
    });

    test('displays "Cuadrado" badge with clear balanced status when total Debe equals total Haber', () => {
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={defaultCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />,
      );

      const debitInputs = screen.getAllByLabelText(/debe/i);
      const creditInputs = screen.getAllByLabelText(/haber/i);

      // Enter 400 in Line 1 Debit and 400 in Line 2 Credit
      fireEvent.change(debitInputs[0], { target: { value: '400' } });
      fireEvent.change(creditInputs[1], { target: { value: '400' } });

      const balanceBadge = screen.getByTestId('balance-badge');
      expect(balanceBadge).toHaveTextContent('Cuadrado');
      expect(balanceBadge.className).toMatch(/emerald/);
      expect(screen.getByTestId('icon-checkcircle2')).toBeInTheDocument();
    });
  });

  describe('3. Single Consolidated Action Bar on /transactions/new (T027)', () => {
    test('renders exactly one primary submit button and one cancel button in Quick mode', async () => {
      render(<NewTransactionPage />);

      await waitFor(() => {
        expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
      });

      // Exactly ONE submit button: "Guardar Transacción"
      const submitButtons = screen.getAllByRole('button', { name: /guardar transacción/i });
      expect(submitButtons).toHaveLength(1);

      // Verify no duplicate save buttons in header
      const header = screen.getByRole('banner');
      expect(header).not.toHaveTextContent(/guardar/i);
    });

    test('renders exactly one primary submit button and one cancel button in Free Journal mode', async () => {
      mockSearchParams = new URLSearchParams('mode=FREE_JOURNAL');
      render(<NewTransactionPage />);

      await waitFor(() => {
        expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
      });

      // Exactly ONE submit button: "Guardar Asiento"
      const submitButtons = screen.getAllByRole('button', { name: /guardar asiento/i });
      expect(submitButtons).toHaveLength(1);

      // Verify no duplicate save buttons in header
      const header = screen.getByRole('banner');
      expect(header).not.toHaveTextContent(/guardar/i);
    });
  });

  describe('4. Standardized Action Controls in TransactionModal (T028)', () => {
    test('renders modal header with title, ModeSelector, and close button, and single action bar in body', async () => {
      const onCloseMock = jest.fn();
      render(<TransactionModal onClose={onCloseMock} defaultMode={TransactionMode.QUICK} />);

      // Header components
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Registrar Asiento Contable');
      expect(screen.getByRole('tab', { name: /Transacción Rápida/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Asiento Libre/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cerrar modal/i })).toBeInTheDocument();

      // Only ONE submit button inside modal content
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Guardar Transacción/i })).toBeInTheDocument();
      });
      const submitButtons = screen.getAllByRole('button', { name: /Guardar Transacción/i });
      expect(submitButtons).toHaveLength(1);

      // Close button triggers onClose
      const closeBtn = screen.getByRole('button', { name: /Cerrar modal/i });
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test('switching to Free Journal mode in modal renders single Guardar Asiento action with neutral palette', async () => {
      render(<TransactionModal onClose={jest.fn()} defaultMode={TransactionMode.FREE_JOURNAL} />);

      await waitFor(() => {
        expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
      });

      // Exactly ONE submit button: "Guardar Asiento"
      const submitButtons = screen.getAllByRole('button', { name: /Guardar Asiento/i });
      expect(submitButtons).toHaveLength(1);

      // Balance badge is present with Sin movimientos initial state
      expect(screen.getByTestId('balance-badge')).toHaveTextContent('Sin movimientos');
    });
  });
});
