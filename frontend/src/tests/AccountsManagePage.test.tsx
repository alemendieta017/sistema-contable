import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountsManagePage from '../app/accounts/manage/page';
import { api } from '../services/api';
import { SearchProvider } from '../lib/search-context';

jest.mock('../services/api', () => ({
  api: {
    accounts: {
      summary: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    },
    currencies: {
      list: jest.fn(),
    },
  },
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">Back</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  RotateCcw: () => <span data-testid="reactivate-icon">Reactivate</span>,
  Pencil: () => <span data-testid="pencil-icon">Edit</span>,
  SlidersHorizontal: () => <span data-testid="sliders-icon">Sliders</span>,
}));

describe('AccountsManagePage Component (US1 & US2)', () => {
  const mockSummary = {
    netWorth: 10000,
    totalAssets: 10000,
    totalLiabilities: 0,
    accounts: [
      {
        id: 'acc-active-1',
        name: 'Banco Regional',
        type: 'ASSET' as const,
        balance: 10000,
        status: 'ACTIVE' as const,
        currencyCode: 'USD',
        currencySymbol: '$',
      },
      {
        id: 'acc-inactive-1',
        name: 'Caja Antigua',
        type: 'ASSET' as const,
        balance: 0,
        status: 'INACTIVE' as const,
        currencyCode: 'USD',
        currencySymbol: '$',
      },
      {
        id: 'acc-system-1',
        name: 'Resultado del Ejercicio',
        type: 'EQUITY' as const,
        balance: 0,
        status: 'ACTIVE' as const,
        systemRole: 'NET_INCOME',
        currencyCode: 'USD',
        currencySymbol: '$',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.accounts.summary as jest.Mock).mockResolvedValue(mockSummary);
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-1', code: 'USD', symbol: '$', isBase: true },
    ]);
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders active and inactive accounts with their respective status badges', async () => {
    render(
      <SearchProvider>
        <AccountsManagePage />
      </SearchProvider>,
    );

    expect(screen.getByText(/Cargando gestor/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Banco Regional')).toBeInTheDocument();
      expect(screen.getByText('Caja Antigua')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Activa').length).toBe(2);
    expect(screen.getByText('Inactiva')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
  });

  test('clicking Reactivar button calls api.accounts.update with ACTIVE status and reloads summary', async () => {
    (api.accounts.update as jest.Mock).mockResolvedValue({
      id: 'acc-inactive-1',
      status: 'ACTIVE',
    });

    render(
      <SearchProvider>
        <AccountsManagePage />
      </SearchProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Caja Antigua')).toBeInTheDocument();
    });

    const reactivateBtn = screen.getByRole('button', { name: /Reactivar/i });
    fireEvent.click(reactivateBtn);

    await waitFor(() => {
      expect(api.accounts.update).toHaveBeenCalledWith('acc-inactive-1', { status: 'ACTIVE' });
      expect(api.accounts.summary).toHaveBeenCalledTimes(2);
    });
  });

  test('clicking Desactivar button confirms dialog and calls api.accounts.update with INACTIVE status', async () => {
    (api.accounts.update as jest.Mock).mockResolvedValue({
      id: 'acc-active-1',
      status: 'INACTIVE',
    });

    render(
      <SearchProvider>
        <AccountsManagePage />
      </SearchProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Banco Regional')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole('button', { name: /Desactivar/i });
    fireEvent.click(deactivateBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(api.accounts.update).toHaveBeenCalledWith('acc-active-1', { status: 'INACTIVE' });
      expect(api.accounts.summary).toHaveBeenCalledTimes(2);
    });
  });

  test('displays suggested deactivation alert with action button when action encounters 400 error', async () => {
    (api.accounts.update as jest.Mock).mockRejectedValueOnce({
      status: 400,
      message: 'Cannot delete account with existing transactions. Deactivate the account instead.',
    });

    render(
      <SearchProvider>
        <AccountsManagePage />
      </SearchProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Banco Regional')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole('button', { name: /Desactivar/i });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Cannot delete account with existing transactions/i),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Desactivar cuenta/i })).toBeInTheDocument();
    });
  });
});
