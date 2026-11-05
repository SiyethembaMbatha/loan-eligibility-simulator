// ==========================================================================
// Unit tests for the eligibility logic and the input validation.
// Run them with: npm test
// ==========================================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  monthlyRepayment,
  maxLoanForRepayment,
  calculateEligibility,
} from '../js/eligibility.js';

import {
  parseAmount,
  validateField,
  validateAll,
} from '../js/validation.js';

// --------------------------------------------------------------------------
// Helper: checks that two numbers are "close enough" (within a tolerance).
// Useful because money calculations can differ by tiny decimal amounts.
// --------------------------------------------------------------------------
const near = (actual, expected, tolerance = 0.01) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} is not within ${tolerance} of ${expected}`
  );
};

// --------------------------------------------------------------------------
// Loan maths
// --------------------------------------------------------------------------

test('repayment matches a known loan calculator result', () => {
  near(monthlyRepayment(85000, 0.285, 36), 3538.91);
});

test('zero interest splits the principal evenly', () => {
  assert.equal(monthlyRepayment(12000, 0, 12), 1000);
});

test('max loan is the inverse of repayment', () => {
  const repayment = monthlyRepayment(50000, 0.12, 48);
  near(maxLoanForRepayment(repayment, 0.12, 48), 50000, 0.001);
});

// --------------------------------------------------------------------------
// Eligibility outcomes
// --------------------------------------------------------------------------

test('comfortable loan is likely eligible', () => {
  const result = calculateEligibility({
    income: 30000,
    expenses: 10000,
    loan: 100000,
    termMonths: 36,
  });

  assert.equal(result.status, 'likely');
  assert.equal(result.suggestedAmount, 100000);
});

test('borderline loan needs review and suggests a lower amount', () => {
  const result = calculateEligibility({
    income: 20000,
    expenses: 5000,
    loan: 300000,
    termMonths: 60,
  });

  assert.equal(result.status, 'review');
  assert.ok(result.suggestedAmount < 300000);
});

test('repayment above disposable income is unlikely', () => {
  const result = calculateEligibility({
    income: 20000,
    expenses: 15000,
    loan: 200000,
    termMonths: 36,
  });

  assert.equal(result.status, 'unlikely');
});

test('no disposable income is unlikely with zero max loan', () => {
  const result = calculateEligibility({
    income: 10000,
    expenses: 12000,
    loan: 5000,
    termMonths: 12,
  });

  assert.equal(result.status, 'unlikely');
  assert.equal(result.maxLoan, 0);
});

test('borrowing the estimated maximum is likely eligible', () => {
  const base = { income: 30000, expenses: 10000, termMonths: 60 };

  // First find the maximum loan, then check that borrowing exactly that is fine.
  const { maxLoan } = calculateEligibility({ ...base, loan: 100000 });
  const result = calculateEligibility({ ...base, loan: maxLoan });

  assert.equal(result.status, 'likely');
});

// --------------------------------------------------------------------------
// Input parsing and validation
// --------------------------------------------------------------------------

test('parseAmount accepts common formats and rejects bad input', () => {
  assert.equal(parseAmount('25 000'), 25000);
  assert.equal(parseAmount('R25,000.50'), 25000.5);

  const badInputs = ['', 'abc', '-5', '1e5', '12.345'];
  for (const bad of badInputs) {
    assert.ok(Number.isNaN(parseAmount(bad)), bad);
  }
});

test('validation enforces required, numeric and range rules', () => {
  assert.match(validateField('income', ''), /required/);
  assert.match(validateField('income', '-1'), /positive number/);
  assert.match(validateField('loan', '500'), /at least/);
  assert.match(validateField('loan', '9999999'), /or less/);

  // Expenses are allowed to be zero.
  assert.equal(validateField('expenses', '0'), '');

  // All valid values produce no errors.
  assert.deepEqual(
    validateAll({ employer: 'Acme Ltd', income: '30000', expenses: '0', loan: '5000' }),
    {}
  );
});

test('employer must be present and a sensible length', () => {
  assert.match(validateField('employer', ''), /required/);
  assert.match(validateField('employer', 'A'), /at least/);
  assert.match(validateField('employer', 'A'.repeat(61)), /or less/);
  assert.equal(validateField('employer', 'Acme Ltd'), '');
});

test('a longer term lowers the repayment but raises total interest', () => {
  const base = { income: 30000, expenses: 10000, loan: 100000 };
  const short = calculateEligibility({ ...base, termMonths: 12 });
  const long = calculateEligibility({ ...base, termMonths: 60 });

  assert.ok(long.repayment < short.repayment);
  assert.ok(long.totalInterest > short.totalInterest);
});