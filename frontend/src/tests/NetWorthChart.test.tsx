import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import NetWorthChart from '../components/stats/NetWorthChart';
import { NetWorthEvolutionResponse } from '@sistema-contable/shared';

// Mock theme context
jest.mock('../lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  }),
}));

// Mock recharts ResponsiveContainer and chart elements because jsdom doesn't measure SVG bounding boxes
jest.mock('recharts', () => {
  const OriginalRecharts = jest.requireActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: '500px', height: '300px' }}>
        {children}
      </div>
    ),
  };
});

describe('NetWorthChart Component (US4)', () => {
  const mockEvolutionData: NetWorthEvolutionResponse = {
    history: [
      {
        period: '2025-08',
        date: '2025-08-31',
        assets: 125000,
        liabilities: 45000,
        netWorth: 80000,
      },
      {
        period: '2026-08',
        date: '2026-08-31',
        assets: 148000,
        liabilities: 38000,
        netWorth: 110000,
      },
    ],
    latest: {
      assets: 148000,
      liabilities: 38000,
      netWorth: 110000,
    },
    change12Months: 30000,
    changePercentage: 37.5,
  };

  test('renders empty state when history is empty', () => {
    render(
      <NetWorthChart
        data={{
          history: [],
          latest: { assets: 0, liabilities: 0, netWorth: 0 },
          change12Months: 0,
          changePercentage: 0,
        }}
      />,
    );

    expect(
      screen.getByText(/Insuficientes transacciones para graficar la evolución del patrimonio/i),
    ).toBeInTheDocument();
  });

  test('renders Net Worth chart header, latest value, and 12-month change metrics', () => {
    render(<NetWorthChart data={mockEvolutionData} />);

    expect(screen.getByText(/Evolución del Patrimonio/i)).toBeInTheDocument();
    expect(screen.getByText(/Histórico Neto Activos vs Pasivos/i)).toBeInTheDocument();

    // Check latest net worth display
    expect(screen.getByTestId('latest-net-worth')).toHaveTextContent('110.000');

    // Check 12-month change badge
    expect(screen.getByTestId('net-worth-change-badge')).toHaveTextContent('+37.5%');
  });

  test('renders asset and liability KPI summary cards with tabular numbers', () => {
    render(<NetWorthChart data={mockEvolutionData} />);

    const assetsCard = screen.getByTestId('kpi-total-assets');
    const liabilitiesCard = screen.getByTestId('kpi-total-liabilities');

    expect(assetsCard).toHaveTextContent('148.000');
    expect(liabilitiesCard).toHaveTextContent('38.000');

    // Check tabular-nums class applied
    expect(assetsCard).toHaveClass('tabular-nums');
    expect(liabilitiesCard).toHaveClass('tabular-nums');
  });

  test('supports legacy array data format for backwards compatibility', () => {
    const legacyData = [
      { date: '2026-01-01', balance: 50000 },
      { date: '2026-02-01', balance: 55000 },
    ];

    render(<NetWorthChart data={legacyData} />);

    expect(screen.getByText(/Evolución del Patrimonio/i)).toBeInTheDocument();
    expect(screen.getByTestId('latest-net-worth')).toHaveTextContent('55.000');
  });
});
