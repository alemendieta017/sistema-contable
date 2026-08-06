import { z } from 'zod';

export enum AuthErrorCode {
  EMAIL_ALREADY_EXISTS = 'AUTH_EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  INVALID_CURRENT_PASSWORD = 'AUTH_INVALID_CURRENT_PASSWORD',
  EXPIRED_OR_INVALID_TOKEN = 'AUTH_EXPIRED_OR_INVALID_TOKEN',
  UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
}

export const PASSWORD_REGEX = /^.{6,}$/;
export const PASSWORD_COMPLEXITY_MESSAGE = 'Password must be at least 6 characters long';

// Base User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const RegisterRequestSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().regex(PASSWORD_REGEX, PASSWORD_COMPLEXITY_MESSAGE),
});

export type RegisterDto = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginRequestSchema>;
export type LoginRequest = LoginDto;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_COMPLEXITY_MESSAGE),
});

export type ChangePasswordDto = z.infer<typeof ChangePasswordRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().regex(PASSWORD_REGEX, PASSWORD_COMPLEXITY_MESSAGE),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordRequestSchema>;

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    createdAt?: string;
  };
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  createdAt?: string;
}

// Account Types
export const SystemRoleSchema = z.enum(['NET_INCOME', 'RETAINED_EARNINGS']).nullable().optional();
export type SystemRole = 'NET_INCOME' | 'RETAINED_EARNINGS';

export const AccountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

// Create Account Request Schema
export const CreateAccountRequestSchema = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  currencyId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  isCashOrBank: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  systemRole: SystemRoleSchema,
});

export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;

// Journal Entry Request Schema
export const JournalEntryRequestSchema = z.object({
  accountId: z.string().uuid(),
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive(),
});

export type JournalEntryRequest = z.infer<typeof JournalEntryRequestSchema>;

// Create Transaction Request Schema
export const CreateTransactionRequestSchema = z.object({
  accountingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  description: z.string().min(1),
  entries: z.array(JournalEntryRequestSchema).min(2),
});

export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;

export const UpdateTransactionRequestSchema = CreateTransactionRequestSchema;
export type UpdateTransactionRequest = CreateTransactionRequest;

// Create Fiscal Year Schema
export const CreateFiscalYearRequestSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
});

export type CreateFiscalYearRequest = z.infer<typeof CreateFiscalYearRequestSchema>;

// Close Fiscal Year Schema
export const CloseFiscalYearRequestSchema = z.object({
  retainedEarningsAccountId: z.string().uuid().optional(),
});

export type CloseFiscalYearRequest = z.infer<typeof CloseFiscalYearRequestSchema>;

// Update Period Schema
export const UpdatePeriodRequestSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'PLANNING']),
});

export type UpdatePeriodRequest = z.infer<typeof UpdatePeriodRequestSchema>;

// Update Account Flags (isCashOrBank)
export const UpdateAccountFlagsRequestSchema = z.object({
  isCashOrBank: z.boolean(),
});

export type UpdateAccountFlagsRequest = z.infer<typeof UpdateAccountFlagsRequestSchema>;

// Update Budget Items
export const BudgetItemUpdateSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number(),
});

export const UpdateBudgetItemsRequestSchema = z.object({
  items: z.array(BudgetItemUpdateSchema),
});

export type UpdateBudgetItemsRequest = z.infer<typeof UpdateBudgetItemsRequestSchema>;

// Replicate Budget Item to Fiscal Year
export const ReplicateBudgetItemRequestSchema = z.object({
  periodId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.number(),
});

export type ReplicateBudgetItemRequest = z.infer<typeof ReplicateBudgetItemRequestSchema>;
