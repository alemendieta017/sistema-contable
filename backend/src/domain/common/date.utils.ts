export const FRIENDLY_MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function getFriendlyPeriodName(periodName: string): string {
  if (!periodName || !periodName.includes('-')) {
    return periodName;
  }
  const [yearStr, monthStr] = periodName.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return periodName;
  }
  return `${FRIENDLY_MONTH_NAMES[monthIndex]} ${yearStr}`;
}
