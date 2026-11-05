// ==========================================================================
// eligibility.js: the loan maths and the eligibility rules.
//
// These are "pure" functions: they only take numbers in and give numbers out.
// They never touch the page (no DOM), which makes them easy to test and easy
// to swap for a real API later.
// ==========================================================================

import { CONFIG } from './config.js';

// --------------------------------------------------------------------------
// Helper
// --------------------------------------------------------------------------

// Rounds to 2 decimal places (cents), e.g. 3538.9063 becomes 3538.91
const round2 = (number) => Math.round(number * 100) / 100;

// --------------------------------------------------------------------------
// 1. Loan maths
// --------------------------------------------------------------------------

// Works out the fixed monthly payment for a loan, using the standard
// amortisation formula that banks and loan calculators use.
//   principal  = the amount borrowed
//   annualRate = yearly interest rate as a decimal (0.12 means 12%)
//   months     = how long the loan lasts
export function monthlyRepayment(principal, annualRate, months) {
  const monthlyRate = annualRate / 12;

  // With 0% interest the formula would divide by zero, so split evenly instead
  if (monthlyRate === 0) {
    return principal / months;
  }

  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}

// The reverse of the function above: given a monthly payment someone can
// afford, how large a loan could that payment support?
export function maxLoanForRepayment(payment, annualRate, months) {
  const monthlyRate = annualRate / 12;

  // No money available for repayments means no loan is possible
  if (payment <= 0) {
    return 0;
  }

  if (monthlyRate === 0) {
    return payment * months;
  }

  return (payment * (1 - (1 + monthlyRate) ** -months)) / monthlyRate;
}

// --------------------------------------------------------------------------
// 2. Eligibility check
// --------------------------------------------------------------------------

// Takes the customer's figures and returns the full (mocked) result.
// "cfg" defaults to the settings in config.js, but tests can pass their own.
export function calculateEligibility(
  { income, expenses, loan, termMonths },
  cfg = CONFIG
) {
  // What the loan would cost
  const repayment = monthlyRepayment(loan, cfg.annualRate, termMonths);
  const totalRepayable = repayment * termMonths;

  // Money left each month after expenses
  const disposable = income - expenses;

  // How big the repayment is compared with income, and with the money left over.
  // If nothing is left over, the second ratio is treated as infinite (unaffordable).
  const incomeShare = repayment / income;
  const disposableShare = disposable > 0 ? repayment / disposable : Infinity;

  // The largest monthly repayment we would consider comfortable: the lower of
  // the income limit and the disposable-income limit, and never below zero
  const affordable = Math.max(
    0,
    Math.min(
      income * cfg.likely.income,
      disposable * cfg.likely.disposable
    )
  );

  // The biggest loan that repayment could support, rounded down to the nearest R100
  const maxLoan =
    Math.floor(maxLoanForRepayment(affordable, cfg.annualRate, termMonths) / 100) * 100;

  // Decide the outcome. Both ratios must be within the limits for a status.
  let status = 'unlikely';

  if (
    incomeShare <= cfg.likely.income &&
    disposableShare <= cfg.likely.disposable
  ) {
    status = 'likely';
  } else if (
    incomeShare <= cfg.review.income &&
    disposableShare <= cfg.review.disposable
  ) {
    status = 'review';
  }

  return {
    status,
    repayment: round2(repayment),
    totalRepayable: round2(totalRepayable),
    totalInterest: round2(totalRepayable - loan),
    disposable,
    incomeShare,
    maxLoan,

    // If the loan is not a clear "likely", suggest the smaller of what was
    // asked for and what the customer could afford
    suggestedAmount: status === 'likely' ? loan : Math.min(loan, maxLoan),
  };
}