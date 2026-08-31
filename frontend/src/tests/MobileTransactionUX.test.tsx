import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import AccountPickerSheet from '../components/transactions/AccountPickerSheet';
import { FreeJournalEntryRow } from '../components/transactions/FreeJournalEntryRow';
import { QuickTransactionForm } from '../components/transactions/QuickTransactionForm';
import type { AccountOption } from '../types/account';
import { QuickOperationType } from '@sistema-contable/shared';

// Mock Lucide React icons
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
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader-icon" className={className}>
      Loading
    </span>
  ),
  Calendar: () => <span data-testid="calendar-icon">Calendar</span>,
}));

describe('User Story 4: Touch-First Mobile Accounting Experience (T021)', () => {
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
      name: 'Tarjeta Crédito',
      type: 'LIABILITY',
      isCashOrBank: true,
      balance: -1200,
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
      id: 'acc-inc-sales',
      name: 'Ventas de Servicios',
      type: 'INCOME',
      balance: 25000,
      status: 'ACTIVE',
    },
    {
      id: 'acc-equity',
      name: 'Capital Social',
      type: 'EQUITY',
      status: 'ACTIVE',
    },
  ];

  const defaultBaseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };

  describe('1. AccountPickerSheet Responsive Modal Overlay (T022)', () => {
    test('renders responsive modal overlay container with centered positioning and rounded corners', () => {
      render(
        <AccountPickerSheet accounts={mockAccounts} onSelect={jest.fn()} label="Cuenta de Pago" />,
      );

      // Open sheet
      fireEvent.click(screen.getByRole('combobox'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.className).toContain('fixed');
      expect(dialog.className).toContain('inset-0');
      expect(dialog.className).toContain('items-center');
      expect(dialog.className).toContain('justify-center');

      // Find modal container inside dialog
      const modalContainer = dialog.querySelector('.relative.w-full.max-w-lg');
      expect(modalContainer).toBeInTheDocument();
      expect(modalContainer?.className).toContain('max-h-[85vh]');
      expect(modalContainer?.className).toContain('rounded-2xl');
      expect(modalContainer?.className).toContain('z-50');
    });

    test('does not autofocus search input on open to prevent mobile virtual keyboard popup', () => {
      const originalWidth = window.innerWidth;
      window.innerWidth = 375;
      try {
        render(<AccountPickerSheet accounts={mockAccounts} onSelect={jest.fn()} />);

        fireEvent.click(screen.getByRole('combobox'));

        const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
        expect(searchInput).not.toHaveFocus();
      } finally {
        window.innerWidth = originalWidth;
      }
    });

    test('renders horizontal scrollable category tabs bar with minimum 44px touch targets', () => {
      render(<AccountPickerSheet accounts={mockAccounts} onSelect={jest.fn()} />);

      fireEvent.click(screen.getByRole('combobox'));

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
      expect(tablist.className).toContain('overflow-x-auto');
      expect(tablist.className).toContain('whitespace-nowrap');

      // Check category tab buttons have minimum 44px touch target height
      const tabs = within(tablist).getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(5);
      tabs.forEach((tab) => {
        expect(tab.className).toContain('min-h-11');
      });
    });

    test('renders account list items and quick create buttons with >= 44px touch targets', () => {
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={jest.fn()}
          onQuickCreateAccount={jest.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));

      const listbox = screen.getByRole('listbox');
      const accountOptions = within(listbox).getAllByRole('option');
      expect(accountOptions.length).toBeGreaterThan(0);

      accountOptions.forEach((option) => {
        expect(option.className).toContain('min-h-11');
      });

      // Check bottom quick create button
      const quickCreateBtn = screen.getByText('Crear nueva cuenta').closest('button');
      expect(quickCreateBtn?.className).toContain('min-h-11');
    });

    test('renders dynamic search quick create button with >= 44px touch target', () => {
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={jest.fn()}
          onQuickCreateAccount={jest.fn()}
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      fireEvent.change(searchInput, { target: { value: 'Nueva Cuenta Móvil' } });

      const dynamicCreateBtn = screen
        .getByText(/Crear cuenta “Nueva Cuenta Móvil”/i)
        .closest('button');
      expect(dynamicCreateBtn).toBeInTheDocument();
      expect(dynamicCreateBtn?.className).toContain('min-h-11');
    });

    test('backdrop click closes the mobile bottom sheet overlay', () => {
      render(<AccountPickerSheet accounts={mockAccounts} onSelect={jest.fn()} />);

      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const backdrop = screen.getByTestId('account-picker-backdrop');
      fireEvent.click(backdrop);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('2. FreeJournalEntryRow Responsive Mobile Stacked Card (T023)', () => {
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
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('renders responsive stacked-card layout with mobile line header', () => {
      render(<FreeJournalEntryRow {...defaultRowProps} />);

      // Mobile card header
      expect(screen.getByText('Línea #1')).toBeInTheDocument();

      // Row container classes for responsive layout
      const rowContainer = screen.getByTestId('free-journal-row-0');
      expect(rowContainer.className).toContain('flex-col');
      expect(rowContainer.className).toContain('sm:flex-row');
    });

    test('renders Debe and Haber touch inputs with mobile-specific labels', () => {
      render(<FreeJournalEntryRow {...defaultRowProps} />);

      expect(screen.getByText(/Debe \(\$\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Haber \(\$\)/i)).toBeInTheDocument();
    });

    test('renders touch-friendly delete button with >= 44px tap target', () => {
      render(<FreeJournalEntryRow {...defaultRowProps} />);

      const deleteBtn = screen.getByRole('button', { name: /eliminar fila/i });
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn.className).toContain('min-h-[44px]');
      expect(deleteBtn.className).toContain('min-w-[44px]');
    });

    test('mutual exclusivity on touch input: entering Debe clears Haber and vice versa', () => {
      const onChangeMock = jest.fn();
      render(
        <FreeJournalEntryRow
          {...defaultRowProps}
          line={{
            id: 'line-1',
            accountId: 'acc-bank',
            debitAmount: '',
            creditAmount: 750,
          }}
          onChange={onChangeMock}
        />,
      );

      const debitInput = screen.getByLabelText('Debe');
      fireEvent.change(debitInput, { target: { value: '1200' } });

      expect(onChangeMock).toHaveBeenCalledWith({
        id: 'line-1',
        accountId: 'acc-bank',
        debitAmount: 1200,
        creditAmount: '',
      });
    });
  });

  describe('3. Native Decimal Keypad Invocation (T024)', () => {
    test('FreeJournalEntryRow Debe and Haber monetary inputs have inputMode="decimal"', () => {
      render(
        <FreeJournalEntryRow
          line={{
            id: 'line-1',
            accountId: '',
            debitAmount: '',
            creditAmount: '',
          }}
          index={0}
          accounts={mockAccounts}
          baseCurrency={defaultBaseCurrency}
          onChange={jest.fn()}
          onRemove={jest.fn()}
          canRemove={true}
        />,
      );

      const debitInput = screen.getByLabelText('Debe');
      const creditInput = screen.getByLabelText('Haber');

      expect(debitInput).toHaveAttribute('inputmode', 'decimal');
      expect(creditInput).toHaveAttribute('inputmode', 'decimal');
      expect(debitInput).toHaveAttribute('type', 'text');
      expect(creditInput).toHaveAttribute('type', 'text');
    });

    test('QuickTransactionForm amount monetary input has inputMode="decimal"', () => {
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={defaultBaseCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          loading={false}
        />,
      );

      const amountInput = screen.getByLabelText(/monto/i);
      expect(amountInput).toHaveAttribute('inputmode', 'decimal');
      expect(amountInput).toHaveAttribute('type', 'text');
    });

    test('QuickTransactionForm operation template buttons have touch-friendly tap targets', () => {
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={defaultBaseCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          loading={false}
        />,
      );

      const expenseBtn = screen.getByRole('button', { name: /gasto/i });
      const incomeBtn = screen.getByRole('button', { name: /ingreso/i });
      const transferBtn = screen.getByRole('button', { name: /transferencia/i });

      expect(expenseBtn.className).toContain('py-2.5');
      expect(incomeBtn.className).toContain('py-2.5');
      expect(transferBtn.className).toContain('py-2.5');
    });
  });

  describe('4. Mobile Touch Flow Integration', () => {
    test('completes full touch flow: open mobile sheet, filter category, select account, enter decimal amount', async () => {
      const onSubmitMock = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={defaultBaseCurrency}
          onSubmit={onSubmitMock}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            accountingDate: '2026-08-16',
            operationType: QuickOperationType.EXPENSE,
          }}
        />,
      );

      // 1. Touch primary account picker (opens bottom sheet)
      const primaryTrigger = screen.getAllByRole('combobox')[0];
      fireEvent.click(primaryTrigger);

      // Verify bottom sheet is open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Touch Banco Familiar option
      const bankOption = screen.getByTestId('account-option-acc-bank');
      fireEvent.click(bankOption);

      // Bottom sheet closes
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 2. Touch secondary account picker (category)
      const secondaryTrigger = screen.getAllByRole('combobox')[1];
      fireEvent.click(secondaryTrigger);

      // Touch Gastos category tab pill
      const expenseTab = screen.getByTestId('category-tab-EXPENSE');
      fireEvent.click(expenseTab);

      // Touch Combustibles option
      const fuelOption = screen.getByTestId('account-option-acc-exp-fuel');
      fireEvent.click(fuelOption);

      // 3. Touch amount input and type decimal value
      const amountInput = screen.getByLabelText(/monto/i);
      fireEvent.change(amountInput, { target: { value: '45.75' } });

      // 4. Touch description input
      const descInput = screen.getByLabelText(/concepto/i);
      fireEvent.change(descInput, { target: { value: 'Carga de nafta super' } });

      // 5. Submit transaction
      const submitBtn = screen.getByRole('button', { name: /guardar/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(onSubmitMock).toHaveBeenCalledTimes(1);
      expect(onSubmitMock).toHaveBeenCalledWith({
        accountingDate: '2026-08-16',
        description: 'Carga de nafta super',
        entries: [
          {
            accountId: 'acc-exp-fuel',
            entryType: 'DEBIT',
            amount: 45.75,
          },
          {
            accountId: 'acc-bank',
            entryType: 'CREDIT',
            amount: 45.75,
          },
        ],
      });
    });
  });
});
