import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetMatrixGrid } from '../components/budgets/BudgetMatrixGrid';
import {
  BudgetMatrixResponse,
  BudgetMatrixSectionKey,
  CashFlowDirection,
} from '@sistema-contable/shared';

jest.mock('../services/api', () => ({
  api: {
    accounts: {
      list: jest.fn().mockResolvedValue([]),
    },
  },
}));

const mockMatrixData: BudgetMatrixResponse = {
  periods: [
    { id: 'p-1', name: '2026-08', friendlyName: 'Ago 2026', status: 'OPEN' },
    { id: 'p-2', name: '2026-09', friendlyName: 'Set 2026', status: 'OPEN' },
    { id: 'p-3', name: '2026-10', friendlyName: 'Oct 2026', status: 'OPEN' },
    { id: 'p-4', name: '2026-11', friendlyName: 'Nov 2026', status: 'OPEN' },
  ],
  sections: [
    {
      sectionKey: BudgetMatrixSectionKey.INGRESOS,
      sectionTitle: 'Ingresos',
      sectionTotals: {
        'p-1': 1000000,
        'p-2': 1000000,
        'p-3': 1000000,
        'p-4': 1000000,
        total: 4000000,
      },
      rows: [
        {
          accountId: 'acc-ing-1',
          accountCode: '4.1.01',
          accountName: 'Salario Principal',
          accountType: 'INCOME',
          subRowId: null,
          subRowLabel: null,
          cashFlowDirection: null,
          amounts: { 'p-1': 1000000, 'p-2': 1000000, 'p-3': 1000000, 'p-4': 1000000 },
          rowTotal: 4000000,
        },
      ],
    },
    {
      sectionKey: BudgetMatrixSectionKey.AHORRO_INVERSIONES,
      sectionTitle: 'Ahorros e Inversiones',
      sectionTotals: { 'p-1': 300000, 'p-2': 300000, 'p-3': 300000, 'p-4': 300000, total: 1200000 },
      rows: [
        {
          accountId: 'acc-asset-1',
          accountCode: '1.2.01',
          accountName: 'Fondo Mutuo Vanguard',
          accountType: 'ASSET',
          subRowId: 'sub-1',
          subRowLabel: 'Aporte Mensual Vanguard',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          amounts: { 'p-1': 300000, 'p-2': 300000, 'p-3': 300000, 'p-4': 300000 },
          rowTotal: 1200000,
        },
        {
          accountId: 'acc-asset-2',
          accountCode: '1.2.02',
          accountName: 'Fondo Acciones',
          accountType: 'ASSET',
          subRowId: 'sub-2',
          subRowLabel: 'Rescate Fondo Acciones',
          cashFlowDirection: CashFlowDirection.INGRESO_EFECTIVO,
          amounts: { 'p-1': 150000, 'p-2': 150000, 'p-3': 150000, 'p-4': 150000 },
          rowTotal: 600000,
        },
        {
          accountId: 'acc-asset-3',
          accountCode: '1.2.03',
          accountName: 'Cripto Ahorro',
          accountType: 'ASSET',
          subRowId: 'sub-3',
          subRowLabel: 'Staking ETH',
          cashFlowDirection: CashFlowDirection.EGRESO_EFECTIVO,
          amounts: { 'p-1': 50000, 'p-2': 50000, 'p-3': 50000, 'p-4': 50000 },
          rowTotal: 200000,
        },
      ],
    },
  ],
};

describe('BudgetMatrixGrid Options Menu & Nature Editing', () => {
  const defaultProps = {
    matrixData: mockMatrixData,
    activePeriodId: 'p-1',
    baseCurrency: { code: 'PYG', symbol: '₲', decimalPlaces: 0 },
    onCellChange: jest.fn(),
    onOpenAutofill: jest.fn(),
    onAddBalanceRow: jest.fn(),
    onEditBalanceRow: jest.fn(),
    onDeleteRow: jest.fn(),
    dirtyCells: new Set<string>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Monthly View Mode', () => {
    test('renders direction icons and options menu with nature editing and replicate option', () => {
      render(<BudgetMatrixGrid {...defaultProps} viewMode="monthly" />);

      // Direction icons with titles
      expect(screen.getByText('Aporte Mensual Vanguard')).toBeInTheDocument();
      expect(screen.getAllByTitle('Salida de efectivo').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByTitle('Entrada de efectivo').length).toBeGreaterThanOrEqual(1);

      // Open options menu for the balance row
      const actionButtons = screen.getAllByTitle('Acciones');
      expect(actionButtons.length).toBeGreaterThanOrEqual(2);

      // Click second action button (Aporte Mensual Vanguard)
      fireEvent.click(actionButtons[1]);

      // Should show options for balance row
      expect(screen.getByText('Editar cuenta / naturaleza')).toBeInTheDocument();
      expect(screen.getByText('Eliminar partida')).toBeInTheDocument();
      expect(screen.getByText('Replicar a todo el año')).toBeInTheDocument();
      expect(screen.getByText('Traer del año anterior')).toBeInTheDocument();
    });

    test('replicate a todo el año triggers onCellChange for all open periods', () => {
      render(<BudgetMatrixGrid {...defaultProps} viewMode="monthly" />);

      const actionButtons = screen.getAllByTitle('Acciones');
      fireEvent.click(actionButtons[1]); // Aporte Mensual Vanguard

      const replicateAllBtn = screen.getByText('Replicar a todo el año');
      fireEvent.click(replicateAllBtn);

      expect(defaultProps.onCellChange).toHaveBeenCalledWith('acc-asset-1', 'p-1', 300000, 'sub-1');
      expect(defaultProps.onCellChange).toHaveBeenCalledWith('acc-asset-1', 'p-2', 300000, 'sub-1');
      expect(defaultProps.onCellChange).toHaveBeenCalledWith('acc-asset-1', 'p-3', 300000, 'sub-1');
      expect(defaultProps.onCellChange).toHaveBeenCalledWith('acc-asset-1', 'p-4', 300000, 'sub-1');
    });

    test('traer del año anterior calls onOpenAutofill', () => {
      render(<BudgetMatrixGrid {...defaultProps} viewMode="monthly" />);

      const actionButtons = screen.getAllByTitle('Acciones');
      fireEvent.click(actionButtons[0]); // Salario Principal (regular income row)

      // Regular income row does NOT have "Editar cuenta / naturaleza"
      expect(screen.queryByText('Editar cuenta / naturaleza')).not.toBeInTheDocument();

      const autofillBtn = screen.getByText('Traer del año anterior');
      fireEvent.click(autofillBtn);

      expect(defaultProps.onOpenAutofill).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'acc-ing-1' }),
      );
    });
  });

  describe('Table Matrix View Mode (Cuatrimestral / Semestral / Anual)', () => {
    test('renders options menu in the sticky column with edit nature, replicate and delete options', () => {
      render(<BudgetMatrixGrid {...defaultProps} viewMode="four_months" />);

      expect(screen.getByText('Partida Presupuestaria')).toBeInTheDocument();
      expect(screen.getByText('Aporte Mensual Vanguard')).toBeInTheDocument();

      const rowOptionsButtons = screen.getAllByTitle('Opciones de partida');
      expect(rowOptionsButtons.length).toBeGreaterThanOrEqual(2);

      // Click balance row options
      fireEvent.click(rowOptionsButtons[1]);

      expect(screen.getByText('Editar cuenta / naturaleza')).toBeInTheDocument();
      expect(screen.getByText('Eliminar partida')).toBeInTheDocument();
      expect(screen.getByText('Replicar a todo el año')).toBeInTheDocument();
      expect(screen.getByText('Traer del año anterior')).toBeInTheDocument();
    });

    test('clicking Editar cuenta / naturaleza opens modal and calls onEditBalanceRow on submit', async () => {
      render(<BudgetMatrixGrid {...defaultProps} viewMode="four_months" />);

      const rowOptionsButtons = screen.getAllByTitle('Opciones de partida');
      fireEvent.click(rowOptionsButtons[1]); // Aporte Mensual Vanguard

      const editBtn = screen.getByText('Editar cuenta / naturaleza');
      fireEvent.click(editBtn);

      // BudgetAccountModal should open
      expect(screen.getByText('Editar Fila Presupuestaria')).toBeInTheDocument();
    });
  });
});
