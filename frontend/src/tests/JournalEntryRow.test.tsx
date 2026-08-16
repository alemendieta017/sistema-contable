import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import JournalEntryRow from '../components/JournalEntryRow';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  ChevronDown: () => <span data-testid="chevron-icon">Chevron</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
}));

describe('JournalEntryRow Component', () => {
  const mockAccounts = [
    { id: 'acc-1', name: 'Caja Chica', type: 'ASSET' },
    { id: 'acc-2', name: 'Servicios Básicos', type: 'EXPENSE' },
  ];

  const defaultProps = {
    entry: { accountId: '', entryType: 'DEBIT' as const, amount: 100 as number | '' },
    accounts: mockAccounts,
    index: 0,
    onUpdate: jest.fn(),
    onRemove: jest.fn(),
    canRemove: true,
    baseCurrency: { code: 'USD', symbol: '$', decimalPlaces: 2 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders selected account name in combobox input when accountId is set', () => {
    render(
      <JournalEntryRow {...defaultProps} entry={{ ...defaultProps.entry, accountId: 'acc-1' }} />,
    );
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Caja Chica');
  });

  test('opens dropdown on focus or click and shows all accounts when search is empty', () => {
    render(<JournalEntryRow {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByText('Caja Chica')).toBeInTheDocument();
    expect(screen.getByText('Servicios Básicos')).toBeInTheDocument();
  });

  test('calls onUpdate when selecting an account option', () => {
    render(<JournalEntryRow {...defaultProps} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const option = screen.getByText('Servicios Básicos');
    fireEvent.mouseDown(option);

    expect(defaultProps.onUpdate).toHaveBeenCalledWith(0, { accountId: 'acc-2' });
  });

  test('calls onQuickCreateAccount when explicit Crear Cuenta option is clicked', () => {
    const onQuickCreate = jest.fn();
    render(<JournalEntryRow {...defaultProps} onQuickCreateAccount={onQuickCreate} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    const createBtn = screen.getByText('Crear Cuenta');
    expect(createBtn).toBeInTheDocument();
    fireEvent.mouseDown(createBtn);

    expect(onQuickCreate).toHaveBeenCalledWith('');
  });

  test('shows dynamic search shortcut when search does not match existing accounts', () => {
    const onQuickCreate = jest.fn();
    render(<JournalEntryRow {...defaultProps} onQuickCreateAccount={onQuickCreate} />);

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Servicios Tigo' } });

    const dynamicOption = screen.getByText('Crear cuenta "Servicios Tigo"');
    expect(dynamicOption).toBeInTheDocument();

    fireEvent.mouseDown(dynamicOption);
    expect(onQuickCreate).toHaveBeenCalledWith('Servicios Tigo');
  });

  test('excludes inactive accounts from combobox options unless currently assigned to row', () => {
    const accountsWithInactive = [
      { id: 'acc-1', name: 'Caja Activa', type: 'ASSET', status: 'ACTIVE' },
      { id: 'acc-2', name: 'Caja Inactiva', type: 'ASSET', status: 'INACTIVE' },
      { id: 'acc-3', name: 'Banco Inactivo Asignado', type: 'ASSET', status: 'INACTIVE' },
    ];

    // Case 1: row with empty accountId does not show inactive accounts
    const { rerender } = render(
      <JournalEntryRow
        {...defaultProps}
        accounts={accountsWithInactive}
        entry={{ accountId: '', entryType: 'DEBIT', amount: '' }}
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByText('Caja Activa')).toBeInTheDocument();
    expect(screen.queryByText('Caja Inactiva')).not.toBeInTheDocument();

    // Case 2: row with acc-3 assigned retains acc-3 for visibility
    rerender(
      <JournalEntryRow
        {...defaultProps}
        accounts={accountsWithInactive}
        entry={{ accountId: 'acc-3', entryType: 'DEBIT', amount: 50 }}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveValue('Banco Inactivo Asignado');
  });

  test('displays available balance for ASSET and LIABILITY accounts but not for EXPENSE/INCOME', () => {
    const accountsWithBalances = [
      { id: 'acc-1', name: 'Caja Chica', type: 'ASSET', balance: 1500 },
      { id: 'acc-2', name: 'Tarjeta Crédito', type: 'LIABILITY', balance: -500 },
      { id: 'acc-3', name: 'Supermercado', type: 'EXPENSE', balance: 800 },
    ];

    // Case 1: ASSET account selected -> displays Saldo in row header
    const { rerender } = render(
      <JournalEntryRow
        {...defaultProps}
        accounts={accountsWithBalances}
        entry={{ accountId: 'acc-1', entryType: 'DEBIT', amount: 100 }}
      />,
    );

    expect(screen.getByText(/Saldo:/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.500,00/i)).toBeInTheDocument();

    // Case 2: EXPENSE account selected -> does not display Saldo in row header
    rerender(
      <JournalEntryRow
        {...defaultProps}
        accounts={accountsWithBalances}
        entry={{ accountId: 'acc-3', entryType: 'DEBIT', amount: 100 }}
      />,
    );

    expect(screen.queryByText(/Saldo:/i)).not.toBeInTheDocument();

    // Case 3: In dropdown, ASSET and LIABILITY show their balances, but EXPENSE does not show 800
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.focus(input);

    expect(screen.getByText(/1\.500,00/i)).toBeInTheDocument();
    expect(screen.getByText(/-.*500,00/i)).toBeInTheDocument();
    expect(screen.queryByText(/800,00/i)).not.toBeInTheDocument();
  });
});
