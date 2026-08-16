import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AsientoLibrePage from '../app/transactions/asiento-libre/page';
import { api } from '../services/api';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock API service
jest.mock('../services/api', () => ({
  api: {
    accounts: {
      list: jest.fn(),
      summary: jest.fn(),
    },
    currencies: {
      list: jest.fn(),
    },
    transactions: {
      create: jest.fn(),
    },
  },
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === 'string') {
          return (props: any) => (
            <span data-testid={`icon-${prop.toLowerCase()}`} {...props}>
              {prop}
            </span>
          );
        }
        return undefined;
      },
    },
  );
});

describe('AsientoLibrePage Integration', () => {
  const mockAccounts = [
    {
      id: 'acc-1',
      name: 'Efectivo',
      type: 'ASSET',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
      isCashOrBank: true,
    },
    {
      id: 'acc-2',
      name: 'Comida',
      type: 'EXPENSE',
      currencyId: 'cur-usd',
      status: 'ACTIVE',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (api.accounts.summary as jest.Mock).mockResolvedValue(mockAccounts);
    (api.accounts.list as jest.Mock).mockResolvedValue(mockAccounts);
    (api.currencies.list as jest.Mock).mockResolvedValue([
      { id: 'cur-usd', code: 'USD', symbol: '$', decimalPlaces: 2, isBase: true },
    ]);
  });

  test('should render FreeJournalEntryGrid with header and back button', async () => {
    render(<AsientoLibrePage />);

    await waitFor(() => {
      expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Asiento Contable Libre/i)).toBeInTheDocument();
    expect(screen.getByText(/Editor contable multilínea/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar Apunte/i })).toBeInTheDocument();
  });

  test('should submit balanced transaction', async () => {
    (api.transactions.create as jest.Mock).mockResolvedValue({ id: 'asiento-123' });

    render(<AsientoLibrePage />);

    await waitFor(() => {
      expect(screen.getByText(/Fecha Contable/i)).toBeInTheDocument();
    });

    const descInput = screen.getByPlaceholderText(/Ej: Devengamiento de planilla/i);
    fireEvent.change(descInput, { target: { value: 'Apertura de caja' } });

    // Select account 1 (DEBIT 200)
    const pickers = screen.getAllByText('Seleccionar cuenta contable...');
    fireEvent.click(pickers[0]);
    const optEfectivo = await screen.findByText('Efectivo');
    fireEvent.click(optEfectivo);

    const debitInput = screen.getAllByRole('spinbutton', { name: /Debe/i })[0];
    fireEvent.change(debitInput, { target: { value: '200' } });

    // Select account 2 (CREDIT 200)
    const pickersAfter = screen.getAllByText('Seleccionar cuenta contable...');
    fireEvent.click(pickersAfter[0]);
    const optComida = await screen.findByText('Comida');
    fireEvent.click(optComida);

    const creditInput = screen.getAllByRole('spinbutton', { name: /Haber/i })[1];
    fireEvent.change(creditInput, { target: { value: '200' } });

    const submitBtn = screen.getByRole('button', { name: /Guardar Asiento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.transactions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Apertura de caja',
          entries: [
            { accountId: 'acc-1', entryType: 'DEBIT', amount: 200 },
            { accountId: 'acc-2', entryType: 'CREDIT', amount: 200 },
          ],
        }),
      );
    });
  });
});
