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
