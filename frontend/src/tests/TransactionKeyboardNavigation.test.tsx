import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import QuickTransactionForm from '../components/transactions/QuickTransactionForm';
import FreeJournalEntryGrid from '../components/transactions/FreeJournalEntryGrid';
import AccountPickerSheet from '../components/transactions/AccountPickerSheet';
import { QuickOperationType } from '@sistema-contable/shared';
import type { AccountOption } from '../types/account';

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
  ArrowDownLeft: () => <span data-testid="arrow-down-left">Gasto</span>,
  ArrowUpRight: () => <span data-testid="arrow-up-right">Ingreso</span>,
  ArrowLeftRight: () => <span data-testid="arrow-left-right">Transferencia</span>,
  Loader2: () => <span data-testid="loader">Loading</span>,
  Calendar: () => <span data-testid="calendar-icon">Cal</span>,
  CheckCircle2: () => <span data-testid="check-circle-icon">Cuadrado</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">Descuadrado</span>,
  Trash2: () => <span data-testid="trash-icon">Delete</span>,
}));

const mockAccounts: AccountOption[] = [
  {
    id: 'acc-caja',
    name: 'Caja Chica',
    type: 'ASSET',
    isCashOrBank: true,
    status: 'ACTIVE',
    balance: 5000,
  },
  {
    id: 'acc-banco',
    name: 'Banco Familiar',
    type: 'ASSET',
    isCashOrBank: true,
    status: 'ACTIVE',
    balance: 15000,
  },
  { id: 'acc-gasto', name: 'Combustibles y Lubricantes', type: 'EXPENSE', status: 'ACTIVE' },
  { id: 'acc-ingreso', name: 'Servicios de Consultoría', type: 'INCOME', status: 'ACTIVE' },
  {
    id: 'acc-tarjeta',
    name: 'Tarjeta de Crédito',
    type: 'LIABILITY',
    isCashOrBank: true,
    status: 'ACTIVE',
    balance: -2000,
  },
];

describe('US3: Rapid Keyboard-First Desktop Navigation Tests', () => {
  const baseCurrency = { code: 'USD', symbol: '$', decimalPlaces: 2 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. AccountPickerSheet Keyboard Arrow Navigation & Selection', () => {
    test('opens on ArrowDown key press on trigger button', () => {
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={jest.fn()}
          baseCurrency={baseCurrency}
          label="Cuenta Origen"
        />,
      );

      const triggerBtn = screen.getByRole('combobox');
      fireEvent.keyDown(triggerBtn, { key: 'ArrowDown', code: 'ArrowDown' });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    test('navigates through accounts using ArrowDown and ArrowUp and sets aria-activedescendant', () => {
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={jest.fn()}
          baseCurrency={baseCurrency}
        />,
      );

      // Open sheet
      fireEvent.click(screen.getByRole('combobox'));
      const searchInput = screen.getByRole('searchbox');

      // Press ArrowDown to focus first account
      fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(searchInput).toHaveAttribute(
        'aria-activedescendant',
        expect.stringContaining('account-sheet-opt-'),
      );

      // Press ArrowDown to focus second account
      fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
      expect(searchInput).toHaveAttribute(
        'aria-activedescendant',
        expect.stringContaining('account-sheet-opt-'),
      );

      // Press ArrowUp to return to first account
      fireEvent.keyDown(searchInput, { key: 'ArrowUp', code: 'ArrowUp' });
      expect(searchInput).toHaveAttribute(
        'aria-activedescendant',
        expect.stringContaining('account-sheet-opt-'),
      );
    });

    test('selects highlighted account when pressing Enter key', () => {
      const handleSelect = jest.fn();
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={handleSelect}
          baseCurrency={baseCurrency}
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));
      const searchInput = screen.getByRole('searchbox');

      // Arrow down to first item and press Enter
      fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('selects first matching item when pressing Enter directly without arrowing', () => {
      const handleSelect = jest.fn();
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={handleSelect}
          baseCurrency={baseCurrency}
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));
      const searchInput = screen.getByRole('searchbox');

      fireEvent.change(searchInput, { target: { value: 'Combustibles' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Combustibles y Lubricantes' }),
      );
    });

    test('closes dialog on Escape key without selecting any account', () => {
      const handleSelect = jest.fn();
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={handleSelect}
          baseCurrency={baseCurrency}
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(handleSelect).not.toHaveBeenCalled();
    });

    test('allows navigating to and selecting search-based quick create with Enter', () => {
      const handleQuickCreate = jest.fn();
      render(
        <AccountPickerSheet
          accounts={mockAccounts}
          onSelect={jest.fn()}
          baseCurrency={baseCurrency}
          onQuickCreateAccount={handleQuickCreate}
        />,
      );

      fireEvent.click(screen.getByRole('combobox'));
      const searchInput = screen.getByRole('searchbox');

      fireEvent.change(searchInput, { target: { value: 'Nueva Cuenta Externa' } });

      // The search quick create option is the first flatItem
      fireEvent.keyDown(searchInput, { key: 'ArrowDown', code: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      expect(handleQuickCreate).toHaveBeenCalledWith('Nueva Cuenta Externa');
    });
  });

  describe('2. QuickTransactionForm Keyboard Navigation & Global Shortcuts', () => {
    test('submits valid form using Ctrl+Enter shortcut', async () => {
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={handleSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            operationType: QuickOperationType.EXPENSE,
            accountingDate: '2026-08-16',
            primaryAccountId: 'acc-caja',
            secondaryAccountId: 'acc-gasto',
            amount: 75.5,
            description: 'Compra de combustible',
          }}
        />,
      );

      const descriptionInput = screen.getByLabelText('Concepto');
      fireEvent.keyDown(descriptionInput, { key: 'Enter', code: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          accountingDate: '2026-08-16',
          description: 'Compra de combustible',
          entries: [
            { accountId: 'acc-gasto', entryType: 'DEBIT', amount: 75.5 },
            { accountId: 'acc-caja', entryType: 'CREDIT', amount: 75.5 },
          ],
        }),
      );
    });

    test('submits valid form using Cmd+Enter (metaKey) shortcut on macOS', async () => {
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={handleSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            operationType: QuickOperationType.INCOME,
            accountingDate: '2026-08-16',
            primaryAccountId: 'acc-banco',
            secondaryAccountId: 'acc-ingreso',
            amount: 500,
            description: 'Cobro de asesoría',
          }}
        />,
      );

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });
    });

    test('does not submit and displays validation errors when pressing Ctrl+Enter on invalid form', async () => {
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={handleSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            amount: '',
            description: '',
          }}
        />,
      );

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });

      expect(handleSubmit).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText('El monto debe ser mayor a 0')).toBeInTheDocument();
        expect(screen.getByText('El concepto es obligatorio')).toBeInTheDocument();
      });
    });

    test('debounces rapid submissions: prevents double submit on rapid key strokes or clicks', async () => {
      let resolvePromise: () => void = () => {};
      const slowSubmit = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={slowSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            operationType: QuickOperationType.EXPENSE,
            accountingDate: '2026-08-16',
            primaryAccountId: 'acc-caja',
            secondaryAccountId: 'acc-gasto',
            amount: 100,
            description: 'Gasto test debouncing',
          }}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /Guardar Transacción/i });

      // Trigger Ctrl+Enter twice rapidly
      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });

      // Click submit button while still in flight
      fireEvent.click(submitBtn);

      expect(slowSubmit).toHaveBeenCalledTimes(1);

      // Finish the in-flight promise
      await act(async () => {
        resolvePromise();
      });
    });

    test('enforces strict sequential form elements order for standard tab navigation', () => {
      render(
        <QuickTransactionForm
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          loading={false}
        />,
      );

      const dateInput = screen.getByLabelText('Fecha');
      const comboboxes = screen.getAllByRole('combobox');
      const primaryAccountBtn = comboboxes[0];
      const secondaryAccountBtn = comboboxes[1];
      const amountInput = screen.getByLabelText('Monto');
      const descriptionInput = screen.getByLabelText('Concepto');
      const submitBtn = screen.getByRole('button', { name: /Guardar Transacción/i });

      // Verify DOM document position order (Node.DOCUMENT_POSITION_FOLLOWING)
      expect(
        dateInput.compareDocumentPosition(primaryAccountBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        primaryAccountBtn.compareDocumentPosition(secondaryAccountBtn) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        secondaryAccountBtn.compareDocumentPosition(amountInput) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        amountInput.compareDocumentPosition(descriptionInput) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        descriptionInput.compareDocumentPosition(submitBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
  });

  describe('3. FreeJournalEntryGrid Keyboard Navigation & Shortcuts', () => {
    test('submits balanced journal entry using Ctrl+Enter shortcut', async () => {
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={handleSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            accountingDate: '2026-08-16',
            description: 'Asiento balanceado',
            lines: [
              { id: 'l1', accountId: 'acc-caja', debitAmount: 200, creditAmount: '' },
              { id: 'l2', accountId: 'acc-banco', debitAmount: '', creditAmount: 200 },
            ],
          }}
        />,
      );

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          accountingDate: '2026-08-16',
          description: 'Asiento balanceado',
          entries: [
            { accountId: 'acc-caja', entryType: 'DEBIT', amount: 200 },
            { accountId: 'acc-banco', entryType: 'CREDIT', amount: 200 },
          ],
        }),
      );
    });

    test('submits balanced journal entry using Cmd+Enter (metaKey) on macOS', async () => {
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={handleSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            accountingDate: '2026-08-16',
            description: 'Asiento balanceado mac',
            lines: [
              { id: 'l1', accountId: 'acc-caja', debitAmount: 300, creditAmount: '' },
              { id: 'l2', accountId: 'acc-banco', debitAmount: '', creditAmount: 300 },
            ],
          }}
        />,
      );

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });
    });

    test('blocks Ctrl+Enter submission and shows error if entry is unbalanced', async () => {
      const handleSubmit = jest.fn().mockResolvedValue(undefined);
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={handleSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            accountingDate: '2026-08-16',
            description: 'Asiento descuadrado',
            lines: [
              { id: 'l1', accountId: 'acc-caja', debitAmount: 500, creditAmount: '' },
              { id: 'l2', accountId: 'acc-banco', debitAmount: '', creditAmount: 300 },
            ],
          }}
        />,
      );

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });

      expect(handleSubmit).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(screen.getByText(/El asiento está descuadrado/i)).toBeInTheDocument();
      });
    });

    test('adds a new line when pressing Enter on amount input in the last row', () => {
      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            lines: [
              { id: 'l1', accountId: 'acc-caja', debitAmount: 500, creditAmount: '' },
              { id: 'l2', accountId: '', debitAmount: '', creditAmount: '' },
            ],
          }}
        />,
      );

      const rowsBefore = screen.getAllByTestId(/free-journal-row-/);
      expect(rowsBefore).toHaveLength(2);

      // Find Debe input in row 2 (last row)
      const debitInputs = screen.getAllByLabelText('Debe');
      const lastDebitInput = debitInputs[debitInputs.length - 1];

      fireEvent.keyDown(lastDebitInput, { key: 'Enter', code: 'Enter' });

      const rowsAfter = screen.getAllByTestId(/free-journal-row-/);
      expect(rowsAfter).toHaveLength(3);
    });

    test('debounces rapid submissions in FreeJournalEntryGrid', async () => {
      let resolvePromise: () => void = () => {};
      const slowSubmit = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          }),
      );

      render(
        <FreeJournalEntryGrid
          accounts={mockAccounts}
          baseCurrency={baseCurrency}
          onSubmit={slowSubmit}
          onCancel={jest.fn()}
          loading={false}
          initialValues={{
            accountingDate: '2026-08-16',
            description: 'Asiento debouncing test',
            lines: [
              { id: 'l1', accountId: 'acc-caja', debitAmount: 100, creditAmount: '' },
              { id: 'l2', accountId: 'acc-banco', debitAmount: '', creditAmount: 100 },
            ],
          }}
        />,
      );

      const submitBtn = screen.getByRole('button', { name: /Guardar Asiento/i });

      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });
      fireEvent.keyDown(window, { key: 'Enter', code: 'Enter', ctrlKey: true });

      fireEvent.click(submitBtn);

      expect(slowSubmit).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePromise();
      });
    });
  });
});
