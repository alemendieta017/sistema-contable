import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AccountsList from '../components/AccountsList';

jest.mock('lucide-react', () => ({
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
}));

describe('AccountsList (US2)', () => {
  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Caja Central',
      type: 'ASSET' as const,
      balance: 5000,
      isCashOrBank: true,
      currencyCode: 'PYG',
      currencySymbol: '₲',
    },
    {
      id: 'acc-2',
      name: 'Vehículo',
      type: 'ASSET' as const,
      balance: 50000,
      isCashOrBank: false,
      currencyCode: 'PYG',
      currencySymbol: '₲',
    },
  ];

  test('should render Caja/Banco badge for liquid account and not render inline checkbox', () => {
    render(
      <AccountsList
        accounts={mockAccounts}
        onDelete={jest.fn()}
        onToggleCashOrBank={jest.fn()}
      />,
    );

    expect(screen.getByText('Caja Central')).toBeInTheDocument();
    expect(screen.getByText('Caja/Banco')).toBeInTheDocument();
    expect(screen.queryByText('Líquido')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
