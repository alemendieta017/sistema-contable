import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionModal from '../components/TransactionModal';
import { api } from '../services/api';
import { TransactionMode } from '@sistema-contable/shared';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/transactions',
}));

// Mock the API service
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
      create: jest.fn(),
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

describe('TransactionModal Integration', () => {
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
      name: 'Sueldo',
      type: 'INCOME',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
    },
    {
      id: 'acc-inactive',
      name: 'Caja Cerrada',
      type: 'ASSET',
      currencyId: 'cur-usd',
      status: 'INACTIVE',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (api.accounts.summary as jest.Mock).mockResolvedValue(mockAccounts);
    (api.accounts.list as jest.Mock).mockResolvedValue(mockAccounts);
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-usd', code: 'USD', symbol: '$', decimalPlaces: 2, isBase: true },
    ]);
  });

  test('should load only ACTIVE accounts and display ModeSelector defaulting to Quick mode', async () => {
    render(<TransactionModal onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
    });

    expect(screen.getByText(/Registrar Asiento Contable/i)).toBeInTheDocument();

    // Verify ModeSelector is rendered
    expect(screen.getByRole('tab', { name: /Transacción Rápida/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Asiento Libre/i })).toBeInTheDocument();

    // Verify Quick mode is selected by default
    const quickTab = screen.getByRole('tab', { name: /Transacción Rápida/i });
    expect(quickTab).toHaveAttribute('aria-selected', 'true');

    // Quick form operation type buttons
    expect(screen.getByRole('button', { name: /Gasto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ingreso/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferencia/i })).toBeInTheDocument();
  });

  test('should seamlessly switch to FreeJournalEntryGrid when Asiento Libre tab is clicked', async () => {
    render(<TransactionModal onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
    });

    const freeTab = screen.getByRole('tab', { name: /Asiento Libre/i });
    fireEvent.click(freeTab);

    expect(freeTab).toHaveAttribute('aria-selected', 'true');

    // Verify Free Journal elements are rendered
    await waitFor(() => {
      expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Debe/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Haber/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Agregar Apunte/i })).toBeInTheDocument();
    });
  });

  test('should submit Quick Transaction and call api.transactions.create', async () => {
    (api.transactions.create as jest.Mock).mockResolvedValue({ id: 'new-tx' });
    const onCloseMock = jest.fn();
    const onSaveSuccessMock = jest.fn();

    render(
      <TransactionModal
        onClose={onCloseMock}
        onSaveSuccess={onSaveSuccessMock}
        defaultMode={TransactionMode.QUICK}
      />,
    );

    // Wait for accounts to load
    await waitFor(() => {
      expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
    });

    // Step 2: Select payment account (Efectivo)
    const paymentPickerBtn = screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...');
    fireEvent.click(paymentPickerBtn);
    const efectivoOption = await screen.findByText('Efectivo');
    fireEvent.click(efectivoOption);

    // Step 3: Select expense category (Comida)
    const expensePickerBtn = screen.getByText('Seleccionar categoría de gasto...');
    fireEvent.click(expensePickerBtn);
    const comidaOption = await screen.findByText('Comida');
    fireEvent.click(comidaOption);

    // Step 4: Amount
    const amountInput = screen.getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '150.50' } });

    // Step 5: Description
    const descInput = screen.getByPlaceholderText(/Ej. Pago de combustible/i);
    fireEvent.change(descInput, { target: { value: 'Almuerzo de trabajo' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Guardar Transacción/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Almuerzo de trabajo',
          entries: [
            { accountId: 'acc-2', entryType: 'DEBIT', amount: 150.5 },
            { accountId: 'acc-1', entryType: 'CREDIT', amount: 150.5 },
          ],
        }),
      );
    });
  });

  test('should submit Free Journal Entry when balanced', async () => {
    (api.transactions.create as jest.Mock).mockResolvedValue({ id: 'free-tx' });
    const onCloseMock = jest.fn();

    render(<TransactionModal onClose={onCloseMock} defaultMode={TransactionMode.FREE_JOURNAL} />);

    // Wait for accounts to load
    await waitFor(() => {
      expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
    });

    // Fill description
    const descInput = screen.getByPlaceholderText(/Ej: Devengamiento de planilla/i);
    fireEvent.change(descInput, { target: { value: 'Apertura contable' } });

    // Select account 1 (Efectivo) and set Debit to 500
    const pickers = screen.getAllByText('Seleccionar cuenta contable...');
    fireEvent.click(pickers[0]);
    const optEfectivo = await screen.findByText('Efectivo');
    fireEvent.click(optEfectivo);

    const debitInput = screen.getAllByRole('spinbutton', { name: /Debe/i })[0];
    fireEvent.change(debitInput, { target: { value: '500' } });

    // Select account 2 (Sueldo) and set Credit to 500
    const pickersAfter = screen.getAllByText('Seleccionar cuenta contable...');
    fireEvent.click(pickersAfter[0]);
    const optSueldo = await screen.findByText('Sueldo');
    fireEvent.click(optSueldo);

    const creditInput = screen.getAllByRole('spinbutton', { name: /Haber/i })[1];
    fireEvent.change(creditInput, { target: { value: '500' } });

    // Verify Cuadrado status badge
    expect(screen.getByText('Cuadrado')).toBeInTheDocument();

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Guardar Asiento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Apertura contable',
          entries: [
            { accountId: 'acc-1', entryType: 'DEBIT', amount: 500 },
            { accountId: 'acc-3', entryType: 'CREDIT', amount: 500 },
          ],
        }),
      );
    });
  });

  test('should open inline AccountModal when quick create account is clicked', async () => {
    render(<TransactionModal onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...')).toBeInTheDocument();
    });

    // Open primary account picker
    const paymentPickerBtn = screen.getByText('Seleccionar cuenta de pago (Caja, Banco)...');
    fireEvent.click(paymentPickerBtn);

    // Click "Crear nueva cuenta"
    const quickCreateBtn = await screen.findByText(/Crear nueva cuenta/i);
    fireEvent.click(quickCreateBtn);

    // AccountModal should be visible
    expect(screen.getByText('Crear Cuenta o Categoría')).toBeInTheDocument();

    // Cancel closes AccountModal
    const cancelBtns = screen.getAllByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);

    expect(screen.queryByText('Crear Cuenta o Categoría')).not.toBeInTheDocument();
  });
});
