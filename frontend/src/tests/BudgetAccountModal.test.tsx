import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetAccountModal } from '../components/budgets/BudgetAccountModal';
import { api } from '../services/api';
import { CashFlowDirection } from '@sistema-contable/shared';

jest.mock('../services/api', () => ({
  api: {
    accounts: {
      list: jest.fn(),
    },
  },
}));

describe('BudgetAccountModal Component (T022 & T042)', () => {
  const mockAccounts = [
    {
      id: 'acc-asset-1',
      name: 'Fondo Mutuo Renta Fija',
      code: '1.2.01.01',
      type: 'ASSET',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-asset-2',
      name: 'Acciones de Inversión',
      code: '1.2.02.01',
      type: 'ASSET',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
    {
      id: 'acc-liab-1',
      name: 'Préstamo Bancario Itaú',
      code: '2.1.01.01',
      type: 'LIABILITY',
      isCashOrBank: false,
      status: 'ACTIVE',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    targetSection: 'ASSET',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.accounts.list as jest.Mock).mockResolvedValue(mockAccounts);
  });

  test('should render modal with 3 core inputs: Account Selector, Direction Selector, and Concept input', async () => {
    render(<BudgetAccountModal {...defaultProps} />);

    // Check header for Asset section
    expect(screen.getByText('Presupuestar Activo (Ahorro e Inversiones)')).toBeInTheDocument();

    // 1. Account selector
    await waitFor(() => {
      expect(api.accounts.list).toHaveBeenCalledWith('ACTIVE');
      expect(screen.getByText(/1.2.01.01 - Fondo Mutuo Renta Fija/)).toBeInTheDocument();
    });

    // 2. Flow direction selectors
    expect(screen.getByText('Salida de efectivo')).toBeInTheDocument();
    expect(screen.getByText('Entrada de efectivo')).toBeInTheDocument();

    // 3. Concept / Label input
    expect(screen.getByPlaceholderText(/Ej: Aporte Fondo Mutuo/i)).toBeInTheDocument();
  });

  test('should exclude inactive accounts from selection list', async () => {
    (api.accounts.list as jest.Mock).mockResolvedValue([
      {
        id: 'acc-active',
        name: 'Inversión Activa',
        code: '1.2.01.01',
        type: 'ASSET',
        isCashOrBank: false,
        status: 'ACTIVE',
      },
      {
        id: 'acc-inactive',
        name: 'Inversión Inactiva',
        code: '1.2.01.02',
        type: 'ASSET',
        isCashOrBank: false,
        status: 'INACTIVE',
      },
    ]);

    render(<BudgetAccountModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1.2.01.01 - Inversión Activa/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Inversión Inactiva/)).not.toBeInTheDocument();
  });

  test('should submit correctly with selected account, direction, and concept', async () => {
    render(<BudgetAccountModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1.2.01.01 - Fondo Mutuo Renta Fija/)).toBeInTheDocument();
    });

    // Select direction: Entrada de efectivo
    fireEvent.click(screen.getByText('Entrada de efectivo'));

    // Edit concept
    const conceptInput = screen.getByPlaceholderText(/Ej: Aporte Fondo Mutuo/i);
    fireEvent.change(conceptInput, { target: { value: 'Rescate Programado Diciembre' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Agregar Fila de Activo/i }));

    expect(defaultProps.onSave).toHaveBeenCalledWith({
      account: {
        id: 'acc-asset-1',
        name: 'Fondo Mutuo Renta Fija',
        code: '1.2.01.01',
        type: 'ASSET',
      },
      label: 'Rescate Programado Diciembre',
      direction: CashFlowDirection.INGRESO_EFECTIVO,
      subRowId: null,
    });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('should handle edit mode for existing row', async () => {
    render(
      <BudgetAccountModal
        {...defaultProps}
        editRow={{
          accountId: 'acc-liab-1',
          accountName: 'Préstamo Bancario Itaú',
          accountCode: '2.1.01.01',
          accountType: 'LIABILITY',
          subRowId: 'sub-1',
          subRowLabel: 'Cuota Préstamo 1',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
        }}
      />,
    );

    expect(screen.getByText('Editar Fila Presupuestaria')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByDisplayValue('Cuota Préstamo 1')).toBeInTheDocument();
    });

    // Submit edit
    fireEvent.click(screen.getByRole('button', { name: /Guardar Cambios/i }));

    expect(defaultProps.onSave).toHaveBeenCalledWith({
      account: {
        id: 'acc-liab-1',
        name: 'Préstamo Bancario Itaú',
        code: '2.1.01.01',
        type: 'LIABILITY',
      },
      label: 'Cuota Préstamo 1',
      direction: CashFlowDirection.EGRESO_EFECTIVO,
      subRowId: 'sub-1',
    });
  });

  test('should close when cancel or Escape is pressed', async () => {
    render(<BudgetAccountModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/1.2.01.01 - Fondo Mutuo Renta Fija/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
