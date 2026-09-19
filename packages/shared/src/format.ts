import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from './constants.js';

/** ৳ 12,450.00 — used everywhere money is shown. */
export function formatMoney(value: number | string, withSymbol = true): string {
  const n = typeof value === 'string' ? Number(value) : value;
  const safe = Number.isFinite(n) ? n : 0;
  const formatted = new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
  return withSymbol ? `${CURRENCY_SYMBOL} ${formatted}` : formatted;
}

/** Compact form for dashboard tiles: ৳ 3.2L, ৳ 24.5K */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `${CURRENCY_SYMBOL} ${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `${CURRENCY_SYMBOL} ${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${CURRENCY_SYMBOL} ${(value / 1_000).toFixed(1)}K`;
  return `${CURRENCY_SYMBOL} ${value.toFixed(0)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE).format(value);
}

/** Percentage change vs a previous period; null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
