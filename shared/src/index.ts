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
export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
export const AccountStatusSchema = z.nativeEnum(AccountStatus);

export const SystemRoleSchema = z
  .enum(['CAPITAL', 'NET_INCOME', 'RETAINED_EARNINGS'])
  .nullable()
  .optional();
export type SystemRole = 'CAPITAL' | 'NET_INCOME' | 'RETAINED_EARNINGS';

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

// Update Account Request Schema
export const UpdateAccountRequestSchema = z.object({
  name: z.string().min(1).optional(),
  isCashOrBank: z.boolean().optional(),
  status: AccountStatusSchema.optional(),
});

export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;

// Transaction entry modes
export enum TransactionMode {
  QUICK = 'QUICK',
  FREE_JOURNAL = 'FREE_JOURNAL',
}
export const TransactionModeSchema = z.nativeEnum(TransactionMode);

// Operation template for Quick Transaction
export enum QuickOperationType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER',
}
export const QuickOperationTypeSchema = z.nativeEnum(QuickOperationType);

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

// Ensure Period Schema
export const EnsurePeriodRequestSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in YYYY-MM format'),
});

export type EnsurePeriodRequest = z.infer<typeof EnsurePeriodRequestSchema>;

export interface EnsurePeriodResponse {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  userId: string;
  created: boolean;
}

export interface PeriodResponse {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  userId: string;
}

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

// Cash Flow Direction Enum
export enum CashFlowDirection {
  INGRESO_EFECTIVO = 'INGRESO_EFECTIVO',
  EGRESO_EFECTIVO = 'EGRESO_EFECTIVO',
}

export const CashFlowDirectionSchema = z.nativeEnum(CashFlowDirection);

// Budget Planning Matrix & Execution Control
export enum BudgetDriverType {
  FLAT_PRORATE = 'FLAT_PRORATE',
  WEIGHTED_HISTORICAL = 'WEIGHTED_HISTORICAL',
  PERCENTAGE_GROWTH = 'PERCENTAGE_GROWTH',
  FORWARD_FILL = 'FORWARD_FILL',
  PRIOR_YEAR_ACTUAL = 'PRIOR_YEAR_ACTUAL',
}

export const BudgetDriverTypeSchema = z.nativeEnum(BudgetDriverType);

export enum FlowIntention {
  PAY = 'PAY',
  RECEIVE = 'RECEIVE',
  INVEST = 'INVEST',
  SAVE = 'SAVE',
  DIVEST = 'DIVEST',
}

export const FlowIntentionSchema = z.nativeEnum(FlowIntention).nullable().optional();

export enum BudgetGaugeStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  OVERBUDGET = 'OVERBUDGET',
}

export const BudgetGaugeStatusSchema = z.nativeEnum(BudgetGaugeStatus);

export { BudgetGaugeStatus as GaugeStatus };
export { BudgetGaugeStatusSchema as GaugeStatusSchema };

export enum BudgetMatrixSectionKey {
  INGRESOS = 'INGRESOS',
  GASTOS_VIDA = 'GASTOS_VIDA',
  AHORRO_INVERSIONES = 'AHORRO_INVERSIONES',
  DEUDAS_FINANCIACION = 'DEUDAS_FINANCIACION',
  // Deprecated legacy aliases for transitional compatibility
  EGRESOS = 'EGRESOS',
  FINANCIAMIENTO_AHORRO = 'FINANCIAMIENTO_AHORRO',
}

export const BudgetMatrixSectionKeySchema = z.nativeEnum(BudgetMatrixSectionKey);

export const MatrixCellUpdateSchema = z.object({
  periodId: z.string().uuid(),
  accountId: z.string().uuid(),
  subRowId: z.string().nullable().optional(),
  subRowLabel: z.string().nullable().optional(),
  amount: z.number().min(0),
  cashFlowDirection: CashFlowDirectionSchema.nullable().optional(),
  flowIntention: FlowIntentionSchema,
  isDeleted: z.boolean().optional(),
});

export type MatrixCellUpdate = z.infer<typeof MatrixCellUpdateSchema>;

export const UpdateBudgetMatrixRequestSchema = z.object({
  fiscalYearId: z.string().uuid().optional(),
  updates: z.array(MatrixCellUpdateSchema),
});

export type UpdateBudgetMatrixRequest = z.infer<typeof UpdateBudgetMatrixRequestSchema>;

export const BatchUpdateBudgetMatrixRequestSchema = z.object({
  updates: z.array(MatrixCellUpdateSchema),
});

export type BatchUpdateBudgetMatrixRequest = z.infer<typeof BatchUpdateBudgetMatrixRequestSchema>;

export interface BatchUpdateBudgetMatrixResponse {
  success: boolean;
  updatedCount: number;
}

export const ExtendBudgetMatrixRequestSchema = z.object({
  targetPeriod: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Target period must be in YYYY-MM format'),
  copyFromPrevious: z.boolean().optional().default(true),
});

export type ExtendBudgetMatrixRequest = z.infer<typeof ExtendBudgetMatrixRequestSchema>;

export interface ExtendBudgetMatrixResponse {
  success: boolean;
  provisionedPeriod: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
  };
  itemsCopied: number;
}

export interface UpdateBudgetMatrixResponse {
  success: boolean;
  updatedCount: number;
}

export const ApplyBudgetDriverRequestSchema = z.object({
  fiscalYearId: z.string().uuid().optional(),
  accountId: z.string().uuid(),
  subRowId: z.string().nullable().optional(),
  driverType: BudgetDriverTypeSchema,
  annualTotal: z.number().optional().nullable(),
  growthPercentage: z.number().optional().nullable(),
  sourcePeriodId: z.string().uuid().optional().nullable(),
});

export type ApplyBudgetDriverRequest = z.infer<typeof ApplyBudgetDriverRequestSchema>;

export interface ApplyBudgetDriverResponse {
  success: boolean;
  accountId: string;
  monthlyAmounts: Record<string, number>;
}

export const BaselineActualsRequestSchema = z.object({
  fiscalYearId: z.string().uuid().optional(),
  adjustmentPercentage: z.number().default(0),
  accountIds: z.array(z.string().uuid()).optional(),
});

export type BaselineActualsRequest = z.infer<typeof BaselineActualsRequestSchema>;

export interface BaselineActualsResponse {
  success: boolean;
  matrix: Array<{
    accountId: string;
    amounts: Record<string, number>;
  }>;
}

export const TransferBudgetFundsRequestSchema = z.object({
  periodId: z.string().uuid(),
  sourceAccountId: z.string().uuid(),
  targetAccountId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().optional().nullable(),
});

export type TransferBudgetFundsRequest = z.infer<typeof TransferBudgetFundsRequestSchema>;

export interface TransferBudgetFundsResponse {
  success: boolean;
  reassignmentId: string;
  updatedSourceAvailable: number;
  updatedTargetAvailable: number;
}

export interface BudgetMatrixPeriod {
  id: string;
  name: string;
  friendlyName: string;
  status: string;
}

export interface BudgetMatrixRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentId?: string | null;
  isParent?: boolean;
  subRowId?: string | null;
  subRowLabel?: string | null;
  cashFlowDirection?: CashFlowDirection | null;
  amounts: Record<string, number>;
  flowIntentions?: Record<string, FlowIntention | null>;
  rowTotal: number;
}

export interface BudgetMatrixSection {
  sectionKey: BudgetMatrixSectionKey | string;
  sectionTitle: string;
  rows: BudgetMatrixRow[];
  sectionTotals: Record<string, number> & { total: number };
}

export const BudgetMatrixSummarySchema = z.object({
  totalInflows: z.record(z.string(), z.number()),
  totalOutflows: z.record(z.string(), z.number()),
  netMonthlyFlow: z.record(z.string(), z.number()),
  cumulativeNetFlow: z.record(z.string(), z.number()),
});

export interface BudgetMatrixSummary {
  totalInflows: Record<string, number> & { total: number };
  totalOutflows: Record<string, number> & { total: number };
  netMonthlyFlow: Record<string, number> & { total: number };
  cumulativeNetFlow: Record<string, number> & { total: number };
}

export interface RollingCashFlowSummary {
  totalInflows: Record<string, number> & { total: number };
  operatingExpenses: Record<string, number> & { total: number };
  operatingSurplus: Record<string, number> & { total: number };
  investmentsAndSavings: Record<string, number> & { total: number };
  debtFinancing: Record<string, number> & { total: number };
  netCashFlow: Record<string, number> & { total: number };
  openingCash: Record<string, number>;
  closingCash: Record<string, number>;
  shortfallAlerts: Record<string, { isNegative: boolean; shortfall: number }>;
}

export interface RollingBudgetMatrixResponse {
  startPeriod: string;
  monthsCount: number;
  periods: BudgetMatrixPeriod[];
  sections: BudgetMatrixSection[];
  cashFlowForecast: RollingCashFlowSummary;
}

export interface BudgetMatrixResponse {
  fiscalYearId?: string;
  fiscalYearName?: string;
  startPeriod?: string;
  monthsCount?: number;
  periods: BudgetMatrixPeriod[];
  sections?: BudgetMatrixSection[];
  summary?: BudgetMatrixSummary;
  rows?: BudgetMatrixRow[];
  categoryTotals?: Record<string, Record<string, number> & { total: number }>;
  cashFlowForecast?: RollingCashFlowSummary;
}

export interface BudgetControlItem {
  accountId: string;
  accountName: string;
  accountCode?: string;
  subRowId?: string | null;
  subRowLabel?: string | null;
  cashFlowDirection?: CashFlowDirection | null;
  budgeted: number;
  executed: number;
  committed: number;
  available: number;
  consumptionPercentage: number;
  gaugeStatus: BudgetGaugeStatus;
}

export interface BudgetControlSection {
  sectionKey: BudgetMatrixSectionKey | string;
  sectionTitle: string;
  budgeted: number;
  executed: number;
  committed: number;
  available: number;
  consumptionPercentage: number;
  gaugeStatus: BudgetGaugeStatus;
  items: BudgetControlItem[];
}

export interface BudgetControlCategory {
  categoryName: string;
  accountType: string;
  budgeted: number;
  executed: number;
  committed: number;
  available: number;
  consumptionPercentage: number;
  gaugeStatus: BudgetGaugeStatus;
  items: BudgetControlItem[];
}

export interface BudgetControlSummary {
  totalBudgeted: number;
  totalExecuted: number;
  totalCommitted: number;
  totalAvailable: number;
  overallConsumptionPercentage: number;
  overallGaugeStatus: BudgetGaugeStatus;
}

export interface BudgetControlResponse {
  periodId: string;
  periodName: string;
  friendlyName: string;
  isLocked: boolean;
  summary: BudgetControlSummary;
  sections?: BudgetControlSection[];
  categories?: BudgetControlCategory[];
}

export interface MobilePlanningState {
  activePeriodId: string;
  activePeriodIndex: number;
  expandedAccordionSections: Set<BudgetMatrixSectionKey>;
  deepDiveRow: BudgetMatrixRow | null;
  isDeepDiveOpen: boolean;
  isOptionsMenuOpen: boolean;
  activeMenuRow: BudgetMatrixRow | null;
}

export interface DeepDiveDistributionParams {
  type: 'FLAT' | 'COPY_JAN' | 'PRIOR_YEAR';
  annualTotal?: number;
  percentageAdjustment?: number;
}

// Danger Zone Actions & Schemas
export enum DangerZoneAction {
  FACTORY_RESET = 'FACTORY_RESET',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
}

export const FACTORY_RESET_PHRASE = 'RESTABLECER DATOS';
export const DELETE_ACCOUNT_PHRASE = 'ELIMINAR MI CUENTA';

export const FactoryResetRequestSchema = z.object({
  confirmationPhrase: z.literal(FACTORY_RESET_PHRASE, {
    errorMap: () => ({ message: `Debe escribir exactamente "${FACTORY_RESET_PHRASE}"` }),
  }),
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
});

export type FactoryResetRequest = z.infer<typeof FactoryResetRequestSchema>;

export const DeleteAccountRequestSchema = z.object({
  confirmationPhrase: z.string().refine((val) => val === DELETE_ACCOUNT_PHRASE, {
    message: `Debe escribir exactamente "${DELETE_ACCOUNT_PHRASE}"`,
  }),
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
});

export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequestSchema>;

export const DangerZoneResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  action: z.nativeEnum(DangerZoneAction),
  timestamp: z.string().datetime(),
});

export type DangerZoneResponse = z.infer<typeof DangerZoneResponseSchema>;

export interface StarterAccountDefinition {
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  isCashOrBank?: boolean;
  systemRole?: SystemRole;
}

export const DEFAULT_STARTER_ACCOUNTS: StarterAccountDefinition[] = [
  // Cuenta de Sistema obligatoria para patrimonio y saldos iniciales
  { name: 'Capital', type: 'EQUITY', systemRole: 'CAPITAL' },
];

// Tactical Commitments & Recurring Schedules
export enum RecurringFrequency {
  MONTHLY = 'MONTHLY',
  BIWEEKLY = 'BIWEEKLY',
  ANNUALLY = 'ANNUALLY',
}
export const RecurringFrequencySchema = z.nativeEnum(RecurringFrequency);

export enum FlowType {
  INFLOW = 'INFLOW',
  OUTFLOW = 'OUTFLOW',
}
export const FlowTypeSchema = z.nativeEnum(FlowType);

export const CreateRecurringScheduleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  flowType: FlowTypeSchema,
  estimatedAmount: z.number().positive(),
  frequency: RecurringFrequencySchema.default(RecurringFrequency.MONTHLY),
  dueDay: z.number().int().min(1).max(31),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type CreateRecurringScheduleRequest = z.infer<typeof CreateRecurringScheduleRequestSchema>;

export const UpdateRecurringScheduleRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  flowType: FlowTypeSchema.optional(),
  estimatedAmount: z.number().positive().optional(),
  frequency: RecurringFrequencySchema.optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional().nullable(),
});

export type UpdateRecurringScheduleRequest = z.infer<typeof UpdateRecurringScheduleRequestSchema>;

export interface RecurringScheduleDto {
  id: string;
  name: string;
  flowType: FlowType | 'INFLOW' | 'OUTFLOW';
  estimatedAmount: number;
  frequency: RecurringFrequency | 'MONTHLY' | 'BIWEEKLY' | 'ANNUALLY';
  dueDay: number;
  accountId: string;
  categoryId: string;
  accountName?: string;
  categoryName?: string;
  isActive: boolean;
  metadata?: Record<string, any> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VirtualCalendarEvent {
  scheduleId: string;
  name: string;
  flowType: FlowType | 'INFLOW' | 'OUTFLOW';
  date: string;
  estimatedAmount: number;
  accountId: string;
  accountName?: string;
  categoryId: string;
  categoryName?: string;
  isSettled: boolean;
}

export interface CalendarPreviewResponse {
  startDate: string;
  endDate: string;
  virtualEvents: VirtualCalendarEvent[];
  projectedNetCommitments: number;
}

export const SettleRecurringScheduleRequestSchema = z.object({
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  actualAmount: z.number().positive(),
  description: z.string().min(1),
});

export type SettleRecurringScheduleRequest = z.infer<typeof SettleRecurringScheduleRequestSchema>;

export interface SettleRecurringScheduleResponse {
  success: boolean;
  transactionId: string;
  settledDate: string;
  amount: number;
  balanceCascadeUpdated: boolean;
}

// Net Worth Evolution Time-Series
export interface NetWorthEvolutionPoint {
  period: string;
  date: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export interface NetWorthEvolutionResponse {
  history: NetWorthEvolutionPoint[];
  latest: {
    assets: number;
    liabilities: number;
    netWorth: number;
  };
  change12Months: number;
  changePercentage: number;
}
