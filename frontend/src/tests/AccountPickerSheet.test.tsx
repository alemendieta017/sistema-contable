import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AccountPickerSheet from '../components/transactions/AccountPickerSheet';
import type { AccountOption } from '../types/account';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <span data-testid="search-icon">Search</span>,
  ChevronDown: ({ className }: { className?: string }) => (
    <span data-testid="chevron-icon" className={className}>
      Chevron
    </span>
  ),
  Plus: () => <span data-testid="plus-icon">+</span>,
  X: () => <span data-testid="x-icon">X</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

describe('AccountPickerSheet Component', () => {
  const mockAccounts: AccountOption[] = [
    { id: 'acc-1', name: 'Caja Chica', type: 'ASSET', balance: 1500, status: 'ACTIVE' },
    { id: 'acc-2', name: 'Banco Familiar', type: 'ASSET', status: 'ACTIVE' },
    {
      id: 'acc-3',
      name: 'Cuenta Corriente',
      type: 'ASSET',
      parentId: 'acc-2',
      balance: 5000,
      status: 'ACTIVE',
    },
    { id: 'acc-4', name: 'Tarjeta Crédito', type: 'LIABILITY', balance: -800, status: 'ACTIVE' },
    { id: 'acc-5', name: 'Combustibles', type: 'EXPENSE', balance: 350, status: 'ACTIVE' },
    { id: 'acc-6', name: 'Ventas de Servicios', type: 'INCOME', balance: 12000, status: 'ACTIVE' },
    { id: 'acc-7', name: 'Capital Social', type: 'EQUITY', status: 'ACTIVE' },
    {
      id: 'acc-system',
      name: 'Resultado del Ejercicio',
      type: 'EQUITY',
      systemRole: 'NET_INCOME',
      status: 'ACTIVE',
    },
    { id: 'acc-inactive', name: 'Banco Antiguo Inactivo', type: 'ASSET', status: 'INACTIVE' },
  ];

  const defaultProps = {
    accounts: mockAccounts,
    onSelect: jest.fn(),
    baseCurrency: { code: 'USD', symbol: '$', decimalPlaces: 2 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trigger Element Rendering & States', () => {
    test('renders default placeholder when no account is selected', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      expect(screen.getByText('Seleccionar cuenta...')).toBeInTheDocument();
    });

    test('renders custom placeholder and label when provided', () => {
      render(
        <AccountPickerSheet
          {...defaultProps}
          label="Cuenta Origen"
          placeholder="Elige una cuenta de origen..."
        />,
      );
      expect(screen.getByText('Cuenta Origen')).toBeInTheDocument();
      expect(screen.getByText('Elige una cuenta de origen...')).toBeInTheDocument();
    });

    test('renders selected account name and formatted balance on trigger for ASSET accounts', () => {
      render(<AccountPickerSheet {...defaultProps} selectedAccountId="acc-1" />);
      expect(screen.getByText('Caja Chica')).toBeInTheDocument();
      expect(screen.getByText(/1\.500,00/i)).toBeInTheDocument();
    });

    test('renders formatted parent hierarchy in selected account name', () => {
      render(<AccountPickerSheet {...defaultProps} selectedAccountId="acc-3" />);
      expect(screen.getByText('Banco Familiar › Cuenta Corriente')).toBeInTheDocument();
    });

    test('does not render balance on trigger for EXPENSE or INCOME accounts', () => {
      render(<AccountPickerSheet {...defaultProps} selectedAccountId="acc-5" />);
      expect(screen.getByText('Combustibles')).toBeInTheDocument();
      expect(screen.queryByText(/350,00/i)).not.toBeInTheDocument();
    });

    test('renders error state and message when error prop is provided', () => {
      render(
        <AccountPickerSheet {...defaultProps} label="Cuenta" error="Este campo es obligatorio" />,
      );
      expect(screen.getByText('Este campo es obligatorio')).toBeInTheDocument();
      const combobox = screen.getByRole('combobox');
      expect(combobox.className).toContain('border-rose-500');
    });

    test('renders disabled state and clicking does not open sheet when disabled', () => {
      render(<AccountPickerSheet {...defaultProps} disabled={true} />);
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeDisabled();
      fireEvent.click(combobox);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Sheet Modal Open / Close Behavior', () => {
    test('opens bottom sheet modal when trigger is clicked', () => {
      render(<AccountPickerSheet {...defaultProps} label="Cuenta de Pago" />);
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Cuenta de Pago' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Buscar por nombre...')).toBeInTheDocument();
    });

    test('closes sheet when backdrop is clicked', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const backdrop = screen.getByTestId('account-picker-backdrop');
      fireEvent.click(backdrop);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('closes sheet when close button (X) is clicked', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeBtn = screen.getByLabelText('Cerrar');
      fireEvent.click(closeBtn);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('closes sheet when Escape key is pressed', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Search & Filtering', () => {
    test('filters accounts in real-time as user types in search input', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      fireEvent.change(searchInput, { target: { value: 'Combust' } });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('account-option-acc-5')).toBeInTheDocument();
      expect(within(dialog).getByTestId('account-option-acc-5')).toHaveTextContent(/Combustibles/);
      expect(within(dialog).queryByTestId('account-option-acc-1')).not.toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-2')).not.toBeInTheDocument();
    });

    test('filters accounts matching parent name', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      fireEvent.change(searchInput, { target: { value: 'Familiar' } });

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('account-option-acc-2')).toBeInTheDocument();
      expect(within(dialog).getByTestId('account-option-acc-2')).toHaveTextContent(
        /Banco Familiar/,
      );
      expect(within(dialog).getByTestId('account-option-acc-3')).toBeInTheDocument();
      expect(within(dialog).getByTestId('account-option-acc-3')).toHaveTextContent(
        /Cuenta Corriente/,
      );
    });

    test('clears search when clear button is clicked', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      fireEvent.change(searchInput, { target: { value: 'Caja' } });
      expect(searchInput).toHaveValue('Caja');

      const clearBtn = screen.getByLabelText('Limpiar búsqueda');
      fireEvent.click(clearBtn);

      expect(searchInput).toHaveValue('');
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('account-option-acc-5')).toBeInTheDocument();
    });

    test('shows empty message when search yields no matches', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      fireEvent.change(searchInput, { target: { value: 'Criptomoneda Inexistente' } });

      expect(screen.getByText('No se encontraron cuentas disponibles')).toBeInTheDocument();
    });
  });

  describe('Category Tabs Filtering', () => {
    test('renders category tabs (Todos, Activos, Pasivos, Gastos, Ingresos, Patrimonio) with counts', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.getByTestId('category-tab-ALL')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-ASSET')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-LIABILITY')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-EXPENSE')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-INCOME')).toBeInTheDocument();
      expect(screen.getByTestId('category-tab-EQUITY')).toBeInTheDocument();
    });

    test('filters list by selected category tab', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      const gastosTab = screen.getByTestId('category-tab-EXPENSE');
      fireEvent.click(gastosTab);

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('account-option-acc-5')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-1')).not.toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-6')).not.toBeInTheDocument();
    });
  });

  describe('Account Selection & Callbacks', () => {
    test('calls onSelect with selected account and closes sheet on item click', () => {
      const onSelect = jest.fn();
      render(<AccountPickerSheet {...defaultProps} onSelect={onSelect} />);
      fireEvent.click(screen.getByRole('combobox'));

      const accountItem = screen.getByTestId('account-option-acc-1');
      fireEvent.click(accountItem);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'acc-1', name: 'Caja Chica' }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders checkmark indicator next to selected account in list', () => {
      render(<AccountPickerSheet {...defaultProps} selectedAccountId="acc-1" />);
      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  describe('Quick Create Account', () => {
    test('renders dynamic quick create button with search term and invokes callback', () => {
      const onQuickCreate = jest.fn();
      render(<AccountPickerSheet {...defaultProps} onQuickCreateAccount={onQuickCreate} />);
      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      fireEvent.change(searchInput, { target: { value: 'Librería Oficina' } });

      const dynamicCreateBtn = screen.getByText(/Crear cuenta “Librería Oficina”/i);
      expect(dynamicCreateBtn).toBeInTheDocument();

      fireEvent.click(dynamicCreateBtn);

      expect(onQuickCreate).toHaveBeenCalledWith('Librería Oficina');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('renders static quick create button at bottom of list and invokes callback', () => {
      const onQuickCreate = jest.fn();
      render(<AccountPickerSheet {...defaultProps} onQuickCreateAccount={onQuickCreate} />);
      fireEvent.click(screen.getByRole('combobox'));

      const createBottomBtn = screen.getByText('Crear nueva cuenta');
      expect(createBottomBtn).toBeInTheDocument();

      fireEvent.click(createBottomBtn);

      expect(onQuickCreate).toHaveBeenCalledWith('');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Allowed Types & Filter Mode Restrictions', () => {
    test('restricts displayed accounts and tabs when allowedTypes is provided', () => {
      render(
        <AccountPickerSheet
          {...defaultProps}
          allowedTypes={['EXPENSE']}
          label="Categoría de Gasto"
        />,
      );
      fireEvent.click(screen.getByRole('combobox'));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('account-option-acc-5')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-1')).not.toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-6')).not.toBeInTheDocument();
      // Activos/Pasivos tabs should not be rendered
      expect(screen.queryByTestId('category-tab-ASSET')).not.toBeInTheDocument();
    });

    test('filters payment accounts when filterMode is PAYMENT_ACCOUNTS', () => {
      render(
        <AccountPickerSheet
          {...defaultProps}
          filterMode="PAYMENT_ACCOUNTS"
          label="Cuenta de Pago"
        />,
      );
      fireEvent.click(screen.getByRole('combobox'));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByTestId('account-option-acc-1')).toBeInTheDocument();
      expect(within(dialog).getByTestId('account-option-acc-4')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-5')).not.toBeInTheDocument();
      expect(within(dialog).queryByTestId('account-option-acc-6')).not.toBeInTheDocument();
    });

    test('excludes system accounts with systemRole NET_INCOME', () => {
      render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.queryByText('Resultado del Ejercicio')).not.toBeInTheDocument();
    });

    test('excludes inactive accounts unless selectedAccountId matches', () => {
      const { rerender } = render(<AccountPickerSheet {...defaultProps} />);
      fireEvent.click(screen.getByRole('combobox'));

      expect(screen.queryByTestId('account-option-acc-inactive')).not.toBeInTheDocument();

      // If inactive account is selected, it should be available for visibility
      rerender(<AccountPickerSheet {...defaultProps} selectedAccountId="acc-inactive" />);
      expect(screen.getByTestId('account-option-acc-inactive')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('navigates through accounts using ArrowDown and selects with Enter', () => {
      const onSelect = jest.fn();
      render(
        <AccountPickerSheet
          {...defaultProps}
          allowedTypes={['EXPENSE', 'INCOME']}
          onSelect={onSelect}
        />,
      );
      fireEvent.click(screen.getByRole('combobox'));

      const searchInput = screen.getByPlaceholderText('Buscar por nombre...');
      // ArrowDown to move to first option
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      // Enter to select
      fireEvent.keyDown(searchInput, { key: 'Enter' });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });
});
