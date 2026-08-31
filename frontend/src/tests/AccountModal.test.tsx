import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountModal from '../components/AccountModal';
import { api } from '../services/api';

jest.mock('../services/api', () => ({
  api: {
    currencies: {
      list: jest.fn(),
    },
    accounts: {
      create: jest.fn(),
      update: jest.fn(),
      adjustBalance: jest.fn(),
    },
  },
}));

jest.mock('lucide-react', () => ({
  X: () => <span data-testid="x-icon">X</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
  ChevronDown: () => <span data-testid="chevron-icon">v</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
}));

describe('AccountModal (US2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-base', code: 'PYG', symbol: '₲', isBase: true },
    ]);
  });

  test('should show liquidity toggle when type is ASSET and auto-select on keywords', async () => {
    render(<AccountModal onClose={jest.fn()} onSuccess={jest.fn()} parentCandidates={[]} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Es cuenta de Efectivo\/Banco/i)).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText(/Es cuenta de Efectivo\/Banco/i) as HTMLInputElement;
    expect(toggle.checked).toBe(false);

    const nameInput = screen.getByPlaceholderText(/Ej. Efectivo, Comida, Sueldo/i);

    // Type "Caja Central" -> should auto-check
    fireEvent.change(nameInput, { target: { value: 'Caja Central' } });
    expect(toggle.checked).toBe(true);

    // Type "Banco Vision" -> should stay checked
    fireEvent.change(nameInput, { target: { value: 'Banco Vision' } });
    expect(toggle.checked).toBe(true);

    // Type "MP Billetera" -> should stay checked
    fireEvent.change(nameInput, { target: { value: 'MP Billetera' } });
    expect(toggle.checked).toBe(true);

    // Type "Inmueble" -> should uncheck if not matching keyword (or user can toggle)
    fireEvent.change(nameInput, { target: { value: 'Inmueble' } });
    expect(toggle.checked).toBe(false);
  });

  test('should include isCashOrBank in api.accounts.create payload', async () => {
    (api.accounts.create as jest.Mock).mockResolvedValue({ id: 'acc-new' });
    const onSuccessMock = jest.fn();
    const onCloseMock = jest.fn();

    render(<AccountModal onClose={onCloseMock} onSuccess={onSuccessMock} parentCandidates={[]} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Es cuenta de Efectivo\/Banco/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Ej. Efectivo, Comida, Sueldo/i);
    fireEvent.change(nameInput, { target: { value: 'Caja Chica' } });

    const submitBtn = screen.getByRole('button', { name: /Crear Cuenta/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.accounts.create).toHaveBeenCalledWith({
        name: 'Caja Chica',
        type: 'ASSET',
        currencyId: 'cur-base',
        parentId: null,
        isCashOrBank: true,
      });
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test('should disable and lock isCashOrBank toggle when editing an account with posted transactions (US3)', async () => {
    render(
      <AccountModal
        onClose={jest.fn()}
        onSuccess={jest.fn()}
        parentCandidates={[]}
        accountToEdit={{
          id: 'acc-posted',
          name: 'Caja Principal',
          type: 'ASSET',
          isCashOrBank: true,
          hasTransactions: true,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Es cuenta de Efectivo\/Banco/i)).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText(/Es cuenta de Efectivo\/Banco/i) as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    expect(
      screen.getByText(/Inmutable: La cuenta posee transacciones registradas/i),
    ).toBeInTheDocument();
  });

  test('should include initialBalance in api.accounts.create when specified', async () => {
    (api.accounts.create as jest.Mock).mockResolvedValue({ id: 'acc-new' });
    const onSuccessMock = jest.fn();
    const onCloseMock = jest.fn();

    render(<AccountModal onClose={onCloseMock} onSuccess={onSuccessMock} parentCandidates={[]} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ej. Efectivo, Comida, Sueldo/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Ej. Efectivo, Comida, Sueldo/i), {
      target: { value: 'Ahorros' },
    });

    const balanceInput = screen.getByPlaceholderText('0');
    fireEvent.change(balanceInput, { target: { value: '500000' } });

    const submitBtn = screen.getByRole('button', { name: /Crear Cuenta/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.accounts.create).toHaveBeenCalledWith({
        name: 'Ahorros',
        type: 'ASSET',
        currencyId: 'cur-base',
        parentId: null,
        isCashOrBank: false,
        initialBalance: 500000,
      });
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test('should update account name and attributes on edit', async () => {
    (api.accounts.update as jest.Mock).mockResolvedValue({ id: 'acc-edit' });
    const onSuccessMock = jest.fn();
    const onCloseMock = jest.fn();

    render(
      <AccountModal
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
        parentCandidates={[]}
        accountToEdit={{
          id: 'acc-edit',
          name: 'Caja Principal',
          type: 'ASSET',
          isCashOrBank: true,
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Caja Principal')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Caja Principal');
    fireEvent.change(nameInput, { target: { value: 'Caja Central Actualizada' } });

    const submitBtn = screen.getByRole('button', { name: /Guardar Cambios/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.accounts.update).toHaveBeenCalledWith('acc-edit', {
        name: 'Caja Central Actualizada',
        isCashOrBank: true,
      });
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });
});
