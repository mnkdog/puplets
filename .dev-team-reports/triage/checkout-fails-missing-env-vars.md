---
id: checkout-fails-missing-env-vars
created: 2026-08-29T01:08:00Z
status: open
confidence: confirmed
---

# Checkout fails due to missing environment variables in vercel.json

## Problem

- **Actual behavior**: Clicking "Proceed to Checkout" shows error dialog "Sorry, there was an error processing your checkout. Please try again." Button displays "Loading..." and gets stuck. User cannot complete checkout.
- **Expected behavior**: Checkout should create a Stripe session and redirect user to Stripe payment page
- **Reproduction**: 
  1. Add item to cart at https://puplets.co.uk
  2. Navigate to cart page
  3. Click "Proceed to Checkout" button
  4. Observe: Error alert appears, button stuck on "Loading..."

## Root Cause Analysis

The checkout API is failing because required environment variables were removed from `vercel.json` when the CMS was removed.

**Commit eb52045** ("Remove CMS and simplify to config-file approach", Aug 24 2026) deleted the `env` section from `vercel.json`, which contained:
- `ALLOWED_ORIGINS` - list of allowed origins for CORS validation
- `PUBLIC_BASE_URL` - base URL for redirect URLs
- `OAUTH_REDIRECT_URI` - OAuth redirect (no longer needed, CMS removed)

**Error flow:**
1. User clicks checkout in cart.html
2. Frontend calls `fetch('/api/create-checkout-session')` (cart.html:556)
3. API tries `parseAllowedOrigins(process.env.ALLOWED_ORIGINS)` (create-checkout-session.js:30)
4. When `ALLOWED_ORIGINS` is undefined, `parseAllowedOrigins()` throws error
5. API catches error and returns HTTP 500 with `{"error": "Server configuration error"}` (create-checkout-session.js:32-34)
6. Frontend receives non-ok response, catches at line 566-567
7. Frontend shows alert: "Sorry, there was an error processing your checkout" (cart.html:577)

**Additional missing variables:**
- `STRIPE_SECRET_KEY` - Required to initialize Stripe SDK (create-checkout-session.js:13)
- `PUBLIC_BASE_URL` - Used for success/cancel redirect URLs (create-checkout-session.js:145)

The API was designed to fail-closed for security: when CORS configuration is missing, it returns 500 rather than allowing wildcard origins.

## TDD Fix Plan

1. **RED**: Write a test that verifies checkout API returns 500 when ALLOWED_ORIGINS is undefined
   **GREEN**: Restore ALLOWED_ORIGINS environment variable in vercel.json or Vercel dashboard

2. **RED**: Write a test that verifies checkout API returns 500 when STRIPE_SECRET_KEY is undefined
   **GREEN**: Set STRIPE_SECRET_KEY in Vercel dashboard (recommended for secrets) or vercel.json using Vercel secret reference (@stripe-secret-key)

3. **RED**: Write a test that verifies checkout succeeds with valid cart items and all env vars configured
   **GREEN**: Restore PUBLIC_BASE_URL environment variable

**REFACTOR**: Consider whether to store env vars in vercel.json (committed to repo, visible to team) vs Vercel dashboard (secret, per-deployment). Best practice: PUBLIC_BASE_URL and ALLOWED_ORIGINS in vercel.json (not sensitive), STRIPE_SECRET_KEY in Vercel dashboard as encrypted secret.

## Acceptance Criteria

- [x] ALLOWED_ORIGINS environment variable is configured (either in vercel.json or Vercel dashboard)
- [x] STRIPE_SECRET_KEY environment variable is configured securely (Vercel dashboard)
- [x] PUBLIC_BASE_URL environment variable is configured
- [ ] Checkout API returns valid Stripe session URL for valid requests
- [ ] Frontend successfully redirects to Stripe checkout page
- [ ] No "Server configuration error" responses from API
- [ ] Manual test: can complete checkout end-to-end on deployed site
