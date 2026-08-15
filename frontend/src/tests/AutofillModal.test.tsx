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
    fiscalYearId: 'fy-2026',
    account: mockAccount,
    periods: mockPeriods,
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render modal header with account name, code, and 5 natural language distribution options', () => {
    render(<AutofillModal {...defaultProps} />);

    expect(screen.getByText('Autorellenar Presupuesto')).toBeInTheDocument();
    expect(screen.getByText('5.1.01.01')).toBeInTheDocument();
    expect(screen.getByText(/Servicios de Internet y Telecom/)).toBeInTheDocument();

    // Verify all 5 natural language options are present
    expect(screen.getByText('Distribuir monto anual parejo')).toBeInTheDocument();
    expect(screen.getByText('Replicar valor hacia adelante')).toBeInTheDocument();
    expect(screen.getByText('Incremento porcentual mensual')).toBeInTheDocument();
    expect(screen.getByText('Ponderación histórica')).toBeInTheDocument();
    expect(screen.getByText('Traer real del año anterior con ajuste %')).toBeInTheDocument();
  });

  test('should apply flat prorate distribution (FLAT_PRORATE) when chosen', async () => {
    (api.budgets.applyDriver as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option 1: Distribuir monto anual parejo
    fireEvent.click(screen.getByText('Distribuir monto anual parejo'));

    const amountInput = screen.getByPlaceholderText('Ej: 120000');
    fireEvent.change(amountInput, { target: { value: '240000' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar Distribución/i }));

    await waitFor(() => {
      expect(api.budgets.applyDriver).toHaveBeenCalledWith({
        fiscalYearId: 'fy-2026',
        accountId: 'acc-123',
        subRowId: undefined,
        driverType: BudgetDriverType.FLAT_PRORATE,
        annualTotal: 240000,
        growthPercentage: 5,
        sourcePeriodId: 'period-1',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should apply forward fill (FORWARD_FILL) from baseline month', async () => {
    (api.budgets.applyDriver as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option 2: Replicar valor hacia adelante
    fireEvent.click(screen.getByText('Replicar valor hacia adelante'));

    // Change baseline month
    const periodSelect = screen.getByRole('combobox');
    fireEvent.change(periodSelect, { target: { value: 'period-2' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar Distribución/i }));

    await waitFor(() => {
      expect(api.budgets.applyDriver).toHaveBeenCalledWith({
        fiscalYearId: 'fy-2026',
        accountId: 'acc-123',
        subRowId: undefined,
        driverType: BudgetDriverType.FORWARD_FILL,
        annualTotal: 120000,
        growthPercentage: 5,
        sourcePeriodId: 'period-2',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should apply percentage growth (PERCENTAGE_GROWTH) with custom % and baseline month', async () => {
    (api.budgets.applyDriver as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option 3: Incremento porcentual mensual
    fireEvent.click(screen.getByText('Incremento porcentual mensual'));

    const growthInput = screen.getByPlaceholderText('Ej: 5');
    fireEvent.change(growthInput, { target: { value: '8.5' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar Distribución/i }));

    await waitFor(() => {
      expect(api.budgets.applyDriver).toHaveBeenCalledWith({
        fiscalYearId: 'fy-2026',
        accountId: 'acc-123',
        subRowId: undefined,
        driverType: BudgetDriverType.PERCENTAGE_GROWTH,
        annualTotal: 120000,
        growthPercentage: 8.5,
        sourcePeriodId: 'period-1',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should apply weighted historical (WEIGHTED_HISTORICAL) distribution', async () => {
    (api.budgets.applyDriver as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option 4: Ponderación histórica
    fireEvent.click(screen.getByText('Ponderación histórica'));

    const amountInput = screen.getByPlaceholderText('Ej: 120000');
    fireEvent.change(amountInput, { target: { value: '300000' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar Distribución/i }));

    await waitFor(() => {
      expect(api.budgets.applyDriver).toHaveBeenCalledWith({
        fiscalYearId: 'fy-2026',
        accountId: 'acc-123',
        subRowId: undefined,
        driverType: BudgetDriverType.WEIGHTED_HISTORICAL,
        annualTotal: 300000,
        growthPercentage: 5,
        sourcePeriodId: 'period-1',
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should call baselineActuals when selecting prior year actuals (PRIOR_YEAR_ACTUAL)', async () => {
    (api.budgets.baselineActuals as jest.Mock).mockResolvedValue({ success: true });

    render(<AutofillModal {...defaultProps} />);

    // Click on option 5: Traer real del año anterior con ajuste %
    fireEvent.click(screen.getByText('Traer real del año anterior con ajuste %'));

    const adjustmentInput = screen.getByPlaceholderText('0 para mantener exacto, ej: 5 para +5%');
    fireEvent.change(adjustmentInput, { target: { value: '10' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Aplicar Distribución/i }));

    await waitFor(() => {
      expect(api.budgets.baselineActuals).toHaveBeenCalledWith({
        fiscalYearId: 'fy-2026',
        adjustmentPercentage: 10,
        accountIds: ['acc-123'],
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  test('should display error message on API failure', async () => {
    (api.budgets.applyDriver as jest.Mock).mockRejectedValue(
      new Error('No hay periodos abiertos para aplicar la regla.'),
    );

    render(<AutofillModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Aplicar Distribución/i }));

    await waitFor(() => {
      expect(
        screen.getByText('No hay periodos abiertos para aplicar la regla.'),
      ).toBeInTheDocument();
    });
  });

  test('should call onClose when Cancel button or Escape key is triggered', () => {
    render(<AutofillModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
