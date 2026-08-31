import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountsList from '../components/AccountsList';

jest.mock('lucide-react', () => ({
  Wallet: () => <span data-testid="wallet-icon">Wallet</span>,
  Building2: () => <span data-testid="building-icon">Building</span>,
  CreditCard: () => <span data-testid="credit-card-icon">Card</span>,
  TrendingUp: () => <span data-testid="trending-icon">Trending</span>,
  TrendingDown: () => <span data-testid="trending-down-icon">TrendingDown</span>,
  ReceiptText: () => <span data-testid="receipt-icon">Receipt</span>,
  FileText: () => <span data-testid="file-icon">File</span>,
  Landmark: () => <span data-testid="landmark-icon">Landmark</span>,
  Lock: () => <span data-testid="lock-icon">Lock</span>,
  MoreVertical: () => <span data-testid="more-icon">:</span>,
  Pencil: () => <span data-testid="pencil-icon">Edit</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  RotateCcw: () => <span data-testid="reactivate-icon">Reactivate</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  EyeOff: () => <span data-testid="eyeoff-icon">EyeOff</span>,
  SlidersHorizontal: () => <span data-testid="sliders-icon">Sliders</span>,
}));

describe('AccountsList (US1 & US2)', () => {
  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Caja Central',
      type: 'ASSET' as const,
      balance: 5000,
      isCashOrBank: true,
      status: 'ACTIVE' as const,
      currencyCode: 'PYG',
      currencySymbol: '₲',
    },
    {
      id: 'acc-2',
      name: 'Vehículo',
      type: 'ASSET' as const,
      balance: 50000,
      isCashOrBank: false,
      status: 'INACTIVE' as const,
      currencyCode: 'PYG',
      currencySymbol: '₲',
    },
    {
      id: 'acc-sys',
      name: 'Resultado del Ejercicio',
      type: 'EQUITY' as const,
      balance: 10000,
      isCashOrBank: false,
      status: 'ACTIVE' as const,
      systemRole: 'NET_INCOME',
      currencyCode: 'PYG',
      currencySymbol: '₲',
    },
  ];

  test('should render Efectivo badge for liquid account', () => {
    render(
      <AccountsList accounts={mockAccounts} onDelete={jest.fn()} onToggleCashOrBank={jest.fn()} />,
    );

    expect(screen.getByText('Caja Central')).toBeInTheDocument();
    expect(screen.getByText('Efectivo')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  test('should render Inactiva badge and Reactivar button in kebab menu for inactive account', () => {
    const onReactivate = jest.fn();
    render(<AccountsList accounts={mockAccounts} onReactivate={onReactivate} />);

    expect(screen.getByText('Vehículo')).toBeInTheDocument();
    expect(screen.getByText('Inactiva')).toBeInTheDocument();

    // Open kebab menu for inactive account
    const menuBtn = screen.getByTestId('menu-btn-acc-2');
    fireEvent.click(menuBtn);

    const reactivateBtn = screen.getByRole('button', { name: /Reactivar/i });
    expect(reactivateBtn).toBeInTheDocument();

    fireEvent.click(reactivateBtn);
    expect(onReactivate).toHaveBeenCalledWith('acc-2');
  });

  test('should render Desactivar button in kebab menu for active account when onDeactivate is provided', () => {
    const onDeactivate = jest.fn();
    render(<AccountsList accounts={mockAccounts} onDeactivate={onDeactivate} />);

    // Open kebab menu for active account
    const menuBtn = screen.getByTestId('menu-btn-acc-1');
    fireEvent.click(menuBtn);

    const deactivateBtn = screen.getByRole('button', { name: /Desactivar/i });
    expect(deactivateBtn).toBeInTheDocument();

    fireEvent.click(deactivateBtn);
    expect(onDeactivate).toHaveBeenCalledWith('acc-1');
  });

  test('should trigger onAdjustBalance when clicking Modificar saldo in context menu', () => {
    const onAdjustBalance = jest.fn();
    render(
      <AccountsList
        accounts={mockAccounts}
        onDelete={jest.fn()}
        onToggleCashOrBank={jest.fn()}
        onAdjustBalance={onAdjustBalance}
      />,
    );

    const menuBtn = screen.getByTestId('menu-btn-acc-1');
    fireEvent.click(menuBtn);

    const adjustBtn = screen.getByText('Modificar saldo');
    fireEvent.click(adjustBtn);

    expect(onAdjustBalance).toHaveBeenCalledWith(mockAccounts[0]);
  });

  test('should trigger onEdit when Editar is clicked in the menu', () => {
    const onEdit = jest.fn();
    render(<AccountsList accounts={mockAccounts} onEdit={onEdit} />);

    const menuBtn = screen.getByTestId('menu-btn-acc-1');
    fireEvent.click(menuBtn);

    const editBtn = screen.getByRole('button', { name: /Editar/i });
    expect(editBtn).toBeInTheDocument();

    fireEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalledWith(mockAccounts[0]);
  });

  test('should trigger onAccountClick when account row is clicked', () => {
    const onAccountClick = jest.fn();
    render(<AccountsList accounts={mockAccounts} onAccountClick={onAccountClick} />);

    const accountName = screen.getByText('Caja Central');
    fireEvent.click(accountName);

    expect(onAccountClick).toHaveBeenCalledWith(mockAccounts[0]);
  });

  test('should render subtle Lock indicator for system account and omit destructive options in menu', () => {
    const onDelete = jest.fn();
    const onDeactivate = jest.fn();
    render(
      <AccountsList accounts={mockAccounts} onDelete={onDelete} onDeactivate={onDeactivate} />,
    );

    expect(screen.getByText('Resultado del Ejercicio')).toBeInTheDocument();
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();

    // Open menu for system account
    const menuBtn = screen.getByTestId('menu-btn-acc-sys');
    fireEvent.click(menuBtn);

    // Destructive options should not appear for system account
    expect(screen.queryByRole('button', { name: /Desactivar cuenta/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar cuenta/i })).not.toBeInTheDocument();
  });

  test('should render Wallet icon for cash/bank, Building icon for other assets, and TrendingDown for expenses', () => {
    const mixedAccounts = [
      {
        id: 'acc-1',
        name: 'Caja Central',
        type: 'ASSET' as const,
        balance: 5000,
        isCashOrBank: true,
        status: 'ACTIVE' as const,
      },
      {
        id: 'acc-2',
        name: 'Inmueble Oficina',
        type: 'ASSET' as const,
        balance: 50000,
        isCashOrBank: false,
        status: 'ACTIVE' as const,
      },
      {
        id: 'acc-3',
        name: 'Supermercado',
        type: 'EXPENSE' as const,
        balance: 2000,
        isCashOrBank: false,
        status: 'ACTIVE' as const,
      },
    ];

    render(<AccountsList accounts={mixedAccounts} />);

    expect(screen.getByTestId('wallet-icon')).toBeInTheDocument();
    expect(screen.getByTestId('building-icon')).toBeInTheDocument();
  });

  test('should not render balances or subtotals when activeTab is CATEGORIES', () => {
    const categoryAccounts = [
      {
        id: 'acc-inc-1',
        name: 'Salario',
        type: 'INCOME' as const,
        balance: 15000000,
        status: 'ACTIVE' as const,
      },
      {
        id: 'acc-exp-1',
        name: 'Alquiler',
        type: 'EXPENSE' as const,
        balance: 2500000,
        status: 'ACTIVE' as const,
      },
    ];

    render(<AccountsList accounts={categoryAccounts} activeTab="CATEGORIES" />);

    expect(screen.getByText('Salario')).toBeInTheDocument();
    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByTestId('trending-down-icon')).toBeInTheDocument();
    expect(screen.queryByText(/Subtotal:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/15\.000\.000/)).not.toBeInTheDocument();
  });
});
