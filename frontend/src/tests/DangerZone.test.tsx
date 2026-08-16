import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DangerZoneSection from '../components/settings/DangerZoneSection';
import FactoryResetModal from '../components/settings/FactoryResetModal';
import DeleteAccountModal from '../components/settings/DeleteAccountModal';
import { api } from '../services/api';
import {
  FACTORY_RESET_PHRASE,
  DELETE_ACCOUNT_PHRASE,
  AuthErrorCode,
} from '@sistema-contable/shared';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('../services/api', () => ({
  api: {
    dangerZone: {
      resetData: jest.fn(),
      deleteAccount: jest.fn(),
    },
    auth: {
      logout: jest.fn(),
    },
  },
}));

describe('DangerZone Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DangerZoneSection', () => {
    test('renders danger zone section with both action cards', () => {
      render(<DangerZoneSection />);

      expect(screen.getByText(/Zona de Peligro/i)).toBeInTheDocument();
      expect(screen.getByText(/Restablecer datos de fábrica/i)).toBeInTheDocument();
      expect(screen.getByText(/Eliminar cuenta permanentemente/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Restablecer Datos/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Eliminar Cuenta/i })).toBeInTheDocument();
    });

    test('opens FactoryResetModal when clicking Restablecer Datos button', () => {
      render(<DangerZoneSection />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Restablecer Datos/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(FACTORY_RESET_PHRASE)).toBeInTheDocument();
    });

    test('opens DeleteAccountModal when clicking Eliminar Cuenta button', () => {
      render(<DangerZoneSection />);

      fireEvent.click(screen.getByRole('button', { name: /Eliminar Cuenta/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(DELETE_ACCOUNT_PHRASE)).toBeInTheDocument();
    });
  });

  describe('FactoryResetModal (US2)', () => {
    test('disables confirm button until exact phrase and password are entered', () => {
      render(<FactoryResetModal isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);

      const submitButton = screen.getByRole('button', { name: /^Restablecer Datos$/i });
      expect(submitButton).toBeDisabled();

      const phraseInput = screen.getByPlaceholderText(FACTORY_RESET_PHRASE);
      const passwordInput = screen.getByPlaceholderText('••••••••');

      // Incomplete phrase
      fireEvent.change(phraseInput, { target: { value: 'RESTABLECER' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      expect(submitButton).toBeDisabled();

      // Complete phrase but no password
      fireEvent.change(phraseInput, { target: { value: FACTORY_RESET_PHRASE } });
      fireEvent.change(passwordInput, { target: { value: '' } });
      expect(submitButton).toBeDisabled();

      // Both valid
      fireEvent.change(passwordInput, { target: { value: 'secretPassword' } });
      expect(submitButton).not.toBeDisabled();
    });

    test('successfully submits factory reset and calls onSuccess', async () => {
      const onSuccessMock = jest.fn();
      const onCloseMock = jest.fn();
      (api.dangerZone.resetData as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Datos contables restablecidos de fábrica con éxito.',
      });

      render(<FactoryResetModal isOpen={true} onClose={onCloseMock} onSuccess={onSuccessMock} />);

      const phraseInput = screen.getByPlaceholderText(FACTORY_RESET_PHRASE);
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(phraseInput, { target: { value: FACTORY_RESET_PHRASE } });
      fireEvent.change(passwordInput, { target: { value: 'correctPass' } });

      const submitButton = screen.getByRole('button', { name: /^Restablecer Datos$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.dangerZone.resetData).toHaveBeenCalledWith({
          confirmationPhrase: FACTORY_RESET_PHRASE,
          currentPassword: 'correctPass',
        });
        expect(onSuccessMock).toHaveBeenCalledWith(
          'Datos contables restablecidos de fábrica con éxito.',
        );
        expect(onCloseMock).toHaveBeenCalled();
      });
    });

    test('displays error message when password is wrong', async () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      error.code = AuthErrorCode.INVALID_CURRENT_PASSWORD;
      (api.dangerZone.resetData as jest.Mock).mockRejectedValue(error);

      render(<FactoryResetModal isOpen={true} onClose={jest.fn()} onSuccess={jest.fn()} />);

      const phraseInput = screen.getByPlaceholderText(FACTORY_RESET_PHRASE);
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(phraseInput, { target: { value: FACTORY_RESET_PHRASE } });
      fireEvent.change(passwordInput, { target: { value: 'wrongPass' } });

      const submitButton = screen.getByRole('button', { name: /^Restablecer Datos$/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Contraseña actual incorrecta/i)).toBeInTheDocument();
      });
    });
  });

  describe('DeleteAccountModal (US3)', () => {
    test('disables confirm button until exact delete phrase and password are typed', () => {
      render(<DeleteAccountModal isOpen={true} onClose={jest.fn()} />);

      const submitButton = screen.getByRole('button', { name: /Eliminar Cuenta Definitivamente/i });
      expect(submitButton).toBeDisabled();

      const phraseInput = screen.getByPlaceholderText(DELETE_ACCOUNT_PHRASE);
      const passwordInput = screen.getByPlaceholderText('••••••••');

      // Incomplete phrase
      fireEvent.change(phraseInput, { target: { value: 'ELIMINAR' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      expect(submitButton).toBeDisabled();

      // Complete phrase and password
      fireEvent.change(phraseInput, { target: { value: DELETE_ACCOUNT_PHRASE } });
      fireEvent.change(passwordInput, { target: { value: 'mypassword' } });
      expect(submitButton).not.toBeDisabled();
    });

    test('successfully calls deleteAccount and logs out user', async () => {
      const onCloseMock = jest.fn();
      (api.dangerZone.deleteAccount as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Cuenta eliminada con éxito',
      });

      render(<DeleteAccountModal isOpen={true} onClose={onCloseMock} />);

      const phraseInput = screen.getByPlaceholderText(DELETE_ACCOUNT_PHRASE);
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(phraseInput, { target: { value: DELETE_ACCOUNT_PHRASE } });
      fireEvent.change(passwordInput, { target: { value: 'validPassword' } });

      const submitButton = screen.getByRole('button', { name: /Eliminar Cuenta Definitivamente/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.dangerZone.deleteAccount).toHaveBeenCalledWith({
          confirmationPhrase: DELETE_ACCOUNT_PHRASE,
          currentPassword: 'validPassword',
        });
        expect(api.auth.logout).toHaveBeenCalled();
      });
    });

    test('displays error message when password fails in DeleteAccountModal', async () => {
      const error = new Error('Unauthorized') as any;
      error.status = 401;
      error.code = AuthErrorCode.INVALID_CURRENT_PASSWORD;
      (api.dangerZone.deleteAccount as jest.Mock).mockRejectedValue(error);

      render(<DeleteAccountModal isOpen={true} onClose={jest.fn()} />);

      const phraseInput = screen.getByPlaceholderText(DELETE_ACCOUNT_PHRASE);
      const passwordInput = screen.getByPlaceholderText('••••••••');

      fireEvent.change(phraseInput, { target: { value: DELETE_ACCOUNT_PHRASE } });
      fireEvent.change(passwordInput, { target: { value: 'badPassword' } });

      const submitButton = screen.getByRole('button', { name: /Eliminar Cuenta Definitivamente/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Contraseña actual incorrecta/i)).toBeInTheDocument();
      });
    });
  });
});
