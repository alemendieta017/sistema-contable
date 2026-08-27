import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountsPage from '../app/accounts/page';
import { api } from '../services/api';

jest.mock('../services/api', () => ({
  api: {
    accounts: {
      summary: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    currencies: {
      list: jest.fn(),
    },
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/accounts',
  useSearchParams: () => ({ get: jest.fn() }),
}));

jest.mock('../lib/search-context', () => ({
  useSearch: () => ({ searchQuery: '' }),
}));

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  Wallet: () => <span data-testid="wallet-icon">Wallet</span>,
  ShieldAlert: () => <span data-testid="shield-icon">Shield</span>,
  BadgeAlert: () => <span data-testid="badge-icon">Badge</span>,
  Building2: () => <span data-testid="building-icon">Building</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Edit2: () => <span data-testid="edit-icon">Edit</span>,
  Banknote: () => <span data-testid="banknote-icon">Banknote</span>,
  Eye: () => <span data-testid="eye-icon">Eye</span>,
  EyeOff: () => <span data-testid="eyeoff-icon">EyeOff</span>,
  Briefcase: () => <span data-testid="briefcase-icon">Briefcase</span>,
  Tags: () => <span data-testid="tags-icon">Tags</span>,
  Layers: () => <span data-testid="layers-icon">Layers</span>,
  ArrowUpRight: () => <span data-testid="arrow-up-icon">ArrowUp</span>,
  ArrowDownRight: () => <span data-testid="arrow-down-icon">ArrowDown</span>,
}));

describe('Default Accounts Creation (US1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-base', code: 'PYG', symbol: '₲', isBase: true },
    ]);
  });

  test('should create default accounts with isCashOrBank: true for Efectivo and Cuenta Bancaria', async () => {
    (api.accounts.summary as jest.Mock).mockResolvedValue({
      netWorth: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      accounts: [],
    });
    (api.accounts.create as jest.Mock).mockResolvedValue({ id: 'new-acc' });

    render(<AccountsPage />);

    await waitFor(() => {
      expect(screen.getByText('Generar Cuentas Predeterminadas')).toBeInTheDocument();
    });

    const generateBtn = screen.getByRole('button', { name: /Generar Cuentas Predeterminadas/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(api.accounts.create).toHaveBeenCalledWith({
        name: 'Efectivo',
        type: 'ASSET',
        currencyId: 'cur-base',
        isCashOrBank: true,
      });

      expect(api.accounts.create).toHaveBeenCalledWith({
        name: 'Cuenta Bancaria',
        type: 'ASSET',
        currencyId: 'cur-base',
        isCashOrBank: true,
      });

      expect(api.accounts.create).toHaveBeenCalledWith({
        name: 'Comida',
        type: 'EXPENSE',
        currencyId: 'cur-base',
        isCashOrBank: false,
      });
    });
  });
});
