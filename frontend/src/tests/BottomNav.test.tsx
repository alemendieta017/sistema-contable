import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomNav from '../components/BottomNav';
import { api } from '../services/api';

let mockPathname = '/transactions';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

const mockToggleTheme = jest.fn();
let mockTheme = 'light';

jest.mock('../lib/theme-context', () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: mockToggleTheme,
  }),
}));

jest.mock('../services/api', () => ({
  api: {
    auth: {
      logout: jest.fn(),
    },
  },
}));

describe('BottomNav & MobileNavDrawer (US2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/transactions';
    mockTheme = 'light';
  });

  test('renders primary bottom bar actions', () => {
    render(<BottomNav />);

    expect(screen.getByRole('link', { name: /Registro de transacciones/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Gestión de cuentas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Estadísticas financieras/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir más opciones de menú/i })).toBeInTheDocument();
  });

  test('opens and closes mobile drawer on user interaction', () => {
    render(<BottomNav />);

    const moreButton = screen.getByRole('button', { name: /Abrir más opciones de menú/i });
    fireEvent.click(moreButton);

    // Drawer should now be open
    const drawerDialog = screen.getByRole('dialog', { name: /Menú de navegación/i });
    expect(drawerDialog).toBeInTheDocument();

    // Close button (X)
    const closeBtn = screen.getByRole('button', { name: /Cerrar menú/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: /Menú de navegación/i })).not.toBeInTheDocument();
  });

  test('renders categorized sections with touch targets >= 48px', () => {
    render(<BottomNav />);

    // Open drawer
    fireEvent.click(screen.getByRole('button', { name: /Abrir más opciones de menú/i }));

    // Sections
    expect(screen.getByRole('region', { name: /Presupuestos/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Reportes e Informes/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Gestión y Configuración/i })).toBeInTheDocument();

    // Items
    const planItem = screen.getByRole('link', { name: /Planificación/i });
    expect(planItem).toBeInTheDocument();
    expect(planItem.className).toContain('min-h-[48px]');

    const controlItem = screen.getByRole('link', { name: /Control de Ejecución/i });
    expect(controlItem).toBeInTheDocument();
    expect(controlItem.className).toContain('min-h-[48px]');

    const balanceSheet = screen.getByRole('link', { name: /Balance General/i });
    expect(balanceSheet).toBeInTheDocument();

    const settingsItem = screen.getByRole('link', { name: /Ajustes/i });
    expect(settingsItem).toBeInTheDocument();

    // Clicking an item closes drawer
    fireEvent.click(planItem);
    expect(screen.queryByRole('dialog', { name: /Menú de navegación/i })).not.toBeInTheDocument();
  });

  test('closes drawer on Escape key press', () => {
    render(<BottomNav />);

    fireEvent.click(screen.getByRole('button', { name: /Abrir más opciones de menú/i }));
    expect(screen.getByRole('dialog', { name: /Menú de navegación/i })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Menú de navegación/i })).not.toBeInTheDocument();
  });

  test('handles footer theme toggle and logout actions', () => {
    render(<BottomNav />);

    fireEvent.click(screen.getByRole('button', { name: /Abrir más opciones de menú/i }));

    const themeBtn = screen.getByRole('button', { name: /Cambiar Tema/i });
    fireEvent.click(themeBtn);
    expect(mockToggleTheme).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: /Menú de navegación/i })).not.toBeInTheDocument();

    // Open again and test logout
    fireEvent.click(screen.getByRole('button', { name: /Abrir más opciones de menú/i }));
    const logoutBtn = screen.getByRole('button', { name: /Cerrar Sesión/i });
    fireEvent.click(logoutBtn);
    expect(api.auth.logout).toHaveBeenCalled();
  });
});
