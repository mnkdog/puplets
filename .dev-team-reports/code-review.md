# Code Review Report

**Date:** 2026-08-13  
**Scope:** Files changed since origin/main (12 files)  
**Overall Status:** 🔴 **FAIL**

## Executive Summary

Comprehensive review of TDD/BDD testing implementation found **8 FAIL-status findings** across 16 review dimensions, including critical security vulnerabilities, concurrency issues, and accessibility blockers.

**Critical Issues:**
- **Security**: Client-side price tampering allowing £0.01 checkouts (2 error-severity)
- **Concurrency**: Non-atomic localStorage cart mutations causing data loss (2 error-severity)
- **Accessibility**: 14 errors blocking keyboard and screen reader access (WCAG 2.1 AA failures)
- **Correctness**: Price inconsistencies and broken test fixtures (2 error-severity)
- **Architecture**: Test mocks overriding production data; content layer bypassed

## Health Score

🔴 **FAIL** - Security vulnerabilities auto-escalate to red. Multiple error-severity issues across security, concurrency, accessibility, and correctness dimensions.

---

## Findings by Agent

### 🔴 security-review: FAIL (7 findings)

**Status:** FAIL  
**Issues:** 2 error, 5 warning

#### Error-Severity Issues

1. **Client-side price tampering** (src/collar.html:1096, src/charms.html:503)
   - Cart items built client-side with `price` from DOM `dataset.price`
   - Persisted to localStorage, POSTed to `/api/create-checkout-session`
   - API trusts `item.price` with no server-side validation
   - **Exploit:** Edit localStorage or POST directly → checkout for £0.01
   - **Fix:** Send only SKU/quantity; resolve prices server-side

2. **Client-side price tampering (charms)** (src/charms.html:503)
   - Same trust-boundary defect on charms page
   - Both unit price and quantity attacker-controlled
   - **Fix:** Server-side price lookup and quantity validation

#### Warning-Severity Issues

3. **XSS via unsanitized markdown** (src/about.html:358)
   - `marked.parse()` output inserted via `innerHTML` with no sanitization
   - CMS-editable content → stored XSS → localStorage cart access
   - **Fix:** Use DOMPurify or configure marked with sanitizing renderer

4. **XSS in markdown fallback** (src/about.html:381)
   - Regex-based `parseMarkdownFallback()` allows `javascript:` hrefs
   - No HTML escaping of input
   - **Fix:** HTML-escape source, allowlist link schemes

5. **Missing SRI on CDN script** (src/about.html:237)
   - marked.js loaded from jsdelivr.net with no integrity hash
   - **Fix:** Add SRI hash or vendor the library

6. **Client-side access control** (src/about.html:321)
   - Unpublished page gate enforced only after content delivered
   - `/content/about.md` publicly accessible despite `published: false`
   - **Fix:** Exclude unpublished content at build time

7. **Missing Content-Security-Policy**
   - No CSP headers for pages with innerHTML injection
   - **Fix:** Add CSP via Vercel headers or meta tag

---

### 🔴 concurrency-review: FAIL (5 findings)

**Status:** FAIL  
**Issues:** 2 error, 3 warning

#### Error-Severity Issues

1. **Non-atomic cart read-modify-write** (src/collar.html:1108)
   - Classic check-then-act race: read localStorage → modify → write
   - Concurrent tabs lose updates
   - **Fix:** Implement optimistic locking or localStorage event detection

2. **Non-atomic cart mutation (charms)** (src/charms.html:491)
   - Identical race condition on charms page
   - **Fix:** Server-side cart or versioned localStorage

#### Warning-Severity Issues

3. **Fire-and-forget async initialization** (src/charms.html:386)
   - `loadInventory()` called without await
   - Subsequent code may run before inventory loaded
   - **Fix:** Wrap in DOMContentLoaded with proper await

4. **Missing error handling** (src/collar.html:761)
   - Awaited async function with internal try/catch but no outer catch
   - **Fix:** Add explicit catch block

5. **Closure captures mutable state** (features/support/world.js:61)
   - Route handler reads `this.testInventory` at request time
   - Safe for sequential tests but brittle for parallelization

---

### 🔴 a11y-review: FAIL (22 findings)

**Status:** FAIL  
**Issues:** 14 error, 7 warning, 1 suggestion

#### Error-Severity Issues (sample - 14 total)

1. **Hamburger menu lacks accessible name** (src/about.html:242, src/charms.html:238, src/collar.html:547)
   - Buttons with no aria-label or visible text (3 instances)
   - **Fix:** Add `aria-label="Toggle navigation menu"`

2. **Close button lacks accessible name** (src/about.html:268, src/charms.html:254, src/collar.html:573)
   - `×` symbol with no accessible name (3 instances)
   - **Fix:** Add `aria-label="Close menu"`

3. **Missing focus management** (src/about.html:266, src/charms.html:252, src/collar.html:571)
   - Mobile menu lacks focus trap (3 instances)
   - **Fix:** Move focus to menu on open, return to trigger on close

4. **Extra charms not keyboard accessible** (src/charms.html:405, src/collar.html:1062)
   - Click-only interaction, no tabindex or keyboard handlers (2 instances)
   - **Fix:** Add `tabindex="0"` and Enter/Space key handlers

5. **Modal lacks focus trap** (src/charms.html:318, src/collar.html:584)
   - Focus can escape to background (2 instances)
   - **Fix:** Implement focus trap

6. **Navigation buttons lack labels** (src/collar.html:599, 601)
   - Previous/Next image buttons use symbols only
   - **Fix:** Add aria-labels

#### Warning-Severity Issues

7. **Missing aria-live for dynamic content** (4 instances)
8. **Current page not marked** (3 instances)
9. **Mixed button semantics** (src/collar.html:589)

---

### 🔴 correctness-review: FAIL (7 findings)

**Status:** FAIL  
**Issues:** 2 error, 5 warning/suggestion

#### Error-Severity Issues

1. **Price table divergence** (src/collar.html:957)
   - Three conflicting price sources in one file
   - `sizeData` hardcodes £20/£25/£30 vs. £17.99/£20.99/£23.99 elsewhere
   - Charged price depends on click order (size-first vs. color-first)
   - Measurements dropped on rebuild
   - **Fix:** Drive from single price constant

2. **Inert fixture mutation** (features/step_definitions/inventory.steps.js:49)
   - Steps mutate `testInventory` after page already loaded
   - Scenarios pass only because Background duplicates expected values
   - **Fix:** Add `page.reload()` after mutation

#### Warning-Severity Issues

3. **Option value case mismatch** (src/collar.html:975)
   - Static options: lowercase, rebuilt: uppercase
   - Size restore always fails, price goes stale
   - **Fix:** Normalize casing or emit lowercase consistently

4. **Fail-open stock guard** (src/collar.html:900)
   - Inventory fetch failure enables Add to Basket
   - **Fix:** Distinguish "not loaded" from "failed to load"

5. **Unreachable branch** (src/about.html:328)
   - Dead code after return statement

6. **Locator inconsistency** (features/step_definitions/product.steps.js:120)
   - Text-based locator fails when button text changes

7. **Unverified timeout claim** (features/support/world.js:55)
   - Comment contradicts code

---

### 🔴 domain-review: FAIL (9 findings)

**Status:** FAIL  
**Issues:** 1 error, 8 warning

#### Error-Severity Issue

1. **Pricing rule duplication** (src/collar.html:956)
   - Three conflicting price sources, none match CMS
   - Live price £20/£25/£30 differs from advertised £17.99
   - CMS catalog never fetched
   - **Fix:** Fetch catalog, make CMS single source of truth

#### Warning-Severity Issues

2. **Catalog/Inventory conflation** (src/collar.html:951)
3. **Missing availability specification** (src/collar.html:906)
4. **Dual charm definitions** (src/collar.html:712)
5. **Missing value object** (src/charms.html:433)
6. **Missing cart factory** (src/collar.html:1096)
7. **Publication policy duplication** (src/collar.html:764)
8. **Ubiquitous language drift** (src/collar.html:682)
9. **Domain data duplication** (src/content/inventory.json:14)

---

### 🔴 arch-review: FAIL (11 findings)

**Status:** FAIL  
**Issues:** 2 error, 9 warning

#### Error-Severity Issues

1. **Test double boundary violation** (features/support/world.js:71)
   - BDD suite mocks first-party deployed artifact
   - `src/content/about.md` has `published: false` in production
   - Tests assert published behavior that doesn't exist
   - **Fix:** Set `published: true` or test both paths

2. **Content layer bypass** (src/collar.html:956)
   - Three competing price sources, CMS never fetched
   - £20/£25/£30 charged vs. £17.99 advertised
   - **Fix:** Fetch product catalog, delete hardcoded prices

#### Warning-Severity Issues

3. **Prod data with test residue** (src/content/inventory.json:16)
4. **Duplicate abstraction** (src/collar.html:764) - 7 copies
5. **Test hook in production** (src/collar.html:728)
6. **Fixture duplication** (features/step_definitions/inventory.steps.js:7)
7. **Repo boundary** (.claude/metrics/boundary-events.jsonl.lock)
8. **Model inconsistency** (src/collar.html:712)
9. **Duplicate markdown renderers** (src/about.html:353)
10. **Build config ambiguity** (cucumber.js vs cucumber.cjs)
11. **Inline logic, no module layer** (src/collar.html:702)

---

### 🔴 complexity-review: FAIL (16 findings)

**Status:** FAIL  
**Issues:** 1 error, 4 warning, 11 suggestion

#### Error-Severity Issue

1. **144-line function** (src/collar.html:878)
   - `setupFormValidation` spans 144 lines with nested functions
   - **Fix:** Extract to separate functions

#### Warning-Severity Issues

2-5. Long methods (40-69 lines each)

#### Suggestion-Severity Issues

6-16. Functions 23-38 lines, data structures

---

### 🔴 test-smell-review: FAIL (8 findings)

**Status:** FAIL  
**Issues:** 2 error, 6 warning/suggestion

#### Error-Severity Issues

1-2. **Erratic Test** - Hardcoded `waitForTimeout` calls creating non-deterministic tests

#### Warning-Severity Issues

3-8. Magic values, general fixture, overspecified software, conditional test logic

---

### ⚠️ structure-review: WARN (7 findings)

1. DRY violation - `checkAboutPageVisibility` in 6+ files
2. Long method - `setupFormValidation` 144 lines
3. SRP violation - 5 responsibilities in one function
4-7. Additional long methods and file organization

---

### ⚠️ refactor-opportunity-review: WARN (10 findings)

1-2. Semantic duplication - inventory structure in 2 places
3-6. Semantic duplication - `checkAboutPageVisibility` and `checkCharmStock`
7-8. Open-coded idiom - charm name conversion 6+ times
9-10. Long method, complex step definition

---

### ⚠️ naming-review: WARN (6 findings)

1-4. Magic timeout values without named constants
5-6. Boolean variables missing is/has prefix

---

### ⚠️ test-review: WARN (9 findings)

1. Scenarios lack When steps
2-4. Hardcoded timeouts (flakiness risk)
5-6. Brittle assertions (RGB regex, index-based selection)
7-8. Debug logging, magic numbers
9. Missing negative scenarios

---

### ⚠️ spec-compliance-review: WARN (4 findings)

1-2. Scope violations - unrequested cross-page functionality
3-4. Unrelated files in changeset

---

### ⚠️ js-fp-review: WARN (8 findings)

1-4. Array and object mutations in test code
5-8. Parameter mutations, impure patterns

---

### ⚠️ performance-review: WARN (4 findings)

1-3. Fetch calls without timeout configuration
4. Inefficient loop in test code

---

### ⚠️ doc-review: WARN (1 finding)

1. Deployment documentation contradicts actual GitHub Pages strategy (files not in changeset)

---

## Actionable Issues Summary

**High Priority (Error Severity):**
- 2 security: Client-side price tampering
- 2 concurrency: Cart race conditions
- 14 accessibility: Keyboard/screen reader blockers
- 2 correctness: Price inconsistencies
- 1 domain: Pricing duplication
- 2 architecture: Test/production boundary violations
- 1 complexity: Unmaintainable 144-line function
- 2 test smells: Non-deterministic timeouts

**Medium Priority (Warning Severity):**
- 60+ warnings across all dimensions

**Total Findings:** 143 issues across 16 review dimensions

---

## Recommendations

### Immediate Actions (Before PR Merge)

1. **Security**: Move price validation server-side in `/api/create-checkout-session`
2. **Concurrency**: Implement cart versioning or localStorage event handling
3. **A11y**: Add ARIA labels to all interactive elements
4. **Correctness**: Reconcile price tables to single source
5. **Architecture**: Fix test mock boundary (set `published: true` or test both paths)

### Short-Term Improvements

6. Extract duplicate code (`checkAboutPageVisibility`, pricing logic)
7. Replace hardcoded test timeouts with condition-based waits
8. Break 144-line function into focused methods
9. Add unit test layer per WORKFLOW.md

### Long-Term Refactoring

10. Extract domain model layer (pricing, inventory, cart)
11. Create shared utility modules (reduce from 490-line inline scripts)
12. Implement proper keyboard navigation and focus management
13. Add Content Security Policy

---

## Tools Used

- Static analysis: ESLint (not configured), TypeScript (not present), Semgrep (available)
- Secret scan: No secrets detected
- Pipeline check: GitHub access not enabled
- MCP tools: None available this run

---

## Files Reviewed

**Changed files (12):**
- .claude/metrics/boundary-events.jsonl (A)
- .claude/metrics/boundary-events.jsonl.lock (A)
- .gitignore (M)
- features/about-page.feature (M)
- features/step_definitions/homepage.steps.js (M)
- features/step_definitions/inventory.steps.js (M)
- features/step_definitions/product.steps.js (M)
- features/support/world.js (M)
- src/about.html (M)
- src/charms.html (M)
- src/collar.html (M)
- src/content/inventory.json (M)

**Review completed:** 2026-08-13  
**Agents dispatched:** 16 (2 waves)  
**Review duration:** ~21 minutes
