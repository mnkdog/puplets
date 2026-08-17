# Fix Critical API Security Vulnerabilities

**Status**: draft
**Created**: 2026-08-17
**Gherkin persistence**: plan-file-only

## Goal

Eliminate critical security vulnerabilities in the Stripe checkout and OAuth authentication APIs that could enable CSRF attacks, token theft, and abuse.

## Context

Security audit identified multiple critical vulnerabilities in `api/create-checkout-session.js` and `api/auth.js`:

**create-checkout-session.js:**
- CORS wildcard (`Access-Control-Allow-Origin: *`) allows requests from any origin, enabling CSRF attacks
- Error messages leak sensitive system details to attackers
- Trusts user-supplied `req.headers.origin` for redirect URLs, enabling open redirect vulnerabilities
- No rate limiting allows brute force and abuse

**auth.js:**
- `postMessage` with wildcard origin (`"*"`) sends OAuth tokens to ANY origin (CRITICAL)
- Access token embedded directly in HTML visible in browser history/cache
- No CSRF protection (missing OAuth state parameter)
- Hardcoded redirect URL prevents deployment flexibility
- No origin validation accepts OAuth callbacks from malicious sources

These vulnerabilities pose immediate risk: an attacker could steal user OAuth tokens, execute CSRF attacks against the checkout flow, or abuse the API through automated requests.

## Acceptance Criteria

- [ ] Checkout API accepts requests only from configured allowed origins (no wildcard CORS) - verified by making request from unlisted origin and receiving 403
- [ ] OAuth flow includes CSRF protection via state parameter that is validated on callback
- [ ] OAuth callback with invalid or missing state parameter returns 403 and does not request access token from GitHub
- [ ] postMessage delivers tokens only to the verified opener origin, never wildcard - verified by origin validation before message send
- [ ] Access tokens are never embedded in HTML or visible in browser history
- [ ] Error responses do not leak sensitive system information (stack traces, internal paths, library versions) - verified by triggering errors and inspecting response bodies
- [ ] Redirect URLs are validated against an allowlist before use - verified by attempting to set success_url to unlisted origin
- [ ] OAuth redirect URL is configurable via environment variable
- [ ] Authenticated users can complete checkout from allowed origins with valid cart items and receive a Stripe session URL
- [ ] Users can authenticate via GitHub OAuth from allowed origins and receive an access token via postMessage
- [ ] Vercel deployment configuration includes ALLOWED_ORIGINS (comma-separated) and OAUTH_REDIRECT_URI environment variables with documented examples
- [ ] All preview and staging environments are listed in initial ALLOWED_ORIGINS before deployment
- [ ] OAuth popup origin validation failure displays error message to user: "Authentication failed due to a security policy. Please try again or contact support."
- [ ] Requests from disallowed origins receive user-friendly error: "This request cannot be completed. Please contact support." (not technical "origin not allowed")

## Approach Stances

**Scope enforcement**: No scope freeze - changes are isolated to API security, no risk of scope creep.

**Replace vs. Merge** (`knowledge/decision-defaults.md`): **Replace** the insecure patterns with secure implementations. The existing CORS wildcard, postMessage wildcard, and unvalidated origins are fundamentally insecure and cannot be "merged" - they must be replaced entirely with secure alternatives.

**Integration** (`knowledge/decision-defaults.md`): **Auto-merge via PR** (default). Changes are security fixes with comprehensive tests; auto-merge on green CI is appropriate.

## Slices

### Slice 1: Fix CORS and origin validation in checkout API

**Depends-on:** none
**Files:** `api/create-checkout-session.js`, `vercel.json`

**Gherkin**:
```gherkin
Feature: Secure Checkout API CORS and Origin Validation

  Background:
    Given the checkout API is deployed
    And the allowed origins are configured as "https://puplets.vercel.app"

  Scenario: Checkout request from allowed origin succeeds
    Given I am making a request from "https://puplets.vercel.app"
    When I POST valid cart items to "/api/create-checkout-session"
    Then the response status should be 200
    And the response should include a Stripe session ID
    And the CORS header "Access-Control-Allow-Origin" should be "https://puplets.vercel.app"

  Scenario: Checkout request from disallowed origin is rejected
    Given I am making a request from "https://evil-site.com"
    When I POST valid cart items to "/api/create-checkout-session"
    Then the response status should be 403
    And the response body should contain "Origin not allowed"
    And the CORS header "Access-Control-Allow-Origin" should not be present

  Scenario: Checkout request with no Origin header is rejected
    Given I am making a request with no Origin header
    When I POST valid cart items to "/api/create-checkout-session"
    Then the response status should be 403
    And the response body should contain "Origin required"

  Scenario: Success URL must match validated origin
    Given the allowed origins are configured as "https://puplets.vercel.app"
    And I am making a request from "https://puplets.vercel.app"
    When I POST valid cart items with success_url "https://evil-site.com/success"
    Then the response status should be 200
    And the Stripe session success_url should be "https://puplets.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}"
    And the Stripe session success_url should not contain "evil-site.com"

  Scenario: Error responses do not leak system details
    Given I am making a request from "https://puplets.vercel.app"
    And the Stripe API is unavailable (mocked to return 500)
    When I POST valid cart items to "/api/create-checkout-session"
    Then the response status should be 500
    And the response body should not contain stack traces
    And the response body should not contain file paths
    And the response body should not contain "node_modules"
    And the response body should contain "Failed to create checkout session"
    And the server logs should contain the full error details for debugging

  Scenario: Multiple allowed origins are supported
    Given the allowed origins are configured as "https://puplets.vercel.app,https://puplets-staging.vercel.app"
    When I make requests from both origins
    Then both requests should succeed with status 200
```

#### Step 1.1: Add origin allowlist validation to checkout API

**Complexity:** standard
**IMPLEMENT:** Read `ALLOWED_ORIGINS` from environment variable (comma-separated list, default to production domain). Add `validateOrigin(origin, allowedOrigins)` function that checks origin against allowlist. At request entry (line 10), extract `req.headers.origin`, validate it, and reject with 403 "Origin not allowed" if not in allowlist. Replace wildcard CORS (line 12) with conditional: set `Access-Control-Allow-Origin` to the validated origin only when it passes. Remove all other CORS headers except for validated origins.
**TEST:** Mock requests from allowed and disallowed origins. Verify 200 response + correct CORS header for allowed. Verify 403 rejection for disallowed. Verify 403 for missing origin header.
**REFACTOR:** Extract CORS header setting to `setCORSHeaders(res, validatedOrigin)` helper function for reuse.
**Files:** `api/create-checkout-session.js`

#### Step 1.2: Validate redirect URLs against allowed origins

**Complexity:** standard
**IMPLEMENT:** In session creation (line 92-124), replace `req.headers.origin || 'https://puplets.vercel.app'` with the validated origin from step 1.1. If origin validation failed earlier, this code never runs (403 response already sent). Remove the || fallback - we always have a validated origin at this point.
**TEST:** Verify success_url and cancel_url use the validated origin. Verify no open redirect when origin header is spoofed.
**REFACTOR:** None expected
**Files:** `api/create-checkout-session.js`

#### Step 1.3: Remove sensitive error details from responses

**Complexity:** simple
**IMPLEMENT:** In catch block (line 131-137), remove `details: error.message` from response. Replace with generic message "Failed to create checkout session". Keep `console.error` for server-side logging but never send error details to client. Add comment explaining this is intentional information hiding for security.
**TEST:** Trigger various error conditions (invalid Stripe key, malformed items, network errors). Verify response body never contains stack traces, file paths, or error.message. Verify server logs still contain full error details.
**REFACTOR:** None expected
**Files:** `api/create-checkout-session.js`

#### Step 1.4: Add ALLOWED_ORIGINS environment variable to deployment config

**Complexity:** simple
**IMPLEMENT:** Add `ALLOWED_ORIGINS` to `vercel.json` environment variables with production domains. Document the expected format (comma-separated, no spaces). Add example comment showing staging/production setup.
**TEST:** Verify environment variable is accessible in deployed function. Verify default fallback works when not set.
**REFACTOR:** None expected
**Files:** `vercel.json`

### Slice 2: Fix OAuth security vulnerabilities in auth.js

**Depends-on:** 1
**Files:** `api/auth.js`, `vercel.json`

**Gherkin**:
```gherkin
Feature: Secure OAuth Authentication Flow

  Background:
    Given the OAuth client ID and secret are configured
    And the allowed origins are configured

  Scenario: OAuth flow includes CSRF protection
    Given a user initiates OAuth authentication
    When the redirect to GitHub is generated
    Then the URL should include a "state" parameter
    And the state should be a cryptographically random value
    And the state should be stored in a secure HTTP-only cookie

  Scenario: OAuth callback validates CSRF state
    Given a user completed GitHub OAuth
    And the original state was "abc123secure"
    When GitHub redirects back with code and state "abc123secure"
    Then the state cookie should be validated against the callback state
    And the authentication should proceed
    And the state cookie should be cleared

  Scenario: OAuth callback with mismatched state is rejected
    Given a user completed GitHub OAuth
    And the original state was "abc123secure"
    When GitHub redirects back with code and state "xyz456different"
    Then the response status should be 403
    And the response should contain "Invalid state parameter"
    And no access token should be requested from GitHub

  Scenario: OAuth callback with missing state is rejected
    Given a user completed GitHub OAuth
    When GitHub redirects back with code but no state parameter
    Then the response status should be 400
    And the response should contain "State parameter required"

  Scenario: Access token is delivered securely via postMessage
    Given a user completed OAuth successfully
    And the popup window opener is "https://puplets.vercel.app"
    When the token response is generated
    Then postMessage should target the opener's specific origin
    And postMessage should never use wildcard "*"
    And the token should not be embedded in HTML

  Scenario: postMessage rejects mismatched popup origin
    Given a user completed OAuth successfully
    And the popup window opener is "https://evil-site.com"
    And the allowed origin is "https://puplets.vercel.app"
    When the token response is generated
    Then the popup should be closed without sending token
    And an error should be logged

  Scenario: Redirect URL is configurable via environment
    Given OAUTH_REDIRECT_URI is set to "https://staging.puplets.app/api/auth"
    When a user initiates OAuth authentication
    Then the GitHub authorization URL should use the configured redirect URI

  Scenario: Redirect URL falls back to production when not configured
    Given OAUTH_REDIRECT_URI is not set
    When a user initiates OAuth authentication
    Then the GitHub authorization URL should use "https://puplets.vercel.app/api/auth"
```

#### Step 2.1: Add CSRF state parameter to OAuth initiation

**Complexity:** standard
**IMPLEMENT:** Generate cryptographically random state on OAuth start (line 5-12). Use `crypto.randomBytes(32).toString('hex')`. Set secure HTTP-only cookie `oauth_state` with the state value (SameSite=Lax, secure flag, 5 minute expiry). Append `&state=${state}` to GitHub auth URL (line 10). Make redirect URI configurable: `const redirectUri = process.env.OAUTH_REDIRECT_URI || 'https://puplets.vercel.app/api/auth';`
**TEST:** Verify state is generated on each OAuth initiation. Verify state is cryptographically random (different every time). Verify cookie is set with secure flags. Verify state appears in GitHub redirect URL.
**REFACTOR:** Extract state generation to `generateCSRFState()` helper. Extract cookie setting to `setSecureStateCookie(res, state)` helper.
**Files:** `api/auth.js`

#### Step 2.2: Validate CSRF state on OAuth callback

**Complexity:** standard
**IMPLEMENT:** On callback (line 15), extract state from query params. Extract state from cookie. Compare them. If missing or mismatched, return 403 "Invalid state parameter" before calling GitHub token endpoint. Clear state cookie after successful validation (set with expired date). Only proceed to step 16 after successful state validation.
**TEST:** Verify callback with matching state proceeds. Verify callback with mismatched state returns 403. Verify callback with missing state returns 400. Verify state cookie is cleared after successful validation. Verify no token request is made to GitHub when state validation fails.
**REFACTOR:** Extract validation to `validateCSRFState(req, res) -> boolean` helper.
**Files:** `api/auth.js`

#### Step 2.3: Replace postMessage wildcard with validated origin

**Complexity:** standard
**IMPLEMENT:** Determine the popup opener's origin at callback time. Compare against `ALLOWED_ORIGINS` from environment (same allowlist as Slice 1). If opener origin is not in allowlist, close the window with error message and log warning (do NOT send token). Replace wildcard postMessage (line 56) with validated origin: `window.opener.postMessage("authorizing:github", validatedOrigin)`. Do the same for the token-sending postMessage (line 46-52).
**TEST:** Verify postMessage uses specific origin when opener matches allowlist. Verify window closes with error when opener is not in allowlist. Verify token is never sent to disallowed origins.
**REFACTOR:** Extract origin validation to `validatePopupOrigin(req) -> {valid: boolean, origin: string}` helper.
**Files:** `api/auth.js`

#### Step 2.4: Validate popup origin before postMessage (keep current protocol)

**Complexity:** standard
**IMPLEMENT:** Keep current postMessage protocol (Decap CMS compatible) but validate opener origin first. At token delivery time (line 46-52), determine popup opener's origin from request headers. Compare against `ALLOWED_ORIGINS`. If opener origin is not in allowlist, respond with HTML showing user-friendly error: "Authentication failed due to a security policy. Please try again or contact support." and do NOT send postMessage. If origin is valid, replace wildcard in both postMessage calls (lines 46-52, 56) with the validated origin. Token remains in response HTML for current protocol compatibility but is only sent via postMessage to validated origins.
**TEST:** Verify postMessage uses specific validated origin, never wildcard. Verify popup from disallowed origin shows error message and does not send token. Verify popup from allowed origin completes successfully with token via postMessage to that specific origin. Verify Decap CMS integration still works (no protocol changes).
**REFACTOR:** Extract origin validation to `validatePopupOrigin(req, allowedOrigins) -> {valid: boolean, origin: string, error?: string}` helper.
**Files:** `api/auth.js`

#### Step 2.5: Add OAuth environment variables to deployment config

**Complexity:** simple
**IMPLEMENT:** Add `OAUTH_REDIRECT_URI` to `vercel.json` environment variables. Document the format and staging/production examples. Verify `ALLOWED_ORIGINS` from Slice 1 applies here too (no duplication needed).
**TEST:** Verify environment variable is accessible in deployed function. Verify default fallback to production domain works.
**REFACTOR:** None expected
**Files:** `vercel.json`


## Parallelization

```mermaid
graph TD
    Slice1[Slice 1: Fix CORS & origin validation]
    Slice2[Slice 2: Fix OAuth security]
    
    Slice1 -.-> Slice2
    
    style Slice1 fill:#e1f5ff
    style Slice2 fill:#e1f5ff
```

| Wave | Slices | Rationale |
|------|--------|-----------|
| 1 | Slice 1 | Fix CORS and origin validation in checkout API first |
| 2 | Slice 2 | OAuth fixes after CORS infrastructure is established |

**Why this structure**: Slice 1 establishes the origin allowlist infrastructure (ALLOWED_ORIGINS env var) that Slice 2 reuses for OAuth origin validation. Both modify `vercel.json`, so they must run sequentially. This 2-slice plan focuses on the CRITICAL vulnerabilities (CSRF, token theft, CORS wildcard, information leakage). Rate limiting (abuse prevention, not a vulnerability enabling data theft) is deferred to a follow-up plan.

## Pre-PR Gate

Before opening a pull request:
- [ ] All Gherkin scenarios pass (11 scenarios across 3 slices)
- [ ] Manual verification: Checkout flow works from production domain
- [ ] Manual verification: OAuth flow works with CSRF protection
- [ ] Manual verification: postMessage delivers token securely
- [ ] Manual verification: Rate limiting triggers at 11th request
- [ ] No console errors in browser or server logs
- [ ] Vercel deployment includes all new environment variables
- [ ] Security audit: Verify no wildcard CORS, no wildcard postMessage, no error detail leakage

## Skipped (low value)

None - all identified security vulnerabilities are high/critical severity and must be fixed.

## Risks & Open Questions

**No specification artifacts found** - Continuing with plan based on security audit findings. This is acceptable for security fixes where the vulnerabilities are objectively identified.

**Rate limiting implementation** - Using Upstash Redis for rate limiting requires additional Vercel integration setup and environment variables. If Upstash is not desired, alternative in-memory rate limiting can be used (though less reliable across serverless invocations).

**OAuth token delivery timing** - The secure postMessage delivery in Step 2.4 changes the token handoff timing. CMS integration may need to handle the async postMessage pattern. Current inline script executes immediately; new pattern waits for "ready" message from opener.

**ALLOWED_ORIGINS maintenance** - Adding staging/preview environments requires updating the allowlist. Document this in deployment guide so it's not forgotten when new environments are added.

**Backward compatibility** - These are breaking changes for any non-production domains currently using the APIs. All environments must be added to ALLOWED_ORIGINS or they will be blocked.

## Build Progress

**Gherkin persistence**: plan-file-only

### Wave 1
- [ ] Slice 1: Fix CORS and origin validation in checkout API
  - [ ] Step 1.1: Add origin allowlist validation to checkout API
  - [ ] Step 1.2: Validate redirect URLs against allowed origins
  - [ ] Step 1.3: Remove sensitive error details from responses
  - [ ] Step 1.4: Add ALLOWED_ORIGINS environment variable to deployment config

### Wave 2
- [ ] Slice 2: Fix OAuth security vulnerabilities in auth.js
  - [ ] Step 2.1: Add CSRF state parameter to OAuth initiation
  - [ ] Step 2.2: Validate CSRF state on OAuth callback
  - [ ] Step 2.3: Replace postMessage wildcard with validated origin
  - [ ] Step 2.4: Remove token from HTML, deliver via secure postMessage only
  - [ ] Step 2.5: Add OAuth environment variables to deployment config
- [ ] Slice 3: Add rate limiting to checkout endpoint
  - [ ] Step 3.1: Add rate limiting middleware to checkout endpoint
