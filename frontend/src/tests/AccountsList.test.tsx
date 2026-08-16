import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountsList from '../components/AccountsList';

jest.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  RotateCcw: () => <span data-testid="reactivate-icon">Reactivate</span>,
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
  ];

  test('should render Caja/Banco badge for liquid account', () => {
    render(
      <AccountsList accounts={mockAccounts} onDelete={jest.fn()} onToggleCashOrBank={jest.fn()} />,
    );

    expect(screen.getByText('Caja Central')).toBeInTheDocument();
    expect(screen.getByText('Caja/Banco')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  test('should render Inactiva badge and Reactivar button for inactive account', () => {
    const onReactivate = jest.fn();
    render(<AccountsList accounts={mockAccounts} onReactivate={onReactivate} />);

    expect(screen.getByText('Vehículo')).toBeInTheDocument();
    expect(screen.getByText('Inactiva')).toBeInTheDocument();

    const reactivateBtn = screen.getByRole('button', { name: /Reactivar/i });
    expect(reactivateBtn).toBeInTheDocument();

    fireEvent.click(reactivateBtn);
    expect(onReactivate).toHaveBeenCalledWith('acc-2');
  });

  test('should render Desactivar button for active account when onDeactivate is provided', () => {
    const onDeactivate = jest.fn();
    render(<AccountsList accounts={mockAccounts} onDeactivate={onDeactivate} />);

    const deactivateBtn = screen.getByRole('button', { name: /Desactivar/i });
    expect(deactivateBtn).toBeInTheDocument();

    fireEvent.click(deactivateBtn);
    expect(onDeactivate).toHaveBeenCalledWith('acc-1');
  });
});
