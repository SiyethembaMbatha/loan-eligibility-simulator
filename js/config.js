// ==========================================================================
// config.js: every assumption and setting lives here.
// To change the interest rate, limits or currency, edit this file only.
// ==========================================================================

export const CONFIG = Object.freeze({
  // --------------------------------------------------------------------------
  // Currency display
  // --------------------------------------------------------------------------
  currency: 'ZAR',
  locale: 'en-ZA',

  // --------------------------------------------------------------------------
  // Loan assumptions
  // --------------------------------------------------------------------------
  annualRate: 0.22, // 22% interest per year (illustrative)
  terms: [6, 12, 24, 36, 48, 60], // loan terms offered in the dropdown, in months
  defaultTerm: 36, // term selected when the page loads
  termRange: { min: 6, max: 60 }, // range of the loan term slider, in months

  // --------------------------------------------------------------------------
  // Eligibility limits
  // A repayment is measured two ways:
  //   income     = its share of monthly income
  //   disposable = its share of what is left after expenses
  // Both limits must be met to earn that status.
  // --------------------------------------------------------------------------
  likely: { income: 0.35, disposable: 0.6 },
  review: { income: 0.45, disposable: 0.8 },

  // --------------------------------------------------------------------------
  // Mock API
  // --------------------------------------------------------------------------
  mockDelayMs: 700, // fake "network" delay so the loading state is visible

  // --------------------------------------------------------------------------
  // Allowed ranges for each input (used by validation.js)
  // --------------------------------------------------------------------------
  limits: {
    employer: { label: 'Employer or income source', min: 2, max: 60 }, // min/max = characters
    income: { label: 'Monthly income', min: 1, max: 10_000_000 },
    expenses: { label: 'Monthly expenses', min: 0, max: 10_000_000 },
    loan: { label: 'Loan amount', min: 1_000, max: 5_000_000 },
  },
});