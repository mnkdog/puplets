# API Security Plan - Follow-up Work

**Status**: Tracked improvements not blocking plan approval
**Plan**: plans/fix-api-security-vulnerabilities.md
**Created**: 2026-08-17

## Context

The security fix plan passed all 5 review agents after addressing critical blockers. The items below are warnings and suggestions from the review process that should be addressed but don't block implementation.

---

## High Priority

### 1. Pre-deployment API consumer discovery (Strategic review warning)

**Issue**: Plan enforces ALLOWED_ORIGINS on existing production APIs, which will cause 403 errors for any unlisted origins. No process exists to discover all current API consumers before deployment.

**Impact**: Risk of silently breaking unknown integrations when ALLOWED_ORIGINS is deployed.

**Recommendation**:
- Audit Vercel analytics/server logs to identify all origins currently calling `/api/create-checkout-session` and `/api/auth`
- Add all legitimate origins to ALLOWED_ORIGINS before deployment
- Include monitoring window post-deployment to catch 403 errors from unexpected origins
- Document expected 403 error rate and support process for missed origins
- Consider feature-flagging ALLOWED_ORIGINS enforcement to enable quick rollback

**When**: Before deploying Slice 1 to production

---

### 2. Add GitHub token exchange failure scenario (Acceptance review warning)

**Issue**: Critical error path not covered in Gherkin scenarios. What happens if GitHub's token endpoint returns 500, timeout, or invalid response after state validation succeeds?

**Missing scenario**:
```gherkin
Scenario: GitHub token exchange fails
  Given a user completed GitHub OAuth with valid state
  And the popup opener origin is allowed
  When the GitHub token endpoint returns an error or timeout
  Then the popup should display "Authentication failed. Please try again or contact support."
  And no access token should be delivered
  And the popup should close after displaying the message
```

**When**: Add to Slice 2 Gherkin before implementing Step 2.2

---

## Medium Priority

### 3. Move CSRF helpers to security-utils.js (Design review warning)

**Issue**: `generateCSRFState()` and `setSecureStateCookie()` are extracted in auth.js (Step 2.1) but kept separate from the shared security-utils.js module. This creates architectural inconsistency - origin validation helpers are shared but CSRF helpers are not.

**Recommendation**: Move both functions to security-utils.js and export them for use by auth.js. This centralizes all security primitives in one module.

**When**: During Step 2.1 implementation or as refactor after Slice 2 is green

---

### 4. Document token-in-HTML security limitation (Design review warning)

**Issue**: Access token embedded in HTML (line 48 of auth.js) creates a token leak vulnerability that postMessage validation cannot fully fix. Any attacker who can open the popup (even from disallowed origin) can view HTML source and extract the token before origin validation occurs.

**Recommendation**: Document this as a KNOWN LIMITATION:
- Current Decap CMS integration pattern requires token-in-HTML
- Cannot be fully secured with origin validation alone
- Consider alternatives in future: httpOnly cookies, temporary exchange codes, or accept the risk for Decap CMS compatibility

**When**: Add to plan's Risks section before presenting for approval, or document in ADR during implementation

---

### 5. Specify accessible HTML structure for errors (UX review warning)

**Issue**: OAuth popup error displays (Steps 2.2, 2.3) specify "render HTML showing user-friendly error" but don't specify accessible implementation details.

**Recommendation**: Specify in implementation steps:
- Use semantic HTML with proper structure: `<h1>` heading, `<p>` for message text
- Add `role="alert"` to ensure screen readers announce the error immediately
- Set `autofocus` on error message container for keyboard users
- No reliance on visual styling alone

**When**: Update Steps 2.2 and 2.3 implementation sections before /build starts

---

## Low Priority (Code Quality)

### 6. Clean up Gherkin implementation leakage (Acceptance review warnings)

**Issue**: Multiple scenarios expose implementation details instead of describing user-observable behavior:

- "ALLOWED_ORIGINS environment variable is set to" → "allowed origins are configured"
- "server logs should contain" → remove (implementation detail)
- "OAUTH_REDIRECT_URI is set to" → "OAuth service is configured with redirect URI"
- "an error should be logged" → remove (not user-visible)

**When**: Refactor Gherkin scenarios during or after implementation

---

### 7. Make test descriptions concrete (Acceptance review warnings)

**Issue**: Steps 1.4 and 2.4 have vague test descriptions: "Verify environment variable is accessible in deployed function"

**Recommendation**:
- Step 1.4: "Verify ALLOWED_ORIGINS is parsed correctly. Verify API returns 200 for origins in the list and 403 for origins not in the list."
- Step 2.4: "Verify OAUTH_REDIRECT_URI is used in GitHub authorization URL when configured. Verify fallback to production URL when not configured."

**When**: Update before /build starts

---

### 8. Document client-side testing strategy (Design review warning)

**Issue**: Testing client-side postMessage origin validation requires mocking browser APIs (window.opener, MessageEvent with .origin property), which is complex in a serverless function test environment.

**Recommendation**:
- Extract client-side validation logic into a separate testable function
- Use browser automation (Playwright/Puppeteer) for integration tests that open actual popups
- Document: unit tests cover server-side ALLOWED_ORIGINS parsing, E2E tests cover client-side origin validation

**When**: During Step 2.3 implementation

---

## Summary

**Before deployment**: Items #1-2 (consumer discovery, missing scenario)
**During implementation**: Items #3-8 (refactors, documentation, testing strategy)

All items tracked here were identified by review agents but assessed as non-blocking warnings. They represent quality improvements and risk mitigations that should be addressed but don't prevent starting implementation of the security fixes.
