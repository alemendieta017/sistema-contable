import { z } from "zod";

// Base User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  created_at: z.string().datetime()
});

export type User = z.infer<typeof UserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Account Types
export const AccountTypeSchema = z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

// Create Account Request Schema
export const CreateAccountRequestSchema = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  currencyId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.any()).optional()
});

export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;

// Journal Entry Request Schema
export const JournalEntryRequestSchema = z.object({
  accountId: z.string().uuid(),
  entryType: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive()
});

export type JournalEntryRequest = z.infer<typeof JournalEntryRequestSchema>;

// Create Transaction Request Schema
export const CreateTransactionRequestSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  entries: z.array(JournalEntryRequestSchema).min(2)
});

export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;

export const UpdateTransactionRequestSchema = CreateTransactionRequestSchema;
export type UpdateTransactionRequest = CreateTransactionRequest;

