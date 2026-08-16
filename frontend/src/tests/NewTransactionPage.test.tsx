import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewTransactionPage from '../app/transactions/new/page';
import { api } from '../services/api';

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

describe('NewTransactionPage Dual-Mode Integration', () => {
  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Efectivo',
      type: 'ASSET',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
      isCashOrBank: true,
    },
    {
      id: 'acc-2',
      name: 'Comida',
      type: 'EXPENSE',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
    },
    {
      id: 'acc-3',
      name: 'Banco Principal',
      type: 'ASSET',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
      isCashOrBank: true,
    },
    {
      id: 'acc-4',
      name: 'Sueldo',
      type: 'INCOME',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (api.accounts.summary as jest.Mock).mockResolvedValue(mockAccounts);
    (api.accounts.list as jest.Mock).mockResolvedValue(mockAccounts);
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-usd', code: 'USD', symbol: '$', decimalPlaces: 2, isBase: true },
    ]);
  });

  test('should render ModeSelector and default to QuickTransactionForm', async () => {
    render(<NewTransactionPage />);

    await waitFor(() => {
      expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
    });

    expect(screen.getByText(/Nuevo Asiento Contable/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Transacción Rápida/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Asiento Libre/i })).toBeInTheDocument();

    // Default is Quick Mode
    expect(screen.getByRole('tab', { name: /Transacción Rápida/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('should render FreeJournalEntryGrid when query param mode=FREE_JOURNAL is present', async () => {
    mockSearchParams = new URLSearchParams('mode=FREE_JOURNAL');

    render(<NewTransactionPage />);

    await waitFor(() => {
      expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /Asiento Libre/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: /Agregar Apunte/i })).toBeInTheDocument();
  });

  test('should show mode switch confirmation modal if user switches mode after typing in dirty state', async () => {
    render(<NewTransactionPage />);

    await waitFor(() => {
      expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
    });

    // Open quick create or trigger dirty state
    const paymentPickerBtn = screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...');
    fireEvent.click(paymentPickerBtn);
    const quickCreateBtn = await screen.findByText(/Crear nueva cuenta/i);
    fireEvent.click(quickCreateBtn);

    // Cancel quick create (form is marked dirty)
    const cancelBtns = screen.getAllByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);

    // Now try to click "Asiento Libre" mode tab
    const freeTab = screen.getByRole('tab', { name: /Asiento Libre/i });
    fireEvent.click(freeTab);

    // Mode switch confirmation dialog should appear
    expect(screen.getByText('¿Cambiar Modo de Transacción?')).toBeInTheDocument();

    // Click "Seguir en este modo"
    const keepBtn = screen.getByRole('button', { name: /Seguir en este modo/i });
    fireEvent.click(keepBtn);
    expect(screen.queryByText('¿Cambiar Modo de Transacción?')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Transacción Rápida/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Try switching again and confirm
    fireEvent.click(freeTab);
    const confirmBtn = screen.getByRole('button', { name: /Cambiar de Modo/i });
    fireEvent.click(confirmBtn);

    expect(screen.getByRole('tab', { name: /Asiento Libre/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('should load existing transaction in edit mode and submit update', async () => {
    mockSearchParams = new URLSearchParams('edit=tx-123');
    (api.transactions.get as jest.Mock).mockResolvedValue({
      id: 'tx-123',
      accountingDate: '2026-08-16',
      description: 'Gasto de papeleria',
      status: 'POSTED',
      entries: [
        { accountId: 'acc-2', entryType: 'DEBIT', amount: 85 },
        { accountId: 'acc-1', entryType: 'CREDIT', amount: 85 },
      ],
    });
    (api.transactions.update as jest.Mock).mockResolvedValue({ id: 'tx-123' });

    render(<NewTransactionPage />);

    await waitFor(() => {
      expect(api.transactions.get).toHaveBeenCalledWith('tx-123');
    });

    expect(screen.getByText(/Editar Asiento/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: tx-123/i)).toBeInTheDocument();

    // Submit the updated form
    const submitBtn = await screen.findByRole('button', { name: /Guardar Transacción/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.transactions.update).toHaveBeenCalledWith(
        'tx-123',
        expect.objectContaining({
          description: 'Gasto de papeleria',
        }),
      );
    });
  });

  test('should load existing transaction in clone mode and reset date', async () => {
    mockSearchParams = new URLSearchParams('cloneFrom=tx-999');
    (api.transactions.get as jest.Mock).mockResolvedValue({
      id: 'tx-999',
      accountingDate: '2026-01-01',
      description: 'Cuota de membresía',
      status: 'POSTED',
      entries: [
        { accountId: 'acc-2', entryType: 'DEBIT', amount: 120 },
        { accountId: 'acc-1', entryType: 'CREDIT', amount: 120 },
      ],
    });
    (api.transactions.create as jest.Mock).mockResolvedValue({ id: 'new-tx-cloned' });

    render(<NewTransactionPage />);

    await waitFor(() => {
      expect(api.transactions.get).toHaveBeenCalledWith('tx-999');
    });

    expect(screen.getByText(/Clonar Asiento/i)).toBeInTheDocument();

    const submitBtn = await screen.findByRole('button', { name: /Guardar Transacción/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Cuota de membresía',
        }),
      );
    });
  });
});
