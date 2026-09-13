export const CURRENCY_CODE = 'DZD';
export const CURRENCY_SYMBOL = 'DZD';

/**
 * Format a number into DZD prefix format: "DZD 1,234.50" or "DZD 0.00"
 */
export function formatDZD(amount: number): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `DZD ${num.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a number into DZD (Algerian Dinar) string format: "1,234.50 DZD"
 */
export function formatCurrency(amount: number): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${num.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD`;
}

/**
 * Format a number with fixed 2 decimal places: "1234.50 DZD"
 */
export function formatMoney(amount: number): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${num.toFixed(2)} DZD`;
}

