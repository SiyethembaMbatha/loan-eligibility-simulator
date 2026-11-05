// ==========================================================================
// app.js: connects the form on the page to the eligibility logic.
// It reads the inputs, validates them, shows the result, and handles the
// loading, error, slider and reset states.
// ==========================================================================

import { CONFIG } from './config.js';
import {
  FIELDS,
  parseAmount,
  validateField,
  validateAll,
} from './validation.js';
import { calculateEligibility } from './eligibility.js';
import { formatCurrency as money, formatPercent } from './format.js';
import { checkEligibility } from './mockApi.js';

// --------------------------------------------------------------------------
// 1. Page elements and constants
// --------------------------------------------------------------------------

// Shortcut: $('income') finds the element with id="income"
const $ = (id) => document.getElementById(id);

const form = $('loan-form');
const results = $('results');
const submit = $('submit');

// Remember the original "empty" message so the Clear button can restore it
const EMPTY_STATE = results.innerHTML;

// Headline text shown in the coloured banner for each result
const TITLES = {
  likely: 'Likely eligible',
  review: 'Needs review',
  unlikely: 'Unlikely',
};

// The figures behind the results on screen. The slider changes the term in
// here and recalculates, without asking the user to press Calculate again.
let currentInput = null;

// --------------------------------------------------------------------------
// 2. Page setup (runs once when the page loads)
// --------------------------------------------------------------------------

// Fill the loan term dropdown from the list in config.js
CONFIG.terms.forEach((months) => {
  const label = `${months} months`;
  const isDefault = months === CONFIG.defaultTerm;
  $('term').add(new Option(label, months, false, isDefault));
});

// Show the interest rate assumption under the form, e.g. "22.0%"
$('rate').textContent = `${(CONFIG.annualRate * 100).toFixed(1)}%`;

// --------------------------------------------------------------------------
// 3. Showing and clearing validation errors
// --------------------------------------------------------------------------

// Puts a message under a field (or clears it when the message is empty).
// aria-invalid tells screen readers, and the CSS, that the field has an error.
function showError(name, message) {
  $(`${name}-error`).textContent = message;
  $(name).setAttribute('aria-invalid', message ? 'true' : 'false');
}

FIELDS.forEach((name) => {
  const input = $(name);

  // Check a field when the user leaves it
  input.addEventListener('blur', () => {
    showError(name, validateField(name, input.value));
  });

  // If the field already shows an error, re-check as the user types
  // so the message disappears as soon as the value is fixed
  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      showError(name, validateField(name, input.value));
    }
  });
});

// --------------------------------------------------------------------------
// 4. Writing the plain-language explanation
// --------------------------------------------------------------------------

function explain(result) {
  const share = formatPercent(result.incomeShare);

  // No money left over after expenses
  if (result.disposable <= 0) {
    return 'Your expenses are equal to or higher than your income, so a new repayment is not affordable right now.';
  }

  if (result.status === 'likely') {
    return `This loan looks affordable. The repayment would use ${share} of your monthly income.`;
  }

  // For "review" and "unlikely", suggest a more realistic amount if there is one
  const hint =
    result.maxLoan > 0
      ? `Based on your figures, a loan of up to ${money(result.maxLoan)} is more realistic.`
      : 'Reducing your expenses would improve your chances.';

  if (result.status === 'review') {
    return `This is borderline. The repayment would use ${share} of your income. ${hint}`;
  }

  return `This repayment is too high for your income and expenses. ${hint}`;
}

// --------------------------------------------------------------------------
// 5. Drawing the results on the page
// --------------------------------------------------------------------------

// Draws the part of the results that changes when the term changes:
// the banner, explanation, figures and donut chart.
function drawSummary(result) {
  // Share of the total repayment that is the original loan (the rest is interest)
  const principalPct = Math.round((currentInput.loan / result.totalRepayable) * 100);
  const interestPct = 100 - principalPct;

  $('summary').innerHTML = `
    <div class="banner ${result.status}">
      <span>${TITLES[result.status]}</span>
      <strong>${money(result.repayment, 2)}<small> / month</small></strong>
    </div>

    <p class="explain">${explain(result)}</p>

    <dl class="rows">
      <div>
        <dt>Income source</dt>
        <dd class="employer"></dd>
      </div>
      <div>
        <dt>Loan amount</dt>
        <dd>${money(currentInput.loan)}</dd>
      </div>
      <div>
        <dt>Total cost of credit</dt>
        <dd>${money(result.totalRepayable, 2)}</dd>
      </div>
      <div>
        <dt>Total interest</dt>
        <dd>${money(result.totalInterest, 2)}</dd>
      </div>
      <div>
        <dt>Estimated maximum loan</dt>
        <dd>${money(result.maxLoan)}</dd>
      </div>
    </dl>

    <div class="chart">
      <div
        class="donut"
        role="img"
        aria-label="${principalPct}% of repayments is loan amount, ${interestPct}% is interest"
      ></div>
      <ul class="legend">
        <li><i class="dot principal"></i>Loan amount ${principalPct}%</li>
        <li><i class="dot interest"></i>Interest ${interestPct}%</li>
      </ul>
    </div>
  `;

  // The employer is typed by the user, so it is added as plain text
  // (never as HTML) to keep the page safe
  $('summary').querySelector('.employer').textContent = currentInput.employer;

  // Tell the CSS how much of the donut should be blue
  $('summary').querySelector('.donut').style.setProperty('--p', principalPct);
}

// Runs every time the slider moves: update the term and redraw the figures
function onSlide(event) {
  const months = Number(event.target.value);

  currentInput = { ...currentInput, termMonths: months };

  $('term-value').textContent = `${months} months`;
  event.target.setAttribute('aria-valuetext', `${months} months`);

  drawSummary(calculateEligibility(currentInput));
}

// Draws the whole results area: the slider first, then the summary below it
function render(result, input) {
  currentInput = input;
  const { min, max } = CONFIG.termRange;

  results.innerHTML = `
    <div class="results-body">
      <div class="term">
        <label for="term-slider">
          Loan term: <strong id="term-value">${input.termMonths} months</strong>
        </label>
        <input
          type="range"
          id="term-slider"
          min="${min}"
          max="${max}"
          step="1"
          value="${input.termMonths}"
          aria-valuetext="${input.termMonths} months"
        >
        <div class="scale">
          <span>${min} months</span>
          <span>${max} months</span>
        </div>
      </div>

      <div id="summary" aria-live="off"></div>
    </div>
  `;

  drawSummary(result);
  $('term-slider').addEventListener('input', onSlide);

  // On phones the results sit below the form, so scroll down to show them
  if (window.matchMedia('(max-width: 799px)').matches) {
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// --------------------------------------------------------------------------
// 6. Loading state
// --------------------------------------------------------------------------

function setLoading(isLoading) {
  // Stop double-clicks while the calculation is running
  submit.disabled = isLoading;
  submit.textContent = isLoading ? 'Calculating…' : 'Calculate';

  // Lets screen readers know the results area is updating
  results.setAttribute('aria-busy', isLoading);

  if (isLoading) {
    results.innerHTML = '<p class="state">Crunching the numbers…</p>';
  }
}

// --------------------------------------------------------------------------
// 7. Submitting the form (the Calculate button)
// --------------------------------------------------------------------------

form.addEventListener('submit', async (event) => {
  // Stop the browser from reloading the page
  event.preventDefault();

  // Collect the raw text from each input
  const raw = Object.fromEntries(FIELDS.map((name) => [name, $(name).value]));

  // Validate everything and show any errors
  const errors = validateAll(raw);
  FIELDS.forEach((name) => showError(name, errors[name] || ''));

  // If something is wrong, put the cursor in the first problem field and stop
  const firstInvalid = FIELDS.find((name) => errors[name]);
  if (firstInvalid) {
    return $(firstInvalid).focus();
  }

  // Convert the text into numbers
  const input = {
    employer: raw.employer.trim(),
    income: parseAmount(raw.income),
    expenses: parseAmount(raw.expenses),
    loan: parseAmount(raw.loan),
    termMonths: Number($('term').value),
  };

  setLoading(true);

  try {
    // Ask the (mocked) API for the result, then show it
    const result = await checkEligibility(input);
    render(result, input);
  } catch {
    results.innerHTML =
      '<p class="state">Something went wrong while calculating. Please try again.</p>';
  } finally {
    // Always re-enable the button, whether it worked or not
    setLoading(false);
  }
});

// --------------------------------------------------------------------------
// 8. Clearing the form (the Clear button)
// --------------------------------------------------------------------------

form.addEventListener('reset', () => {
  FIELDS.forEach((name) => showError(name, ''));
  results.innerHTML = EMPTY_STATE;
  currentInput = null;
});