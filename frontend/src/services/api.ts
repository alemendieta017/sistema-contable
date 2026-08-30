import {
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  RollingBudgetMatrixResponse,
  UpdateBudgetMatrixRequest,
  BatchUpdateBudgetMatrixRequest,
  BatchUpdateBudgetMatrixResponse,
  ExtendBudgetMatrixRequest,
  ExtendBudgetMatrixResponse,
  MatrixCellUpdate,
  ApplyBudgetDriverRequest,
  ApplyBudgetDriverResponse,
  BaselineActualsRequest,
  BaselineActualsResponse,
  BudgetControlResponse,
  TransferBudgetFundsRequest,
  TransferBudgetFundsResponse,
  FactoryResetRequest,
  DeleteAccountRequest,
  DangerZoneResponse,
  EnsurePeriodResponse,
  PeriodResponse,
  NetWorthEvolutionResponse,
} from '@sistema-contable/shared';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorCode: string | undefined;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      errorCode = errorData.code;
    } catch {
      // Ignore if response is not JSON
    }
    const error = new Error(errorMessage) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = errorCode;
    throw error;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  auth: {
    async register(data: { fullName: string; email: string; password: string }) {
      const res = await fetch(`${API_BASE_URL}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await handleResponse(res);
      if (result && result.access_token) {
        localStorage.setItem('auth_token', result.access_token);
        localStorage.setItem('auth_user', JSON.stringify(result.user));
      }
      return result;
    },

    async login(data: { email: string; password: string }) {
      const res = await fetch(`${API_BASE_URL}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await handleResponse(res);
      if (result && result.access_token) {
        localStorage.setItem('auth_token', result.access_token);
        localStorage.setItem('auth_user', JSON.stringify(result.user));
      }
      return result;
    },

    async me() {
      const res = await fetch(`${API_BASE_URL}/v1/auth/me`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async changePassword(data: { currentPassword: string; newPassword: string }) {
      const res = await fetch(`${API_BASE_URL}/v1/auth/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async forgotPassword(data: { email: string }) {
      const res = await fetch(`${API_BASE_URL}/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async resetPassword(data: { token: string; newPassword: string }) {
      const res = await fetch(`${API_BASE_URL}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    logout() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    },

    getUser() {
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('auth_user');
        return user ? JSON.parse(user) : null;
      }
      return null;
    },
  },

  accounts: {
    async list(status?: 'ACTIVE' | 'INACTIVE' | 'ALL') {
      const url = new URL(`${API_BASE_URL}/accounts`);
      if (status) {
        url.searchParams.append('status', status);
      }
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async summary() {
      const res = await fetch(`${API_BASE_URL}/accounts/summary`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async create(data: CreateAccountRequest) {
      const res = await fetch(`${API_BASE_URL}/accounts`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async update(id: string, data: UpdateAccountRequest) {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async delete(id: string) {
      const res = await fetch(`${API_BASE_URL}/accounts/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  transactions: {
    async list(startDate?: string, endDate?: string) {
      const url = new URL(`${API_BASE_URL}/transactions`);
      if (startDate) url.searchParams.append('startDate', startDate);
      if (endDate) url.searchParams.append('endDate', endDate);

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async get(id: string) {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async create(data: CreateTransactionRequest) {
      const res = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async update(id: string, data: UpdateTransactionRequest) {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async delete(id: string) {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async reverse(id: string) {
      const res = await fetch(`${API_BASE_URL}/transactions/${id}/reverse`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  budgets: {
    async summary(period: string) {
      const res = await fetch(`${API_BASE_URL}/budgets/summary?period=${period}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async create(data: { accountId: string; limit: number; period: string }) {
      const res = await fetch(`${API_BASE_URL}/budgets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async getByPeriod(periodId: string) {
      const res = await fetch(`${API_BASE_URL}/budgets/by-period/${periodId}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async updateItems(
      periodId: string,
      data: { items: Array<{ accountId: string; amount: number }> },
    ) {
      const res = await fetch(`${API_BASE_URL}/budgets/by-period/${periodId}/items`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async replicate(data: { periodId: string; accountId: string; amount: number }) {
      const res = await fetch(`${API_BASE_URL}/budgets/replicate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async copyPrevious(periodId: string) {
      const res = await fetch(`${API_BASE_URL}/budgets/by-period/${periodId}/copy-previous`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async executionReport(periodId: string) {
      const res = await fetch(`${API_BASE_URL}/budgets/execution-report?periodId=${periodId}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async getRollingMatrix(
      startPeriod?: string,
      months?: number,
      categoryId?: string,
    ): Promise<RollingBudgetMatrixResponse> {
      let url = `${API_BASE_URL}/budgets/matrix`;
      const params = new URLSearchParams();
      if (startPeriod) params.append('startPeriod', startPeriod);
      if (months) params.append('months', String(months));
      if (categoryId) params.append('categoryId', categoryId);

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async getMatrix(
      startPeriodOrFiscalYear?: string,
      monthsOrCategory?: number | string,
      categoryIdParam?: string,
    ): Promise<RollingBudgetMatrixResponse> {
      let url = `${API_BASE_URL}/budgets/matrix`;
      const params = new URLSearchParams();
      if (startPeriodOrFiscalYear) {
        if (/^\d{4}-(0[1-9]|1[0-2])$/.test(startPeriodOrFiscalYear)) {
          params.append('startPeriod', startPeriodOrFiscalYear);
        } else {
          params.append('fiscalYearId', startPeriodOrFiscalYear);
        }
      }
      if (typeof monthsOrCategory === 'number') {
        params.append('months', String(monthsOrCategory));
        if (categoryIdParam) params.append('categoryId', categoryIdParam);
      } else if (typeof monthsOrCategory === 'string') {
        if (/^\d+$/.test(monthsOrCategory)) {
          params.append('months', monthsOrCategory);
          if (categoryIdParam) params.append('categoryId', categoryIdParam);
        } else {
          params.append('categoryId', monthsOrCategory);
        }
      }

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async getBudgetMatrix(
      startPeriodOrFiscalYear?: string,
      monthsOrCategory?: number | string,
      categoryIdParam?: string,
    ): Promise<RollingBudgetMatrixResponse> {
      return this.getMatrix(startPeriodOrFiscalYear, monthsOrCategory, categoryIdParam);
    },

    async updateMatrixBatch(
      dataOrFiscalYear: string | BatchUpdateBudgetMatrixRequest | UpdateBudgetMatrixRequest,
      updates?: MatrixCellUpdate[],
    ): Promise<BatchUpdateBudgetMatrixResponse> {
      const body =
        typeof dataOrFiscalYear === 'string'
          ? { updates: updates || [] }
          : Array.isArray((dataOrFiscalYear as any).updates)
            ? dataOrFiscalYear
            : { updates: [] };
      const res = await fetch(`${API_BASE_URL}/budgets/matrix/batch-update`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      return handleResponse(res);
    },

    async updateBudgetMatrix(
      dataOrFiscalYear: string | BatchUpdateBudgetMatrixRequest | UpdateBudgetMatrixRequest,
      updates?: MatrixCellUpdate[],
    ): Promise<BatchUpdateBudgetMatrixResponse> {
      return this.updateMatrixBatch(dataOrFiscalYear, updates);
    },

    async extendBudgetMatrix(data: ExtendBudgetMatrixRequest): Promise<ExtendBudgetMatrixResponse> {
      const res = await fetch(`${API_BASE_URL}/budgets/matrix/extend`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async deleteMatrixRow(
      fiscalYearId: string,
      accountId: string,
      subRowId?: string | null,
    ): Promise<{ success: boolean }> {
      let url = `${API_BASE_URL}/budgets/matrix/row?fiscalYearId=${encodeURIComponent(fiscalYearId)}&accountId=${encodeURIComponent(accountId)}`;
      if (subRowId) {
        url += `&subRowId=${encodeURIComponent(subRowId)}`;
      }
      const res = await fetch(url, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async deleteBudgetMatrixRow(
      fiscalYearId: string,
      accountId: string,
      subRowId?: string | null,
    ): Promise<{ success: boolean }> {
      return this.deleteMatrixRow(fiscalYearId, accountId, subRowId);
    },

    async applyDriver(data: ApplyBudgetDriverRequest): Promise<ApplyBudgetDriverResponse> {
      const res = await fetch(`${API_BASE_URL}/budgets/matrix/apply-driver`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async applyBudgetDriver(data: ApplyBudgetDriverRequest): Promise<ApplyBudgetDriverResponse> {
      return this.applyDriver(data);
    },

    async getBaselineActuals(data: BaselineActualsRequest): Promise<BaselineActualsResponse> {
      const res = await fetch(`${API_BASE_URL}/budgets/matrix/baseline-actuals`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async baselineActuals(data: BaselineActualsRequest): Promise<BaselineActualsResponse> {
      return this.getBaselineActuals(data);
    },

    async getPriorYearActuals(data: BaselineActualsRequest): Promise<BaselineActualsResponse> {
      return this.getBaselineActuals(data);
    },

    async getControl(periodId: string): Promise<BudgetControlResponse> {
      const res = await fetch(
        `${API_BASE_URL}/budgets/control?periodId=${encodeURIComponent(periodId)}`,
        {
          method: 'GET',
          headers: getHeaders(),
        },
      );
      return handleResponse(res);
    },

    async getBudgetControl(periodId: string): Promise<BudgetControlResponse> {
      return this.getControl(periodId);
    },

    async transferFunds(data: TransferBudgetFundsRequest): Promise<TransferBudgetFundsResponse> {
      const res = await fetch(`${API_BASE_URL}/budgets/control/transfer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async transferControl(data: TransferBudgetFundsRequest): Promise<TransferBudgetFundsResponse> {
      return this.transferFunds(data);
    },

    async transferBudgetFunds(
      data: TransferBudgetFundsRequest,
    ): Promise<TransferBudgetFundsResponse> {
      return this.transferFunds(data);
    },
  },

  reports: {
    async netWorthEvolution(options?: {
      startPeriod?: string;
      endPeriod?: string;
    }): Promise<NetWorthEvolutionResponse> {
      let url = `${API_BASE_URL}/reports/net-worth-evolution`;
      const queryParams = new URLSearchParams();
      if (options?.startPeriod) queryParams.append('startPeriod', options.startPeriod);
      if (options?.endPeriod) queryParams.append('endPeriod', options.endPeriod);
      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async statistics(period: string, type: 'INCOME' | 'EXPENSE', timezoneOffset?: number) {
      let url = `${API_BASE_URL}/reports/statistics?period=${period}&type=${type}`;
      if (timezoneOffset !== undefined) {
        url += `&timezoneOffset=${timezoneOffset}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async balanceSheet(
      options:
        | { mode?: string; periodId?: string; date?: string; periodIds?: string[]; depth?: number }
        | string,
    ) {
      let url = `${API_BASE_URL}/reports/balance-sheet`;
      if (typeof options === 'string') {
        url += `?periodId=${options}`;
      } else {
        const queryParams = new URLSearchParams();
        if (options.mode) queryParams.append('mode', options.mode);
        if (options.periodId) queryParams.append('periodId', options.periodId);
        if (options.date) queryParams.append('date', options.date);
        if (options.depth) queryParams.append('depth', options.depth.toString());
        if (options.periodIds && Array.isArray(options.periodIds)) {
          options.periodIds.forEach((id) => queryParams.append('periodIds[]', id));
        }
        url += `?${queryParams.toString()}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async incomeStatement(periodId: string, mode?: 'real' | 'projected') {
      let url = `${API_BASE_URL}/reports/income-statement?periodId=${encodeURIComponent(periodId)}`;
      if (mode) {
        url += `&mode=${encodeURIComponent(mode)}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async realVsProjectedIncomeStatement(
      options?:
        | string
        | { startPeriod?: string; fiscalYearId?: string; rolling?: boolean; months?: number },
      rolling?: boolean,
    ) {
      let url = `${API_BASE_URL}/reports/income-statement/real-vs-projected`;
      const queryParams = new URLSearchParams();
      if (typeof options === 'string') {
        queryParams.append('startPeriod', options);
        if (rolling !== undefined) queryParams.append('rolling', rolling.toString());
      } else if (options) {
        if (options.startPeriod) queryParams.append('startPeriod', options.startPeriod);
        if (options.fiscalYearId) queryParams.append('fiscalYearId', options.fiscalYearId);
        if (options.rolling !== undefined)
          queryParams.append('rolling', options.rolling.toString());
        if (options.months !== undefined) queryParams.append('months', options.months.toString());
      }
      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async realVsProjectedCashFlow(
      options?:
        | string
        | { startPeriod?: string; fiscalYearId?: string; rolling?: boolean; months?: number },
      rolling?: boolean,
    ) {
      let url = `${API_BASE_URL}/reports/cash-flow/real-vs-projected`;
      const queryParams = new URLSearchParams();
      if (typeof options === 'string') {
        queryParams.append('startPeriod', options);
        if (rolling !== undefined) queryParams.append('rolling', rolling.toString());
      } else if (options) {
        if (options.startPeriod) queryParams.append('startPeriod', options.startPeriod);
        if (options.fiscalYearId) queryParams.append('fiscalYearId', options.fiscalYearId);
        if (options.rolling !== undefined)
          queryParams.append('rolling', options.rolling.toString());
        if (options.months !== undefined) queryParams.append('months', options.months.toString());
      }
      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async reconstructBalances() {
      const res = await fetch(`${API_BASE_URL}/reports/reconstruct-balances`, {
        method: 'POST',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },

  periods: {
    async list(): Promise<PeriodResponse[]> {
      const res = await fetch(`${API_BASE_URL}/periods`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async ensure(period: string): Promise<EnsurePeriodResponse> {
      const res = await fetch(`${API_BASE_URL}/periods/ensure`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ period }),
      });
      return handleResponse(res);
    },

    async update(
      id: string,
      data: { status: 'OPEN' | 'CLOSED' | 'PLANNING' },
    ): Promise<PeriodResponse> {
      const res = await fetch(`${API_BASE_URL}/periods/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },

  fiscalYears: {
    async list(): Promise<any[]> {
      const periods = await api.periods.list();
      const yearsSet = new Set(periods.map((p) => (p.name ? p.name.substring(0, 4) : '2026')));
      if (yearsSet.size === 0) {
        const currentYear = new Date().getFullYear().toString();
        yearsSet.add(currentYear);
      }
      return Array.from(yearsSet).map((y) => ({
        id: y,
        name: y,
        year: Number(y),
        status: 'OPEN',
      }));
    },
  },

  currencies: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/currencies`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async updateRate(id: string, rateToBase: number) {
      const res = await fetch(`${API_BASE_URL}/currencies/${id}/rate`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ rateToBase }),
      });
      return handleResponse(res);
    },
  },

  backup: {
    async export() {
      const res = await fetch(`${API_BASE_URL}/backup/export`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async import(data: any) {
      const res = await fetch(`${API_BASE_URL}/backup/import`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },

  dangerZone: {
    async resetData(data: FactoryResetRequest): Promise<DangerZoneResponse> {
      const res = await fetch(`${API_BASE_URL}/v1/danger-zone/reset-data`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async deleteAccount(data: DeleteAccountRequest): Promise<DangerZoneResponse> {
      const res = await fetch(`${API_BASE_URL}/v1/danger-zone/delete-account`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  baseUrl: API_BASE_URL,
};
