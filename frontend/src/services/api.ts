import {
  LoginRequest,
  CreateAccountRequest,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from '@sistema-contable/shared';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001/api`;
    }
  }
  return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiBaseUrl();

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
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const api = {
  auth: {
    async register(data: LoginRequest) {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },

    async login(data: LoginRequest) {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
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

    logout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
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
