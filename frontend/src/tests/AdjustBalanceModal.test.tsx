import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdjustBalanceModal from '../components/AdjustBalanceModal';
import { api } from '../services/api';
import type { AccountOption } from '../types/account';

jest.mock('../services/api', () => ({
  api: {
    accounts: {
      adjustBalance: jest.fn(),
    },
  },
}));

jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  Landmark: () => <span data-testid="landmark-icon">Capital</span>,
  ReceiptText: () => <span data-testid="receipt-icon">Category</span>,
  ArrowUpRight: () => <span data-testid="up-icon">Up</span>,
  ArrowDownRight: () => <span data-testid="down-icon">Down</span>,
  SlidersHorizontal: () => <span data-testid="sliders-icon">Sliders</span>,
  Search: () => <span data-testid="search-icon">Search</span>,
  ChevronDown: () => <span data-testid="chevron-icon">v</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

describe('AdjustBalanceModal', () => {
  const mockAccount = {
    id: 'acc-bank-1',
    name: 'Banco Itaú',
    type: 'ASSET' as const,
    balance: 1000000,
    currencyCode: 'PYG',
    currencySymbol: '₲',
    decimalPlaces: 0,
  };

  const mockAllAccounts: AccountOption[] = [
    {
      id: 'acc-bank-1',
      name: 'Banco Itaú',
      type: 'ASSET',
      balance: 1000000,
    },
    {
      id: 'acc-inc-1',
      name: 'Sueldo',
      type: 'INCOME',
      balance: 0,
    },
    {
      id: 'acc-exp-1',
      name: 'Ajuste de Caja',
      type: 'EXPENSE',
      balance: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders current balance and formats target balance with thousand separators', () => {
    render(
      <AdjustBalanceModal
        isOpen={true}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
        account={mockAccount}
        allAccounts={mockAllAccounts}
      />,
    );

    expect(screen.getByRole('heading', { name: /Modificar Saldo/i })).toBeInTheDocument();
    expect(screen.getByText(/Banco Itaú • Activo/i)).toBeInTheDocument();

    const input = screen.getByLabelText(/Nuevo Saldo de la Cuenta/i) as HTMLInputElement;
    expect(input.value).toBe('1.000.000');
  });

  test('submits balance adjustment against CAPITAL by default', async () => {
    (api.accounts.adjustBalance as jest.Mock).mockResolvedValue({ success: true });
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <AdjustBalanceModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        account={mockAccount}
        allAccounts={mockAllAccounts}
      />,
    );

    const input = screen.getByLabelText(/Nuevo Saldo de la Cuenta/i);
    fireEvent.change(input, { target: { value: '1500000' } });

    await waitFor(() => {
      expect(screen.getByText(/Contabilizar contra capital/i)).toBeInTheDocument();
      expect(screen.getByText(/Contabilizar como Ingreso/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Modificar Saldo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.accounts.adjustBalance).toHaveBeenCalledWith('acc-bank-1', {
        targetBalance: 1500000,
        adjustmentType: 'CAPITAL',
        categoryId: null,
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('dynamically shows "Contabilizar como Egreso" when ASSET balance decreases', async () => {
    (api.accounts.adjustBalance as jest.Mock).mockResolvedValue({ success: true });
    const onClose = jest.fn();
    const onSuccess = jest.fn();

    render(
      <AdjustBalanceModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        account={mockAccount}
        allAccounts={mockAllAccounts}
      />,
    );

    const input = screen.getByLabelText(/Nuevo Saldo de la Cuenta/i);
    fireEvent.change(input, { target: { value: '800000' } });

    await waitFor(() => {
      expect(screen.getByText(/Contabilizar como Egreso/i)).toBeInTheDocument();
    });

    const categoryCard = screen.getByText(/Contabilizar como Egreso/i);
    fireEvent.click(categoryCard);

    // AccountPickerSheet should now be rendered with label Categoría de Egreso
    await waitFor(() => {
      expect(screen.getByText('Categoría de Egreso')).toBeInTheDocument();
    });
  });
});
