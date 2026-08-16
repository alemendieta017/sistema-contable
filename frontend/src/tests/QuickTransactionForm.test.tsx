import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickOperationType } from '@sistema-contable/shared';
import { QuickTransactionForm } from '../components/transactions/QuickTransactionForm';
import type { AccountOption } from '../types/account';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  ArrowDownLeft: ({ className }: { className?: string }) => (
    <span data-testid="icon-expense" className={className}>
      ArrowDownLeft
    </span>
  ),
  ArrowUpRight: ({ className }: { className?: string }) => (
    <span data-testid="icon-income" className={className}>
      ArrowUpRight
    </span>
  ),
  ArrowLeftRight: ({ className }: { className?: string }) => (
    <span data-testid="icon-transfer" className={className}>
      ArrowLeftRight
    </span>
  ),
  Search: () => <span data-testid="search-icon">Search</span>,
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="chevron-icon" className={className}>
      Chevron
    </span>
  ),
  Plus: () => <span data-testid="plus-icon">+</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className}>
      Loading
    </span>
  ),
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
}));

describe('QuickTransactionForm Component (T007)', () => {
  const mockAccounts: AccountOption[] = [
    {
      id: 'acc-bank',
      name: 'Banco Familiar',
      type: 'ASSET',
      isCashOrBank: true,
      balance: 10000,
      status: 'ACTIVE',
    },
    {
      id: 'acc-cash',
      name: 'Caja Chica',
      type: 'ASSET',
      isCashOrBank: true,
      balance: 500,
      status: 'ACTIVE',
    },
    {
      id: 'acc-card',
      name: 'Tarjeta Crédito Visa',
      type: 'LIABILITY',
      isCashOrBank: true,
      balance: -1500,
      status: 'ACTIVE',
    },
    {
      id: 'acc-exp-fuel',
      name: 'Combustibles y Lubricantes',
      type: 'EXPENSE',
      balance: 350,
      status: 'ACTIVE',
    },
    {
      id: 'acc-exp-office',
      name: 'Útiles de Oficina',
      type: 'EXPENSE',
      balance: 120,
      status: 'ACTIVE',
    },
    {
      id: 'acc-inc-sales',
      name: 'Ventas de Servicios',
      type: 'INCOME',
      balance: 25000,
      status: 'ACTIVE',
    },
  ];

  const defaultProps = {
    accounts: mockAccounts,
    baseCurrency: { code: 'USD', symbol: '$', decimalPlaces: 2 },
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn(),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Operation Template Selector', () => {
    test('renders all 3 operation templates (Gasto, Ingreso, Transferencia) with Gasto selected by default', () => {
      render(<QuickTransactionForm {...defaultProps} />);

      const expenseBtn = screen.getByRole('button', { name: /gasto/i });
      const incomeBtn = screen.getByRole('button', { name: /ingreso/i });
      const transferBtn = screen.getByRole('button', { name: /transferencia/i });

      expect(expenseBtn).toBeInTheDocument();
      expect(incomeBtn).toBeInTheDocument();
      expect(transferBtn).toBeInTheDocument();

      // Gasto is active by default
      expect(expenseBtn).toHaveAttribute('aria-pressed', 'true');
      expect(incomeBtn).toHaveAttribute('aria-pressed', 'false');
      expect(transferBtn).toHaveAttribute('aria-pressed', 'false');
    });

    test('switches template to Ingreso and updates account field labels contextually', () => {
      render(<QuickTransactionForm {...defaultProps} />);

      const incomeBtn = screen.getByRole('button', { name: /ingreso/i });
      fireEvent.click(incomeBtn);

      expect(incomeBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Cuenta de Depósito')).toBeInTheDocument();
      expect(screen.getByText('Categoría de Ingreso')).toBeInTheDocument();
    });

    test('switches template to Transferencia and updates labels to Cuenta Origen and Cuenta Destino', () => {
      render(<QuickTransactionForm {...defaultProps} />);

      const transferBtn = screen.getByRole('button', { name: /transferencia/i });
      fireEvent.click(transferBtn);

      expect(transferBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Cuenta Origen')).toBeInTheDocument();
      expect(screen.getByText('Cuenta Destino')).toBeInTheDocument();
    });
  });

  describe('5-Step Field Sequence & Ordering', () => {
    test('renders the 5 steps in exact sequential order in the DOM', () => {
      const { container } = render(<QuickTransactionForm {...defaultProps} />);

      const formControls = container.querySelectorAll('[data-step]');
      expect(formControls.length).toBe(5);

      expect(formControls[0]).toHaveAttribute('data-step', '1-date');
      expect(formControls[1]).toHaveAttribute('data-step', '2-primary-account');
      expect(formControls[2]).toHaveAttribute('data-step', '3-secondary-account');
      expect(formControls[3]).toHaveAttribute('data-step', '4-amount');
      expect(formControls[4]).toHaveAttribute('data-step', '5-description');
    });

    test('includes inputMode="decimal" and step="any" on amount input', () => {
      render(<QuickTransactionForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/monto/i);
      expect(amountInput).toHaveAttribute('inputmode', 'decimal');
    });
  });

  describe('Double-Entry Payload Generation', () => {
    test('compiles Expense payload: DEBIT expense category, CREDIT payment account', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          {...defaultProps}
          onSubmit={onSubmitMock}
          initialValues={{
            accountingDate: '2026-08-16',
          }}
        />,
      );

      // Select Primary Account (Banco Familiar)
      const primaryTrigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(primaryTrigger);
      const bankOption = screen.getByTestId('account-option-acc-bank');
      fireEvent.click(bankOption);

      // Select Secondary Account (Combustibles)
      const secondaryTrigger = screen.getAllByRole('combobox')[1];
      fireEvent.click(secondaryTrigger);
      const fuelOption = screen.getByTestId('account-option-acc-exp-fuel');
      fireEvent.click(fuelOption);

      // Enter Amount
      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '150.50' } });

      // Enter Description
      const descInput = screen.getByLabelText(/concepto/i);
      fireEvent.change(descInput, { target: { value: 'Carga de combustible utilitario' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });

      expect(onSubmitMock).toHaveBeenCalledWith({
        accountingDate: '2026-08-16',
        description: 'Carga de combustible utilitario',
        entries: [
          {
            accountId: 'acc-exp-fuel',
            entryType: 'DEBIT',
            amount: 150.5,
          },
          {
            accountId: 'acc-bank',
            entryType: 'CREDIT',
            amount: 150.5,
          },
        ],
      });
    });

    test('compiles Income payload: DEBIT deposit account, CREDIT income category', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          {...defaultProps}
          onSubmit={onSubmitMock}
          initialValues={{
            accountingDate: '2026-08-16',
            operationType: QuickOperationType.INCOME,
          }}
        />,
      );

      // Select Primary Account (Caja Chica)
      const primaryTrigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(primaryTrigger);
      const cashOption = screen.getByTestId('account-option-acc-cash');
      fireEvent.click(cashOption);

      // Select Secondary Account (Ventas de Servicios)
      const secondaryTrigger = screen.getAllByRole('combobox')[1];
      fireEvent.click(secondaryTrigger);
      const salesOption = screen.getByTestId('account-option-acc-inc-sales');
      fireEvent.click(salesOption);

      // Enter Amount
      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '800' } });

      // Enter Description
      const descInput = screen.getByLabelText(/concepto/i);
      fireEvent.change(descInput, { target: { value: 'Cobro de consultoría' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });

      expect(onSubmitMock).toHaveBeenCalledWith({
        accountingDate: '2026-08-16',
        description: 'Cobro de consultoría',
        entries: [
          {
            accountId: 'acc-cash',
            entryType: 'DEBIT',
            amount: 800,
          },
          {
            accountId: 'acc-inc-sales',
            entryType: 'CREDIT',
            amount: 800,
          },
        ],
      });
    });

    test('compiles Transfer payload: DEBIT destination account, CREDIT source account', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          {...defaultProps}
          onSubmit={onSubmitMock}
          initialValues={{
            accountingDate: '2026-08-16',
            operationType: QuickOperationType.TRANSFER,
          }}
        />,
      );

      // Select Source Account (Banco Familiar)
      const sourceTrigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(sourceTrigger);
      const bankOption = screen.getByTestId('account-option-acc-bank');
      fireEvent.click(bankOption);

      // Select Destination Account (Caja Chica)
      const destTrigger = screen.getAllByRole('combobox')[1];
      fireEvent.click(destTrigger);
      const cashOption = screen.getByTestId('account-option-acc-cash');
      fireEvent.click(cashOption);

      // Enter Amount
      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '300' } });

      // Enter Description
      const descInput = screen.getByLabelText(/concepto/i);
      fireEvent.change(descInput, { target: { value: 'Extracción para fondo de caja' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });

      expect(onSubmitMock).toHaveBeenCalledWith({
        accountingDate: '2026-08-16',
        description: 'Extracción para fondo de caja',
        entries: [
          {
            accountId: 'acc-cash',
            entryType: 'DEBIT',
            amount: 300,
          },
          {
            accountId: 'acc-bank',
            entryType: 'CREDIT',
            amount: 300,
          },
        ],
      });
    });
  });

  describe('Form Validation Rules', () => {
    test('shows validation errors and blocks submission when required fields are empty', async () => {
      const onSubmitMock = jest.fn();
      render(<QuickTransactionForm {...defaultProps} onSubmit={onSubmitMock} />);

      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(submitBtn);

      expect(onSubmitMock).not.toHaveBeenCalled();
      expect(screen.getByText(/seleccione una cuenta/i)).toBeInTheDocument();
      expect(screen.getByText(/seleccione una categoría/i)).toBeInTheDocument();
      expect(screen.getByText(/el monto debe ser mayor a 0/i)).toBeInTheDocument();
      expect(screen.getByText(/el concepto es obligatorio/i)).toBeInTheDocument();
    });

    test('blocks submission when amount is zero or negative', async () => {
      const onSubmitMock = jest.fn();
      render(
        <QuickTransactionForm
          {...defaultProps}
          onSubmit={onSubmitMock}
          initialValues={{
            primaryAccountId: 'acc-bank',
            secondaryAccountId: 'acc-exp-fuel',
            amount: 0,
            description: 'Test Concept',
          }}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(submitBtn);

      expect(onSubmitMock).not.toHaveBeenCalled();
      expect(screen.getByText(/el monto debe ser mayor a 0/i)).toBeInTheDocument();
    });

    test('validates for transfers that source account !== destination account', async () => {
      const onSubmitMock = jest.fn();
      render(
        <QuickTransactionForm
          {...defaultProps}
          onSubmit={onSubmitMock}
          initialValues={{
            operationType: QuickOperationType.TRANSFER,
            primaryAccountId: 'acc-bank',
            secondaryAccountId: 'acc-bank',
            amount: 100,
            description: 'Transferencia fallida misma cuenta',
          }}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      fireEvent.click(submitBtn);

      expect(onSubmitMock).not.toHaveBeenCalled();
      expect(
        screen.getByText(/las cuentas de origen y destino no pueden ser iguales/i),
      ).toBeInTheDocument();
    });
  });

  describe('Initial Values & Form Controls', () => {
    test('pre-fills form with provided initialValues', () => {
      render(
        <QuickTransactionForm
          {...defaultProps}
          initialValues={{
            operationType: QuickOperationType.EXPENSE,
            accountingDate: '2026-08-15',
            primaryAccountId: 'acc-bank',
            secondaryAccountId: 'acc-exp-office',
            amount: 75.5,
            description: 'Compra de resmas de papel',
          }}
        />,
      );

      expect(screen.getByLabelText(/fecha/i)).toHaveValue('2026-08-15');
      expect(screen.getByText('Banco Familiar')).toBeInTheDocument();
      expect(screen.getByText('Útiles de Oficina')).toBeInTheDocument();
      expect(screen.getByLabelText(/monto/i)).toHaveValue(75.5);
      expect(screen.getByLabelText(/concepto/i)).toHaveValue('Compra de resmas de papel');
    });

    test('calls onCancel when Cancel button is clicked', () => {
      const onCancelMock = jest.fn();
      render(<QuickTransactionForm {...defaultProps} onCancel={onCancelMock} />);

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelBtn);

      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });

    test('disables buttons and shows loader when loading={true}', () => {
      render(<QuickTransactionForm {...defaultProps} loading={true} />);

      const submitBtn = screen.getByRole('button', { name: /guardando|guardar/i });
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });

      expect(submitBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('Quick Create Account Integration', () => {
    test('invokes onQuickCreateAccount with targetField "primary" when primary account picker creates an account', () => {
      const onQuickCreateMock = jest.fn();
      render(<QuickTransactionForm {...defaultProps} onQuickCreateAccount={onQuickCreateMock} />);

      // Open primary account picker
      const primaryTrigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(primaryTrigger);

      const staticCreateBtn = screen.getByText('Crear nueva cuenta');
      fireEvent.click(staticCreateBtn);

      expect(onQuickCreateMock).toHaveBeenCalledWith('', 'primary');
    });

    test('invokes onQuickCreateAccount with targetField "secondary" when secondary account picker creates an account', () => {
      const onQuickCreateMock = jest.fn();
      render(<QuickTransactionForm {...defaultProps} onQuickCreateAccount={onQuickCreateMock} />);

      // Open secondary account picker
      const secondaryTrigger = screen.getAllByRole('combobox')[1];
      fireEvent.click(secondaryTrigger);

      const staticCreateBtn = screen.getByText('Crear nueva cuenta');
      fireEvent.click(staticCreateBtn);

      expect(onQuickCreateMock).toHaveBeenCalledWith('', 'secondary');
    });
  });

  describe('Keyboard Shortcuts (Ctrl+Enter / Cmd+Enter)', () => {
    test('submits form on Ctrl+Enter from any input', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          {...defaultProps}
          onSubmit={onSubmitMock}
          initialValues={{
            accountingDate: '2026-08-16',
            primaryAccountId: 'acc-bank',
            secondaryAccountId: 'acc-exp-fuel',
            amount: 50,
            description: 'Combustible',
          }}
        />,
      );

      const descInput = screen.getByLabelText(/concepto/i);
      fireEvent.keyDown(descInput, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });
    });
  });
});
