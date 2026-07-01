import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CurrencyInfo {
  code?: string;
  symbol?: string;
  decimalPlaces?: number;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency?: CurrencyInfo | string | null,
) {
  let symbol = '$';
  let decimals = 2;

  if (typeof currency === 'string') {
    if (currency === 'PYG') {
      symbol = '₲';
      decimals = 0;
    } else if (currency === 'USD') {
      symbol = 'u$s';
      decimals = 2;
    }
  } else if (currency) {
    if (currency.code === 'PYG') {
      symbol = '₲';
      decimals = 0;
    } else if (currency.code === 'USD') {
      symbol = 'u$s';
      decimals = 2;
    } else {
      symbol = currency.symbol || '$';
      decimals = currency.decimalPlaces !== undefined ? currency.decimalPlaces : 2;
    }
  }

  const numAmount = amount !== null && amount !== undefined ? Number(amount) : 0;

  const formatted = numAmount.toLocaleString('es-PY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${symbol} ${formatted}`;
}

export function formatLocalDateWithOffset(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  const offsetMinutes = localDate.getTimezoneOffset();
  const sign = offsetMinutes > 0 ? '-' : '+';
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mins = String(absOffset % 60).padStart(2, '0');
  const offsetStr = `${sign}${hours}:${mins}`;

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  return `${year}-${formattedMonth}-${formattedDay}T00:00:00.000${offsetStr}`;
}

export function formatLocalDateEndWithOffset(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const localDate = new Date(year, month - 1, day);

  const offsetMinutes = localDate.getTimezoneOffset();
  const sign = offsetMinutes > 0 ? '-' : '+';
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mins = String(absOffset % 60).padStart(2, '0');
  const offsetStr = `${sign}${hours}:${mins}`;

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  return `${year}-${formattedMonth}-${formattedDay}T23:59:59.999${offsetStr}`;
}

export function formatLocalDateTimeWithOffset(dateTimeStr: string): string {
  if (!dateTimeStr || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateTimeStr)) {
    return dateTimeStr;
  }
  const [datePart, timePart] = dateTimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute);

  const offsetMinutes = localDate.getTimezoneOffset();
  const sign = offsetMinutes > 0 ? '-' : '+';
  const absOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const mins = String(absOffset % 60).padStart(2, '0');
  const offsetStr = `${sign}${hours}:${mins}`;

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const formattedHour = String(hour).padStart(2, '0');
  const formattedMinute = String(minute).padStart(2, '0');
  return `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00.000${offsetStr}`;
}
