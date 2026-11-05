// ==========================================================================
// mockApi.js: pretends to be a server so the app behaves like a real one.
//
// It waits a moment, then returns the result from the eligibility logic.
// To use a real backend later, replace the body of this function with a
// fetch() call and keep the rest of the app unchanged.
// ==========================================================================

import { CONFIG } from './config.js';
import { calculateEligibility } from './eligibility.js';

export function checkEligibility(input, cfg = CONFIG) {
  return new Promise((resolve) => {
    // Wait for the configured delay, then hand back the result
    setTimeout(() => {
      resolve(calculateEligibility(input, cfg));
    }, cfg.mockDelayMs);
  });
}