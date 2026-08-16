import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';
import { api } from '../services/api';

let mockPathname = '/transactions';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

jest.mock('../lib/theme-context', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('../services/api', () => ({
  api: {
    auth: {
      logout: jest.fn(),
    },
  },
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/transactions';
    localStorage.clear();
  });

  describe('US1: Hierarchical Desktop Sidebar Rendering & Toggling', () => {
    test('renders root items and collapsible group headers', () => {
      render(<Sidebar />);

      // Standalone items
      expect(screen.getByText('Transacciones')).toBeInTheDocument();
      expect(screen.getByText('Cuentas')).toBeInTheDocument();
      expect(screen.getByText('Estadísticas')).toBeInTheDocument();
      expect(screen.getByText('Períodos')).toBeInTheDocument();
      expect(screen.getByText('Ajustes')).toBeInTheDocument();

      // Group headers
      expect(screen.getByText('Presupuestos')).toBeInTheDocument();
      expect(screen.getByText('Reportes')).toBeInTheDocument();

      // Quick add button
      expect(screen.getByText('Nueva Transacción')).toBeInTheDocument();
    });

    test('toggles group open and close on click', () => {
      render(<Sidebar />);

      const budgetButton = screen.getByRole('button', { name: /Presupuestos/i });
      expect(budgetButton).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      fireEvent.click(budgetButton);
      expect(budgetButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Planificación Presupuestaria')).toBeInTheDocument();
      expect(screen.getByText('Control de Ejecución')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(budgetButton);
      expect(budgetButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('US3: Active Route Auto-Expansion', () => {
    test('auto-expands Presupuestos when on /budgets/matrix or alias /budgets', () => {
      mockPathname = '/budgets/matrix';
      render(<Sidebar />);

      const budgetButton = screen.getByRole('button', { name: /Presupuestos/i });
      expect(budgetButton).toHaveAttribute('aria-expanded', 'true');
    });

    test('auto-expands Reportes when on /reports/income-statement/forecast or alias /reports/forecast', () => {
      mockPathname = '/reports/forecast';
      render(<Sidebar />);

      const reportsButton = screen.getByRole('button', { name: /Reportes/i });
      expect(reportsButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Resultados Proyectados')).toBeInTheDocument();
    });
  });

  describe('US4: Collapsed Sidebar & Flyout Popovers', () => {
    test('collapses sidebar and toggles flyout popover on hover/click', () => {
      render(<Sidebar />);

      const collapseButton = screen.getByRole('button', { name: /Contraer barra lateral/i });
      fireEvent.click(collapseButton);

      expect(localStorage.getItem('sidebar_collapsed')).toBe('true');

      // In collapsed mode, click on Presupuestos button
      const budgetBtn = screen.getByTitle('Presupuestos');
      fireEvent.click(budgetBtn);

      // Popover should render with group subitems
      const popover = screen.getByRole('menu', { name: /Presupuestos/i });
      expect(popover).toBeInTheDocument();

      // Subitems inside menu
      const subItem = screen.getByRole('menuitem', { name: /Planificación Presupuestaria/i });
      expect(subItem).toBeInTheDocument();

      // Click subitem closes popover
      fireEvent.click(subItem);
      expect(screen.queryByRole('menu', { name: /Presupuestos/i })).not.toBeInTheDocument();
    });
  });

  describe('Footer Actions', () => {
    test('calls api.auth.logout when clicking Cerrar Sesión', () => {
      render(<Sidebar />);
      const logoutButton = screen.getByRole('button', { name: /Cerrar Sesión/i });
      fireEvent.click(logoutButton);

      expect(api.auth.logout).toHaveBeenCalled();
    });
  });
});
