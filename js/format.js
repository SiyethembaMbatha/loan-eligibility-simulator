// ==========================================================================
// format.js: small helpers that turn numbers into display text.
// ==========================================================================

import { CONFIG } from './config.js';

// Formats a number as money using the currency set in config.js.
//   formatCurrency(85000)    gives "R 85 000"
//   formatCurrency(3538.91, 2) gives "R 3 538,91"
// "digits" is how many decimal places to show (0 by default).
export function formatCurrency(value, digits = 0, cfg = CONFIG) {
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

// Turns a ratio into a whole-number percentage: 0.347 becomes "35%"
export const formatPercent = (ratio) => `${Math.round(ratio * 100)}%`;