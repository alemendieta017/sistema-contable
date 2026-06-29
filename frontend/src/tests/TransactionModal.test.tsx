import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionModal from '../components/TransactionModal';
import { api } from '../services/api';
import { formatCurrency, formatLocalDateWithOffset } from '../lib/utils';

// Mock the API service
jest.mock('../services/api', () => ({
  api: {
    accounts: {
      list: jest.fn(),
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
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  CheckCircle2: () => <span data-testid="check-icon">Check</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  ChevronDown: () => <span data-testid="chevron-icon">Chevron</span>,
}));

describe('TransactionModal Double-Entry Validation', () => {
  const mockAccounts = [
    { id: 'acc-1', name: 'Efectivo', type: 'ASSET', currencyId: 'cur-usd' },
    { id: 'acc-2', name: 'Comida', type: 'EXPENSE', currencyId: 'cur-usd' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (api.accounts.list as jest.Mock).mockResolvedValue(mockAccounts);
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { code: 'USD', symbol: '$', decimalPlaces: 2, isBase: true },
    ]);
  });

  test('should load accounts and display the form', async () => {
    render(<TransactionModal onClose={jest.fn()} />);

    expect(screen.getByText(/Registrar Asiento/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(api.accounts.list).toHaveBeenCalled();
    });
  });

  test('should keep submit button disabled if debits and credits do not balance', async () => {
    render(<TransactionModal onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Guardar Asiento/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardar Asiento/i });
    expect(submitBtn).toBeDisabled();

    // Select account for entry 1 (DEBIT) and set amount to 100
    const select1 = screen.getAllByRole('combobox')[0];
    const amount1 = screen.getAllByPlaceholderText('0.00')[0];

    fireEvent.change(select1, { target: { value: 'acc-1' } });
    fireEvent.change(amount1, { target: { value: '100' } });

    // Select account for entry 2 (CREDIT) and set amount to 80 (Unbalanced!)
    const select2 = screen.getAllByRole('combobox')[1];
    const amount2 = screen.getAllByPlaceholderText('0.00')[1];

    fireEvent.change(select2, { target: { value: 'acc-2' } });
    fireEvent.change(amount2, { target: { value: '80' } });

    // Difference should be 20 and submit button should remain disabled
    expect(submitBtn).toBeDisabled();
    expect(
      screen.getByText(formatCurrency(20, { code: 'USD', symbol: '$', decimalPlaces: 2 })),
    ).toBeInTheDocument();
  });

  test('should enable submit button and call api.transactions.create on balanced entry', async () => {
    (api.transactions.create as jest.Mock).mockResolvedValue({ id: 'new-tx' });
    const onCloseMock = jest.fn();

    render(<TransactionModal onClose={onCloseMock} />);

    await waitFor(() => {
      expect(screen.getByText(/Guardar Asiento/i)).toBeInTheDocument();
    });

    const descInput = screen.getByPlaceholderText(/Ej. Compra alimentos/i);
    fireEvent.change(descInput, { target: { value: 'Asiento de Prueba' } });

    // Set DEBIT of 100
    const select1 = screen.getAllByRole('combobox')[0];
    const amount1 = screen.getAllByPlaceholderText('0.00')[0];
    fireEvent.change(select1, { target: { value: 'acc-1' } });
    fireEvent.change(amount1, { target: { value: '100' } });

    // Set CREDIT of 100 (Balanced!)
    const select2 = screen.getAllByRole('combobox')[1];
    const amount2 = screen.getAllByPlaceholderText('0.00')[1];
    fireEvent.change(select2, { target: { value: 'acc-2' } });
    fireEvent.change(amount2, { target: { value: '100' } });

    const submitBtn = screen.getByRole('button', { name: /Guardar Asiento/i });
    expect(submitBtn).toBeEnabled();

    // Click submit
    fireEvent.click(submitBtn);

    const getLocalDateString = () => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const expectedDate = formatLocalDateWithOffset(getLocalDateString());

    await waitFor(() => {
      expect(api.transactions.create).toHaveBeenCalledWith({
        date: expectedDate,
        description: 'Asiento de Prueba',
        entries: [
          { accountId: 'acc-1', entryType: 'DEBIT', amount: 100 },
          { accountId: 'acc-2', entryType: 'CREDIT', amount: 100 },
        ],
      });
    });
  });
});
