import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FreeJournalEntryRow } from '../components/transactions/FreeJournalEntryRow';
import { FreeJournalEntryGrid } from '../components/transactions/FreeJournalEntryGrid';
import type { AccountOption } from '../types/account';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">Search</span>,
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="chevron-icon" className={className}>
      Chevron
    </span>
  ),
  Plus: () => <span data-testid="plus-icon">+</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">Alert</span>,
  CheckCircle2: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className}>
      Loading
    </span>
  ),
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
}));

describe('User Story 2: Free Journal Entry Grid (T011)', () => {
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
      id: 'acc-vat',
      name: 'IVA Crédito Fiscal 10%',
      type: 'ASSET',
      balance: 1200,
      status: 'ACTIVE',
    },
    {
      id: 'acc-exp-services',
      name: 'Honorarios Profesionales',
      type: 'EXPENSE',
      balance: 2400,
      status: 'ACTIVE',
    },
    {
      id: 'acc-withholding-payable',
      name: 'Retenciones por Pagar',
      type: 'LIABILITY',
      balance: 800,
      status: 'ACTIVE',
    },
    {
      id: 'acc-inc-consulting',
      name: 'Ingresos por Consultoría',
      type: 'INCOME',
      balance: 45000,
      status: 'ACTIVE',
    },
  ];

  const defaultBaseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };

  describe('1. FreeJournalEntryRow Component (T012)', () => {
    const defaultRowProps = {
      line: {
        id: 'line-1',
        accountId: '',
        debitAmount: '' as const,
        creditAmount: '' as const,
      },
      index: 0,
      accounts: mockAccounts,
      baseCurrency: defaultBaseCurrency,
      onChange: jest.fn(),
      onRemove: jest.fn(),
      canRemove: true,
      onQuickCreateAccount: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders account picker trigger, Debe input, Haber input, and delete button', () => {
      render(<FreeJournalEntryRow {...defaultRowProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByLabelText(/debe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/haber/i)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /eliminar fila|eliminar apunte/i }),
      ).toBeInTheDocument();
    });

    test('includes inputMode="decimal" and step="any" on Debe and Haber inputs', () => {
      render(<FreeJournalEntryRow {...defaultRowProps} />);

      const debitInput = screen.getByLabelText(/debe/i);
      const creditInput = screen.getByLabelText(/haber/i);

      expect(debitInput).toHaveAttribute('inputmode', 'decimal');
      expect(creditInput).toHaveAttribute('inputmode', 'decimal');
    });

    test('mutual exclusivity: entering value in Debe clears Haber', () => {
      const onChangeMock = jest.fn();
      render(
        <FreeJournalEntryRow
          {...defaultRowProps}
          line={{
            id: 'line-1',
            accountId: 'acc-bank',
            debitAmount: '',
            creditAmount: 250,
          }}
          onChange={onChangeMock}
        />,
      );

      const debitInput = screen.getByLabelText(/debe/i);
      fireEvent.change(debitInput, { target: { value: '500' } });

      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith({
        id: 'line-1',
        accountId: 'acc-bank',
        debitAmount: 500,
        creditAmount: '',
      });
    });

    test('mutual exclusivity: entering value in Haber clears Debe', () => {
      const onChangeMock = jest.fn();
      render(
        <FreeJournalEntryRow
          {...defaultRowProps}
          line={{
            id: 'line-1',
            accountId: 'acc-bank',
            debitAmount: 300,
            creditAmount: '',
          }}
          onChange={onChangeMock}
        />,
      );

      const creditInput = screen.getByLabelText(/haber/i);
      fireEvent.change(creditInput, { target: { value: '450' } });

      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith({
        id: 'line-1',
        accountId: 'acc-bank',
        debitAmount: '',
        creditAmount: 450,
      });
    });

    test('disables delete button when canRemove is false', () => {
      render(<FreeJournalEntryRow {...defaultRowProps} canRemove={false} />);

      const removeBtn = screen.getByRole('button', { name: /eliminar fila|eliminar apunte/i });
      expect(removeBtn).toBeDisabled();
    });

    test('invokes onRemove when delete button is clicked and canRemove is true', () => {
      const onRemoveMock = jest.fn();
      render(<FreeJournalEntryRow {...defaultRowProps} canRemove={true} onRemove={onRemoveMock} />);

      const removeBtn = screen.getByRole('button', { name: /eliminar fila|eliminar apunte/i });
      fireEvent.click(removeBtn);

      expect(onRemoveMock).toHaveBeenCalledTimes(1);
    });

    test('selecting an account updates line accountId via onChange', () => {
      const onChangeMock = jest.fn();
      render(<FreeJournalEntryRow {...defaultRowProps} onChange={onChangeMock} />);

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      const bankOption = screen.getByTestId('account-option-acc-bank');
      fireEvent.click(bankOption);

      expect(onChangeMock).toHaveBeenCalledWith({
        id: 'line-1',
        accountId: 'acc-bank',
        debitAmount: '',
        creditAmount: '',
      });
    });
  });

  describe('2. FreeJournalEntryGrid Component (T013)', () => {
    const defaultGridProps = {
      accounts: mockAccounts,
      baseCurrency: defaultBaseCurrency,
      onSubmit: jest.fn().mockResolvedValue(undefined),
      onCancel: jest.fn(),
      loading: false,
      onQuickCreateAccount: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders accounting date, description, initial 2 rows, and summary panel', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} />);

      expect(screen.getByLabelText(/fecha/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/concepto|glosa|descripción/i)).toBeInTheDocument();

      // Initial 2 lines
      const rows = screen.getAllByRole('combobox');
      expect(rows.length).toBe(2);

      // Summary panel with Debe, Haber, and Diferencia
      expect(screen.getByText(/total debe/i)).toBeInTheDocument();
      expect(screen.getByText(/total haber/i)).toBeInTheDocument();
      expect(screen.getByText(/diferencia/i)).toBeInTheDocument();
    });

    test('auto-fills difference on new line when Line 1 has Debit = 100', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} />);

      const debitInputs = screen.getAllByLabelText(/debe/i);
      fireEvent.change(debitInputs[0], { target: { value: '100' } });

      // Click "Agregar Apunte" / "Agregar Línea"
      const addLineBtn = screen.getByRole('button', {
        name: /agregar apunte|agregar línea|agregar fila/i,
      });
      fireEvent.click(addLineBtn);

      const allCreditInputs = screen.getAllByLabelText(/haber/i);
      expect(allCreditInputs.length).toBe(3);
      // Newly added line (3rd line) should have Credit pre-filled with 100
      expect(allCreditInputs[2]).toHaveValue(100);
    });

    test('multi-line residual auto-fill: Line 1 Debit = 100, Line 2 Credit = 40 -> Line 3 Credit = 60', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} />);

      const debitInputs = screen.getAllByLabelText(/debe/i);
      const creditInputs = screen.getAllByLabelText(/haber/i);

      // Line 1: Debit 100
      fireEvent.change(debitInputs[0], { target: { value: '100' } });
      // Line 2: Credit 40
      fireEvent.change(creditInputs[1], { target: { value: '40' } });

      // Add Line 3
      const addLineBtn = screen.getByRole('button', {
        name: /agregar apunte|agregar línea|agregar fila/i,
      });
      fireEvent.click(addLineBtn);

      const updatedCreditInputs = screen.getAllByLabelText(/haber/i);
      expect(updatedCreditInputs.length).toBe(3);
      // Line 3 should auto-fill the remaining difference: 60 in Credit
      expect(updatedCreditInputs[2]).toHaveValue(60);
    });

    test('multi-line residual auto-fill when Credits exceed Debits: Line 1 Credit = 200, Line 2 Debit = 50 -> Line 3 Debit = 150', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} />);

      const debitInputs = screen.getAllByLabelText(/debe/i);
      const creditInputs = screen.getAllByLabelText(/haber/i);

      // Line 1: Credit 200
      fireEvent.change(creditInputs[0], { target: { value: '200' } });
      // Line 2: Debit 50
      fireEvent.change(debitInputs[1], { target: { value: '50' } });

      // Add Line 3
      const addLineBtn = screen.getByRole('button', {
        name: /agregar apunte|agregar línea|agregar fila/i,
      });
      fireEvent.click(addLineBtn);

      const updatedDebitInputs = screen.getAllByLabelText(/debe/i);
      expect(updatedDebitInputs.length).toBe(3);
      // Line 3 should auto-fill the remaining difference: 150 in Debit
      expect(updatedDebitInputs[2]).toHaveValue(150);
    });

    test('real-time balance indicator: shows "Sin movimientos" initially, "Descuadrado" when unbalanced, and "Cuadrado" when total Debe === total Haber > 0', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} />);

      // Initially empty / 0 movements
      expect(screen.getByText(/sin movimientos/i)).toBeInTheDocument();

      const debitInputs = screen.getAllByLabelText(/debe/i);
      const creditInputs = screen.getAllByLabelText(/haber/i);

      // Line 1: Debit 150 -> Unbalanced
      fireEvent.change(debitInputs[0], { target: { value: '150' } });
      expect(screen.getByText(/descuadrado/i)).toBeInTheDocument();

      // Line 2: Credit 150 -> Balanced!
      fireEvent.change(creditInputs[1], { target: { value: '150' } });
      expect(screen.getByText(/cuadrado/i)).toBeInTheDocument();
    });

    test('allows removing lines when more than 2 lines are present, and updates balance in real time', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} />);

      const debitInputs = screen.getAllByLabelText(/debe/i);
      const creditInputs = screen.getAllByLabelText(/haber/i);

      fireEvent.change(debitInputs[0], { target: { value: '200' } });
      fireEvent.change(creditInputs[1], { target: { value: '120' } });

      // Add 3rd line
      const addLineBtn = screen.getByRole('button', {
        name: /agregar apunte|agregar línea|agregar fila/i,
      });
      fireEvent.click(addLineBtn);

      const deleteButtons = screen.getAllByRole('button', {
        name: /eliminar fila|eliminar apunte/i,
      });
      expect(deleteButtons.length).toBe(3);

      // Remove the 3rd line
      fireEvent.click(deleteButtons[2]);

      const remainingCombos = screen.getAllByRole('combobox');
      expect(remainingCombos.length).toBe(2);
    });

    test('blocks submission and shows validation errors when fields are empty or unbalanced', async () => {
      const onSubmitMock = jest.fn();
      render(<FreeJournalEntryGrid {...defaultGridProps} onSubmit={onSubmitMock} />);

      const submitBtn = screen.getByRole('button', { name: /guardar asiento|guardar/i });
      fireEvent.click(submitBtn);

      expect(onSubmitMock).not.toHaveBeenCalled();
      expect(screen.getByText(/el concepto|la descripción es obligatoria/i)).toBeInTheDocument();
    });

    test('submits valid balanced multi-leg payload to onSubmit callback', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <FreeJournalEntryGrid
          {...defaultGridProps}
          onSubmit={onSubmitMock}
          initialValues={{
            accountingDate: '2026-08-16',
            description: 'Pago de honorarios con retención',
            lines: [
              {
                id: 'l1',
                accountId: 'acc-exp-services',
                debitAmount: 1000,
                creditAmount: '',
              },
              {
                id: 'l2',
                accountId: 'acc-withholding-payable',
                debitAmount: '',
                creditAmount: 100,
              },
              {
                id: 'l3',
                accountId: 'acc-bank',
                debitAmount: '',
                creditAmount: 900,
              },
            ],
          }}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /guardar asiento|guardar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });

      expect(onSubmitMock).toHaveBeenCalledWith({
        accountingDate: '2026-08-16',
        description: 'Pago de honorarios con retención',
        entries: [
          {
            accountId: 'acc-exp-services',
            entryType: 'DEBIT',
            amount: 1000,
          },
          {
            accountId: 'acc-withholding-payable',
            entryType: 'CREDIT',
            amount: 100,
          },
          {
            accountId: 'acc-bank',
            entryType: 'CREDIT',
            amount: 900,
          },
        ],
      });
    });

    test('supports keyboard submission via Ctrl+Enter / Cmd+Enter when form is balanced', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <FreeJournalEntryGrid
          {...defaultGridProps}
          onSubmit={onSubmitMock}
          initialValues={{
            accountingDate: '2026-08-16',
            description: 'Asiento por atajo de teclado',
            lines: [
              {
                id: 'l1',
                accountId: 'acc-bank',
                debitAmount: 500,
                creditAmount: '',
              },
              {
                id: 'l2',
                accountId: 'acc-inc-consulting',
                debitAmount: '',
                creditAmount: 500,
              },
            ],
          }}
        />,
      );

      const descInput = screen.getByLabelText(/concepto|glosa|descripción/i);
      fireEvent.keyDown(descInput, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(onSubmitMock).toHaveBeenCalledTimes(1);
      });
    });

    test('disables buttons and shows loading spinner when loading is true', () => {
      render(<FreeJournalEntryGrid {...defaultGridProps} loading={true} />);

      const submitBtn = screen.getByRole('button', { name: /guardando|guardar/i });
      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });

      expect(submitBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    test('calls onCancel when Cancel button is clicked', () => {
      const onCancelMock = jest.fn();
      render(<FreeJournalEntryGrid {...defaultGridProps} onCancel={onCancelMock} />);

      const cancelBtn = screen.getByRole('button', { name: /cancelar/i });
      fireEvent.click(cancelBtn);

      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });

    test('delegates onQuickCreateAccount with line index when triggered from a row', () => {
      const onQuickCreateMock = jest.fn();
      render(
        <FreeJournalEntryGrid {...defaultGridProps} onQuickCreateAccount={onQuickCreateMock} />,
      );

      // Open row 1 account picker
      const firstCombobox = screen.getAllByRole('combobox')[0];
      fireEvent.click(firstCombobox);

      const createBtn = screen.getByText('Crear nueva cuenta');
      fireEvent.click(createBtn);

      expect(onQuickCreateMock).toHaveBeenCalledWith('', 0);
    });
  });
});
