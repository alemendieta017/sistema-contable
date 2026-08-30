import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ForecastMatrixGrid,
  AccountForecastItem,
  MonthForecastItem,
} from '../components/reports/ForecastMatrixGrid';

const mockBaseCurrency = {
  code: 'PYG',
  symbol: '₲',
  decimalPlaces: 0,
};

const mockMonthsCashFlow: MonthForecastItem[] = [
  {
    periodId: 'p-1',
    periodName: '2026-01',
    status: 'CLOSED',
    isReal: true,
    initialCash: 10000000,
    ingresosOperativos: 5000000,
    entradasActivoPasivo: 1000000,
    totalEntradas: 6000000,
    egresosOperativos: 3000000,
    salidasActivoPasivo: 500000,
    totalSalidas: 3500000,
    netFlow: 2500000,
    finalCash: 12500000,
  },
  {
    periodId: 'p-2',
    periodName: '2026-02',
    status: 'OPEN',
    isReal: false,
    initialCash: 12500000,
    ingresosOperativos: 5500000,
    entradasActivoPasivo: 0,
    totalEntradas: 5500000,
    egresosOperativos: 3200000,
    salidasActivoPasivo: 500000,
    totalSalidas: 3700000,
    netFlow: 1800000,
    finalCash: 14300000,
  },
];

const mockAccountsCashFlow: AccountForecastItem[] = [
  {
    accountId: 'acc-1',
    accountName: 'Ventas de Servicios',
    accountType: 'INCOME',
    parentId: null,
    values: { 'p-1': 5000000, 'p-2': 5500000 },
  },
  {
    accountId: 'acc-2',
    accountName: 'Alquiler Oficina',
    accountType: 'EXPENSE',
    parentId: null,
    values: { 'p-1': 3000000, 'p-2': 3200000 },
  },
  {
    accountId: 'acc-3',
    accountName: 'Préstamo Bancario',
    accountType: 'LIABILITY',
    parentId: null,
    values: { 'p-1': 1000000, 'p-2': 0 },
  },
  {
    accountId: 'acc-4',
    accountName: 'Aporte de Capital',
    accountType: 'ASSET',
    parentId: null,
    values: { 'p-1': -500000, 'p-2': -500000 },
  },
];

describe('ForecastMatrixGrid Component', () => {
  it('renders cash flow matrix headers, badges, and account rows correctly', () => {
    render(
      <ForecastMatrixGrid
        type="CASH_FLOW"
        months={mockMonthsCashFlow}
        accounts={mockAccountsCashFlow}
        baseCurrency={mockBaseCurrency}
      />,
    );

    // Section headers and badges
    expect(screen.getByText('Concepto / Partida')).toBeInTheDocument();
    expect(screen.getByText('(+) Ingresos Operativos')).toBeInTheDocument();
    expect(screen.getByText('(+) Entradas de Activo / Pasivo')).toBeInTheDocument();
    expect(screen.getByText('(-) Egresos Operativos')).toBeInTheDocument();
    expect(screen.getByText('(-) Salidas de Activo / Pasivo')).toBeInTheDocument();

    // Accounts
    expect(screen.getByText('Ventas de Servicios')).toBeInTheDocument();
    expect(screen.getByText('Alquiler Oficina')).toBeInTheDocument();

    // Real and Proyectado pills
    expect(screen.getByText('Real')).toBeInTheDocument();
    expect(screen.getByText('Proyectado')).toBeInTheDocument();

    // Prominent Totals
    expect(screen.getByText('(=) Total Entradas de Caja')).toBeInTheDocument();
    expect(screen.getByText('(=) Total Salidas de Caja')).toBeInTheDocument();
    expect(screen.getByText('(=) Flujo Neto del Período')).toBeInTheDocument();
    expect(screen.getByText('(=) SALDO FINAL DE CAJA')).toBeInTheDocument();
  });

  it('renders income statement matrix correctly', () => {
    const mockMonthsIncome: MonthForecastItem[] = [
      {
        periodId: 'p-1',
        periodName: '2026-01',
        isReal: true,
        income: 10000000,
        expense: 6000000,
        netProfit: 4000000,
      },
    ];

    const mockAccountsIncome: AccountForecastItem[] = [
      {
        accountId: 'acc-inc',
        accountName: 'Honorarios Profesionales',
        accountType: 'INCOME',
        parentId: null,
        values: { 'p-1': 10000000 },
      },
      {
        accountId: 'acc-exp',
        accountName: 'Servicios Básicos',
        accountType: 'EXPENSE',
        parentId: null,
        values: { 'p-1': 6000000 },
      },
    ];

    render(
      <ForecastMatrixGrid
        type="INCOME_STATEMENT"
        months={mockMonthsIncome}
        accounts={mockAccountsIncome}
        baseCurrency={mockBaseCurrency}
      />,
    );

    expect(screen.getByText('(+) Ingresos Devengados')).toBeInTheDocument();
    expect(screen.getByText('Honorarios Profesionales')).toBeInTheDocument();
    expect(screen.getByText('(-) Gastos Devengados')).toBeInTheDocument();
    expect(screen.getByText('Servicios Básicos')).toBeInTheDocument();
    expect(screen.getByText('(=) RESULTADO NETO (P&L)')).toBeInTheDocument();
  });

  it('allows collapsing and expanding sections', () => {
    render(
      <ForecastMatrixGrid
        type="CASH_FLOW"
        months={mockMonthsCashFlow}
        accounts={mockAccountsCashFlow}
        baseCurrency={mockBaseCurrency}
      />,
    );

    expect(screen.getByText('Ventas de Servicios')).toBeInTheDocument();

    // Click to collapse income section
    const incomeSectionHeader = screen.getByText('(+) Ingresos Operativos');
    fireEvent.click(incomeSectionHeader);

    // Account should now be hidden
    expect(screen.queryByText('Ventas de Servicios')).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(incomeSectionHeader);
    expect(screen.getByText('Ventas de Servicios')).toBeInTheDocument();
  });
});
