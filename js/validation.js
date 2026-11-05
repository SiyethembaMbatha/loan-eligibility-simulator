// ==========================================================================
// validation.js: turns what the user typed into numbers and checks it.
//
// Like eligibility.js, this file never touches the page. It just takes text
// in and gives a number or an error message back, so it is easy to test.
// ==========================================================================

import { CONFIG } from './config.js';
import { formatCurrency } from './format.js';

// The four inputs that need checking. The order here is the order in which
// errors are reported and the cursor jumps to the first problem field.
export const FIELDS = ['employer', 'income', 'expenses', 'loan'];

// --------------------------------------------------------------------------
// 1. Reading a number from text
// --------------------------------------------------------------------------

// Accepts "25000", "25 000", "25,000.50" or "R25000" and returns the number.
// Returns NaN ("not a number") if the text is not a valid positive amount.
export function parseAmount(raw) {
  const text = String(raw ?? '')
    .replace(/[\s,]/g, '') // remove spaces and commas
    .replace(/^R/i, ''); // remove a leading "R"

  // Digits only, with an optional decimal part of up to 2 places.
  // This also rejects negatives (-5) and scientific notation (1e5).
  const isValidAmount = /^\d+(\.\d{1,2})?$/.test(text);

  return isValidAmount ? Number(text) : NaN;
}

// --------------------------------------------------------------------------
// 2. Checking one field
// --------------------------------------------------------------------------

// Returns an error message, or '' (empty text) when the value is valid.
//   name = which field to check: 'income', 'expenses' or 'loan'
//   raw  = the text the user typed
export function validateField(name, raw, cfg = CONFIG) {
  // Get this field's label and allowed range from config.js
  const { label, min, max } = cfg.limits[name];

  // Nothing typed
  if (!String(raw ?? '').trim()) {
    return `${label} is required.`;
  }

  // The employer is text, so check its length instead of reading a number
  if (name === 'employer') {
    const length = String(raw).trim().length;

    if (length < min) {
      return `${label} must be at least ${min} characters.`;
    }

    if (length > max) {
      return `${label} must be ${max} characters or less.`;
    }

    return '';
  }
  
  const value = parseAmount(raw);

  // Typed something that is not a valid positive number
  if (Number.isNaN(value)) {
    return `${label} must be a positive number, for example 25000.`;
  }

  // Outside the allowed range
  if (value < min) {
    return `${label} must be at least ${formatCurrency(min)}.`;
  }

  if (value > max) {
    return `${label} must be ${formatCurrency(max)} or less.`;
  }

  // All good
  return '';
}

// --------------------------------------------------------------------------
// 3. Checking every field at once
// --------------------------------------------------------------------------

// Returns an object with one message per invalid field, for example
//   { income: 'Monthly income is required.' }
// An empty object {} means everything is valid.
export function validateAll(values, cfg = CONFIG) {
  const errors = {};

  for (const name of FIELDS) {
    const message = validateField(name, values[name], cfg);

    if (message) {
      errors[name] = message;
    }
  }

  return errors;
}