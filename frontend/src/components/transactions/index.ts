import type { AccountOption } from '../../types/account';
import type { CurrencyInfo } from '../../lib/utils';
import type {
  TransactionMode,
  QuickOperationType,
  CreateTransactionRequest,
  JournalEntryRequest,
} from '@sistema-contable/shared';

// Re-export shared types for transaction consumers
export type { TransactionMode, QuickOperationType, CreateTransactionRequest, JournalEntryRequest };

// Export ModeSelector component and props
export { ModeSelector } from './ModeSelector';
export type { ModeSelectorProps } from './ModeSelector';

// Export QuickTransactionForm component and props
export { default as QuickTransactionForm } from './QuickTransactionForm';

/**
 * Form values for Quick Transaction mode (5-step sequence)
 */
export interface QuickTransactionFormValues {
  accountingDate: string;
  operationType: QuickOperationType;
  primaryAccountId: string;
  secondaryAccountId: string;
  amount: number | '';
  description: string;
}

/**
 * Props for QuickTransactionForm component
 */
export interface QuickTransactionFormProps {
  accounts: AccountOption[];
  baseCurrency?: CurrencyInfo;
  initialValues?: Partial<QuickTransactionFormValues>;
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  onQuickCreateAccount?: (initialName: string, targetField: 'primary' | 'secondary') => void;
  className?: string;
}

/**
 * State representation for an individual line in Free Journal mode
 */
export interface FreeJournalLineState {
  id: string;
  accountId: string;
  debitAmount: number | '';
  creditAmount: number | '';
}

/**
 * Form values for Free Journal Entry Grid
 */
export interface FreeJournalFormValues {
  accountingDate: string;
  description: string;
  lines: FreeJournalLineState[];
}

/**
 * Props for individual FreeJournalEntryRow component
 */
export interface FreeJournalEntryRowProps {
  line: FreeJournalLineState;
  index: number;
  accounts: AccountOption[];
  baseCurrency?: CurrencyInfo;
  onChange: (updatedLine: FreeJournalLineState) => void;
  onRemove: () => void;
  canRemove: boolean;
  onQuickCreateAccount?: (initialName: string) => void;
  disabled?: boolean;
  isMobile?: boolean;
  error?: {
    account?: string;
    amount?: string;
  };
  className?: string;
}

// Export FreeJournalEntryRow component
export { default as FreeJournalEntryRow } from './FreeJournalEntryRow';

/**
 * Props for FreeJournalEntryGrid component
 */
export interface FreeJournalEntryGridProps {
  accounts: AccountOption[];
  baseCurrency?: CurrencyInfo;
  initialValues?: Partial<FreeJournalFormValues>;
  onSubmit: (payload: CreateTransactionRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  onQuickCreateAccount?: (initialName: string, lineIndex: number) => void;
  className?: string;
}

// Export FreeJournalEntryGrid component
export { default as FreeJournalEntryGrid } from './FreeJournalEntryGrid';

// Export AccountPickerSheet component and props
export { default as AccountPickerSheet } from './AccountPickerSheet';
export type { AccountPickerSheetProps, AccountPickerFilterMode } from './AccountPickerSheet';
