import { IsNotEmpty, IsString, Equals } from 'class-validator';
import {
  FACTORY_RESET_PHRASE,
  DELETE_ACCOUNT_PHRASE,
  FactoryResetRequest,
  DeleteAccountRequest,
} from '@sistema-contable/shared';

export class FactoryResetDto implements FactoryResetRequest {
  @IsString()
  @IsNotEmpty()
  @Equals(FACTORY_RESET_PHRASE, {
    message: `Debe escribir exactamente "${FACTORY_RESET_PHRASE}"`,
  })
  confirmationPhrase: typeof FACTORY_RESET_PHRASE;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;
}

export class DeleteAccountDto implements DeleteAccountRequest {
  @IsString()
  @IsNotEmpty()
  @Equals(DELETE_ACCOUNT_PHRASE, {
    message: `Debe escribir exactamente "${DELETE_ACCOUNT_PHRASE}"`,
  })
  confirmationPhrase: typeof DELETE_ACCOUNT_PHRASE;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;
}
