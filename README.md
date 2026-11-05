# Loan Eligibility Simulator

![CI](https://github.com/SiyethembaMbatha/loan-eligibility-simulator/actions/workflows/ci.yml/badge.svg)

A responsive web app where customers enter their **monthly income**, **monthly expenses** and **desired loan amount** to see an estimated eligibility result. All results are **mocked, illustrative estimates**, not a financial offer.

<!-- Add a screenshot here: ![Screenshot](docs/screenshot.png) -->

## Features
- Mobile-first layout: stacked on phones, side by side on desktop
- Inline validation with clear messages (required, numbers only, no negatives, sensible limits)
- Status result (Likely eligible, Needs review, Unlikely), monthly repayment, total interest, estimated maximum loan and a principal vs interest donut chart
- Loading, empty and error states
- Accessible: labelled inputs, `aria-live` results, keyboard friendly, visible focus, reduced-motion and dark-mode support
- Amounts formatted in ZAR with `Intl.NumberFormat`
- Zero dependencies and no build step

## Run with Docker
```bash
docker build -t loan-simulator .
docker run -p 8080:80 loan-simulator
```
Open http://localhost:8080

## Run without Docker
Browsers block ES modules on `file://`, so serve the folder instead:
```bash
npm start            # uses npx serve
# or
python3 -m http.server 8080
```

## Tests
```bash
npm test             # Node 18+, nothing to install
```
GitHub Actions runs the tests and a Docker build on every push.

## How eligibility is calculated
Assumptions live in `js/config.js`: 22% p.a. interest, terms of 6 to 60 months.

1. Monthly repayment uses the standard amortisation formula.
2. Two ratios are checked: repayment ÷ income, and repayment ÷ disposable income (income minus expenses).

| Result | Repayment ÷ income | Repayment ÷ disposable income |
|---|---|---|
| Likely eligible | up to 35% | up to 60% |
| Needs review | up to 45% | up to 80% |
| Unlikely | above that, or no disposable income | |

3. The estimated maximum loan is the loan that a repayment at the "likely" limits could support.

## Project structure
```
index.html          page markup
css/styles.css      responsive styling, donut chart
js/config.js        assumptions and limits
js/eligibility.js   pure calculation logic
js/validation.js    input parsing and validation
js/format.js        currency and percent helpers
js/mockApi.js       fake async API (adds a short delay)
js/app.js           connects the form to the logic
tests/              unit tests (node:test)
Dockerfile, nginx.conf   container serving the static files
```

## Design decisions
- **Pure logic, separate from the UI:** `eligibility.js` has no DOM code, so it is easy to test and to replace with a real API.
- **No build step:** the code is already browser-ready, so there is nothing to compile.
- **nginx with security headers** and a health check for the container.

## Possible improvements
Real API integration, multiple currencies, a term slider, saving results as PDF.
