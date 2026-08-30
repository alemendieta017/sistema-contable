import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AutofillModal } from '../components/budgets/AutofillModal';
import { api } from '../services/api';
import { BudgetDriverType } from '@sistema-contable/shared';

jest.mock('../services/api', () => ({
  api: {
    budgets: {
      applyDriver: jest.fn(),
      baselineActuals: jest.fn(),
      updateBudgetMatrix: jest.fn(),
    },
  },
}));

describe('AutofillModal Component (US2)', () => {
  const mockPeriods = [
    { id: 'period-1', name: '2026-01', friendlyName: 'Enero 2026', status: 'OPEN' },
    { id: 'period-2', name: '2026-02', friendlyName: 'Febrero 2026', status: 'OPEN' },
    { id: 'period-3', name: '2026-03', friendlyName: 'Marzo 2026', status: 'OPEN' },
    { id: 'period-4', name: '2026-04', friendlyName: 'Abril 2026', status: 'CLOSED' },
  ];

  const mockAccount = {
    accountId: 'acc-123',
    accountCode: '5.1.01.01',
    accountName: 'Servicios de Internet y Telecom',
    accountType: 'EXPENSE',
    rowTotal: 120000,
    amounts: {
      'period-1': 10000,
      'period-2': 10000,
      'period-3': 10000,
      'period-4': 10000,
    },
  };

  const defaultProps = {
    account: mockAccount,
    periods: mockPeriods,
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render modal header with account name and simple actions', () => {
    render(<AutofillModal {...defaultProps} />);

    expect(screen.getByText('Rellenar Partida')).toBeInTheDocument();
    expect(screen.getByText(/Servicios de Internet y Telecom/)).toBeInTheDocument();
    expect(screen.getByText('Replicar monto hacia adelante')).toBeInTheDocument();
    expect(screen.getByText('Traer real del año anterior')).toBeInTheDocument();
    expect(screen.getByText('Limpiar montos')).toBeInTheDocument();
  });

  test('should apply forward fill (FORWARD_FILL) from baseline month', async () => {
    (api.budgets.applyDriver as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option: Replicar monto hacia adelante
    fireEvent.click(screen.getByText('Replicar monto hacia adelante'));

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));

    await waitFor(() => {
      expect(api.budgets.applyDriver).toHaveBeenCalledWith({
        accountId: 'acc-123',
        subRowId: undefined,
        driverType: BudgetDriverType.FORWARD_FILL,
        sourcePeriodId: 'period-1',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should apply prior year actuals baseline when chosen', async () => {
    (api.budgets.baselineActuals as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option: Traer real del año anterior
    fireEvent.click(screen.getByText('Traer real del año anterior'));

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));

    await waitFor(() => {
      expect(api.budgets.baselineActuals).toHaveBeenCalledWith({
        adjustmentPercentage: 0,
        accountIds: ['acc-123'],
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should clear amounts when clear option is chosen', async () => {
    (api.budgets.updateBudgetMatrix as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option: Limpiar montos
    fireEvent.click(screen.getByText('Limpiar montos'));

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));

    await waitFor(() => {
      expect(api.budgets.updateBudgetMatrix).toHaveBeenCalled();
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });
});
