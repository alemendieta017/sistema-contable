import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BudgetMatrixPage from '../app/budgets/matrix/page';
import { api } from '../services/api';

jest.mock('../services/api', () => ({
  api: {
    currencies: {
      list: jest.fn(),
    },
    budgets: {
      getRollingMatrix: jest.fn(),
      updateBudgetMatrix: jest.fn(),
      deleteBudgetMatrixRow: jest.fn(),
    },
  },
}));

jest.mock('../hooks/useMediaQuery', () => ({
  useIsMobile: () => false,
}));

describe('BudgetMatrixPage Segmented Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'curr-1', code: 'PYG', symbol: '₲', isBase: true, decimalPlaces: 0 },
    ]);
    (api.budgets.getRollingMatrix as jest.Mock).mockResolvedValue({
      periods: [
        { id: 'p-1', name: '2026-08', status: 'OPEN' },
        { id: 'p-2', name: '2026-09', status: 'OPEN' },
        { id: 'p-3', name: '2026-10', status: 'OPEN' },
        { id: 'p-4', name: '2026-11', status: 'OPEN' },
      ],
      sections: [],
      grandTotals: {
        totalIncome: { total: 0 },
        totalExpenses: { total: 0 },
        netSavings: { total: 0 },
        operatingResult: { total: 0 },
      },
    });
  });

  test('renders all 4 segmented control buttons: Mensual, Cuatrimestral, Semestral, Anual', async () => {
    render(<BudgetMatrixPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mensual' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cuatrimestral' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Semestral' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anual' })).toBeInTheDocument();
    });
  });

  test('switching between segmented control modes queries correct month counts', async () => {
    render(<BudgetMatrixPage />);

    await waitFor(() => {
      expect(api.budgets.getRollingMatrix).toHaveBeenCalledWith(
        expect.any(String),
        4, // default desktop is four_months
      );
    });

    // Click Mensual (1 month)
    const mensualBtn = screen.getByRole('button', { name: 'Mensual' });
    fireEvent.click(mensualBtn);

    await waitFor(() => {
      expect(api.budgets.getRollingMatrix).toHaveBeenCalledWith(expect.any(String), 1);
    });

    // Click Semestral (6 months)
    const semestralBtn = screen.getByRole('button', { name: 'Semestral' });
    fireEvent.click(semestralBtn);

    await waitFor(() => {
      expect(api.budgets.getRollingMatrix).toHaveBeenCalledWith(expect.any(String), 6);
    });

    // Click Anual (12 months)
    const anualBtn = screen.getByRole('button', { name: 'Anual' });
    fireEvent.click(anualBtn);

    await waitFor(() => {
      expect(api.budgets.getRollingMatrix).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-01$/),
        12,
      );
    });
  });
});
