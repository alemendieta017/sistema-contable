export class Budget {
  constructor(
    public readonly id: string | undefined,
    public readonly userId: string,
    public readonly accountId: string,
    public readonly limit: number,
    public readonly period: string,
  ) {}

  public isExceeded(spent: number): boolean {
    return spent > this.limit;
  }

  public getSpentPercentage(spent: number): number {
    if (this.limit <= 0) return 0;
    return Number(((spent / this.limit) * 100).toFixed(2));
  }
}

// --- New Domain Models and Interfaces for Budgeting Refactoring ---

export interface IBudgetItem {
  accountId: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId: string | null;
  isCashOrBank: boolean;
  amount: number;
}

export interface IBudgetDetail {
  id: string;
  periodId: string;
  periodName: string; // e.g. '2026-06'
  friendlyName: string; // e.g. 'Junio 2026'
  startDate: string; // e.g. '2026-06-01'
  endDate: string; // e.g. '2026-06-30'
  isLocked: boolean;
  items: IBudgetItem[];
}

export interface IBudgetUpdateItemDto {
  accountId: string;
  amount: number;
}

export interface IBudgetUpdateDto {
  items: IBudgetUpdateItemDto[];
}

export interface IBudgetUpdateResponse {
  success: boolean;
  updatedCount: number;
}

export interface IBudgetReplicateDto {
  periodId: string;
  accountId: string;
  amount: number;
}

export interface IBudgetReplicateResponse {
  success: boolean;
  replicatedPeriods: string[];
}

// --- Budget Execution Report Interfaces ---

export interface IExecutionItem {
  accountId: string;
  accountName: string;
  budgeted: number;
  real: number;
  deviation: number;
  isNegativeDeviation: boolean;
}

export interface IExpenseExecutionItem extends IExecutionItem {
  available: number;
}

export interface IConsumosSummary {
  income: IExecutionItem[];
  expense: IExpenseExecutionItem[];
  totalBudgetedIncome: number;
  totalRealIncome: number;
  totalBudgetedExpense: number;
  totalRealExpense: number;
}

export interface IBudgetExecutionReport {
  periodName: string;
  friendlyName: string;
  startDate: string;
  endDate: string;
  consumos: IConsumosSummary;
  ahorrosInversiones: IExecutionItem[];
  deudasTarjetas: IExecutionItem[];
  resumenLiquidez: {
    saldoCajaInicialReal: number;
    flujoNetoConsumos: {
      budgeted: number;
      real: number;
    };
    flujoNetoFinanciero: {
      budgeted: number;
      real: number;
    };
    flujoCajaNetoMes: {
      budgeted: number;
      real: number;
    };
    saldoCajaFinal: {
      projected: number;
      real: number;
    };
  };
}

// --- Forecast Reports Interfaces ---

export interface IIncomeStatementMonthForecast {
  periodId: string;
  periodName: string;
  status: 'OPEN' | 'CLOSED' | 'PLANNING';
  income: number;
  expense: number;
  netProfit: number;
  isReal: boolean;
}

export interface IIncomeStatementForecastReport {
  fiscalYearName: string;
  months: IIncomeStatementMonthForecast[];
}

export interface ICashFlowMonthForecast {
  periodId: string;
  periodName: string;
  status: 'OPEN' | 'CLOSED' | 'PLANNING';
  initialCash: number;
  netFlow: number;
  finalCash: number;
  isReal: boolean;
}

export interface ICashFlowForecastReport {
  fiscalYearName: string;
  months: ICashFlowMonthForecast[];
}

// --- Annual Budget Matrix & Execution Control Domain Interfaces ---

export type FlowIntentionType = 'PAY' | 'RECEIVE' | 'INVEST' | 'SAVE' | 'DIVEST';
export type CashFlowDirectionType = 'INGRESO_EFECTIVO' | 'EGRESO_EFECTIVO';
export type BudgetMatrixSectionKeyType =
  | 'INGRESOS'
  | 'GASTOS_VIDA'
  | 'AHORRO_INVERSIONES'
  | 'DEUDAS_FINANCIACION'
  | 'EGRESOS'
  | 'FINANCIAMIENTO_AHORRO';

export interface IBudgetMatrixPeriodDomain {
  id: string;
  name: string;
  friendlyName: string;
  status: string;
}

export interface IBudgetMatrixRowDomain {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentId?: string | null;
  isParent?: boolean;
  subRowId?: string | null;
  subRowLabel?: string | null;
  cashFlowDirection?: CashFlowDirectionType | null;
  amounts: Record<string, number>;
  flowIntentions?: Record<string, FlowIntentionType | null>;
  rowTotal: number;
}

export interface IBudgetMatrixSectionDomain {
  sectionKey: BudgetMatrixSectionKeyType | string;
  sectionTitle: string;
  rows: IBudgetMatrixRowDomain[];
  sectionTotals: Record<string, number> & { total: number };
}

export interface IBudgetMatrixSummaryDomain {
  totalInflows: Record<string, number> & { total: number };
  totalOutflows: Record<string, number> & { total: number };
  netMonthlyFlow: Record<string, number> & { total: number };
  cumulativeNetFlow: Record<string, number> & { total: number };
}

export interface IBudgetMatrixDataDomain {
  fiscalYearId: string;
  fiscalYearName: string;
  periods: IBudgetMatrixPeriodDomain[];
  sections?: IBudgetMatrixSectionDomain[];
  summary?: IBudgetMatrixSummaryDomain;
  rows?: IBudgetMatrixRowDomain[];
  categoryTotals?: Record<string, Record<string, number> & { total: number }>;
}

export type BudgetDriverDomainType =
  | 'FLAT_PRORATE'
  | 'WEIGHTED_HISTORICAL'
  | 'PERCENTAGE_GROWTH'
  | 'FORWARD_FILL'
  | 'PRIOR_YEAR_ACTUAL';

export interface IBudgetDriverApplyParams {
  fiscalYearId: string;
  accountId: string;
  subRowId?: string | null;
  driverType: BudgetDriverDomainType;
  annualTotal?: number | null;
  growthPercentage?: number | null;
  sourcePeriodId?: string | null;
}

export interface IBudgetDriverResultDomain {
  success: boolean;
  accountId: string;
  monthlyAmounts: Record<string, number>;
}

export type GaugeStatusDomainType = 'NORMAL' | 'WARNING' | 'OVERBUDGET';

export interface IBudgetControlItemDomain {
  accountId: string;
  accountName: string;
  accountCode?: string;
  subRowId?: string | null;
  subRowLabel?: string | null;
  cashFlowDirection?: CashFlowDirectionType | null;
  budgeted: number;
  executed: number;
  committed: number;
  available: number;
  consumptionPercentage: number;
  gaugeStatus: GaugeStatusDomainType;
}

export interface IBudgetControlSectionDomain {
  sectionKey: BudgetMatrixSectionKeyType | string;
  sectionTitle: string;
  budgeted: number;
  executed: number;
  committed: number;
  available: number;
  consumptionPercentage: number;
  gaugeStatus: GaugeStatusDomainType;
  items: IBudgetControlItemDomain[];
}

export interface IBudgetControlCategoryDomain {
  categoryName: string;
  accountType: string;
  budgeted: number;
  executed: number;
  committed: number;
  available: number;
  consumptionPercentage: number;
  gaugeStatus: GaugeStatusDomainType;
  items: IBudgetControlItemDomain[];
}

export interface IBudgetControlSummaryDomain {
  totalBudgeted: number;
  totalExecuted: number;
  totalCommitted: number;
  totalAvailable: number;
  overallConsumptionPercentage: number;
  overallGaugeStatus: GaugeStatusDomainType;
}

export interface IBudgetControlDataDomain {
  periodId: string;
  periodName: string;
  friendlyName: string;
  isLocked: boolean;
  summary: IBudgetControlSummaryDomain;
  sections?: IBudgetControlSectionDomain[];
  categories?: IBudgetControlCategoryDomain[];
}

export interface IBudgetReassignmentDomain {
  id?: string;
  userId: string;
  periodId: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  reason?: string | null;
  createdAt?: Date;
}

export interface IBudgetTransferResultDomain {
  success: boolean;
  reassignmentId: string;
  updatedSourceAvailable: number;
  updatedTargetAvailable: number;
}
