import {
  CreateAccountRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
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
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignore if response is not JSON
    }
    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
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
    async list() {
      const res = await fetch(`${API_BASE_URL}/accounts`, {
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

    async update(id: string, data: { name?: string; isCashOrBank?: boolean }) {
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
  },

  reports: {
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

    async incomeStatement(periodId: string) {
      const res = await fetch(`${API_BASE_URL}/reports/income-statement?periodId=${periodId}`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async realVsProjectedIncomeStatement(fiscalYearId: string, rolling?: boolean) {
      let url = `${API_BASE_URL}/reports/income-statement/real-vs-projected?fiscalYearId=${fiscalYearId}`;
      if (rolling !== undefined) {
        url += `&rolling=${rolling}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async realVsProjectedCashFlow(fiscalYearId: string, rolling?: boolean) {
      let url = `${API_BASE_URL}/reports/cash-flow/real-vs-projected?fiscalYearId=${fiscalYearId}`;
      if (rolling !== undefined) {
        url += `&rolling=${rolling}`;
      }
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

  fiscalYears: {
    async list() {
      const res = await fetch(`${API_BASE_URL}/fiscal-years`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async create(data: { year: number; startDate: string; endDate: string }) {
      const res = await fetch(`${API_BASE_URL}/fiscal-years`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async close(id: string, data?: { retainedEarningsAccountId?: string }) {
      const res = await fetch(`${API_BASE_URL}/fiscal-years/${id}/close`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data || {}),
      });
      return handleResponse(res);
    },
  },

  periods: {
    async list(fiscalYearId?: string) {
      const url = new URL(`${API_BASE_URL}/periods`);
      if (fiscalYearId) {
        url.searchParams.append('fiscalYearId', fiscalYearId);
      }
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async listFiscalYears() {
      const res = await fetch(`${API_BASE_URL}/fiscal-years`, {
        method: 'GET',
        headers: getHeaders(),
      });
      return handleResponse(res);
    },

    async update(id: string, data: { status: 'OPEN' | 'CLOSED' | 'PLANNING' }) {
      const res = await fetch(`${API_BASE_URL}/periods/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
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
  baseUrl: API_BASE_URL,
};
