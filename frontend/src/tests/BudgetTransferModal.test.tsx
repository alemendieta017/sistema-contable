import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetTransferModal } from '../components/budgets/BudgetTransferModal';
import { api } from '../services/api';
import {
  CashFlowDirection,
  BudgetGaugeStatus,
  BudgetControlSection,
} from '@sistema-contable/shared';

jest.mock('../services/api', () => ({
  api: {
    budgets: {
      transferFunds: jest.fn(),
      transferControl: jest.fn(),
    },
  },
}));

describe('BudgetTransferModal Component (T037 & T042)', () => {
  const mockSections: BudgetControlSection[] = [
    {
      sectionKey: 'GASTOS_VIDA',
      sectionTitle: 'Gastos de Vida',
      budgeted: 100000,
      executed: 20000,
      committed: 0,
      available: 80000,
      consumptionPercentage: 20,
      gaugeStatus: BudgetGaugeStatus.NORMAL,
      items: [
        {
          accountId: 'acc-exp-1',
          accountCode: '5.1.01.01',
          accountName: 'Servicios Básicos',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          budgeted: 50000,
          executed: 10000,
          committed: 0,
          available: 40000,
          consumptionPercentage: 20,
          gaugeStatus: BudgetGaugeStatus.NORMAL,
        },
        {
          accountId: 'acc-exp-2',
          accountCode: '5.1.01.02',
          accountName: 'Mantenimiento General',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          budgeted: 50000,
          executed: 10000,
          committed: 0,
          available: 40000,
          consumptionPercentage: 20,
          gaugeStatus: BudgetGaugeStatus.NORMAL,
        },
      ],
    },
    {
      sectionKey: 'INGRESOS',
      sectionTitle: 'Ingresos',
      budgeted: 100000,
      executed: 50000,
      committed: 0,
      available: 50000,
      consumptionPercentage: 50,
      gaugeStatus: BudgetGaugeStatus.NORMAL,
      items: [
        {
          accountId: 'acc-inc-1',
          accountCode: '4.1.01.01',
          accountName: 'Ventas de Servicios',
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          budgeted: 100000,
          executed: 50000,
          committed: 0,
          available: 50000,
          consumptionPercentage: 50,
          gaugeStatus: BudgetGaugeStatus.NORMAL,
        },
      ],
    },
  ];

  const defaultProps = {
    periodId: 'period-2026-01',
    sections: mockSections,
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render modal with eligible source and same-direction target accounts', () => {
    render(<BudgetTransferModal {...defaultProps} />);

    expect(screen.getByText('Reasignación de Presupuesto')).toBeInTheDocument();
    expect(screen.getByText(/Servicios Básicos/)).toBeInTheDocument();
  });

  test('should submit transfer when valid parameters are entered', async () => {
    (api.budgets.transferFunds as jest.Mock).mockResolvedValue({ success: true });

    render(<BudgetTransferModal {...defaultProps} />);

    // Select target account
    const selects = screen.getAllByRole('combobox');
    const targetSelect = selects[1];
    fireEvent.change(targetSelect, { target: { value: 'acc-exp-2' } });

    // Enter amount
    const amountInput = screen.getByPlaceholderText('Ej: 150000');
    fireEvent.change(amountInput, { target: { value: '15000' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Transferencia/i }));

    await waitFor(() => {
      expect(api.budgets.transferFunds).toHaveBeenCalledWith({
        periodId: 'period-2026-01',
        sourceAccountId: 'acc-exp-1',
        targetAccountId: 'acc-exp-2',
        amount: 15000,
        reason: undefined,
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });
});
