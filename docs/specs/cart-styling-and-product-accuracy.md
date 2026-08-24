# Spec: Cart Styling and Product Accuracy

<!-- spec-version: 12.5.0 -->

## Intent Description

Ensure product pages display accurate, consistent information to customers:

1. **Visual consistency**: The cart success confirmation should use consistent styling across all product types (collars and charms), with green text indicating successful addition.

2. **Accurate shipping policy**: Update all product and informational pages to reflect the current UK-only shipping restriction, preventing customer confusion and failed international orders.

3. **Correct product specifications**: Fix the collar material description from "biothane" to the actual material "PVC coated nylon webbing" to ensure customers receive accurate product information for purchasing decisions and allergen/material compatibility considerations.

## Architecture Specification

**Components affected:**
- `src/collar.html` - cart modal styling, material description, shipping information
- `src/charms.html` - reference for existing cart modal styling (green confirmation)
- Product information pages - shipping policy updates
- Legal/informational pages - shipping policy consistency

**Changes:**
- CSS: Modal heading color standardization
- Content: Material specifications in product descriptions
- Content: Shipping policy text across site

**Constraints:**
- Must maintain existing modal functionality
- Must not affect other styling or layout
- Changes must be backward-compatible with existing cart functionality

## Acceptance Criteria

1. **Cart success message consistency**
   - GIVEN a customer adds a collar to cart
   - WHEN the success modal appears
   - THEN the "✓ Added to Cart!" heading text is green (#10B981 or similar success color)
   - AND the styling matches the charms page success modal

2. **Shipping policy accuracy**
   - GIVEN any product or information page
   - WHEN shipping information is displayed
   - THEN it states "UK only" or equivalent
   - AND no international shipping options are mentioned

3. **Material specification correctness**
   - GIVEN the collar product page
   - WHEN material information is displayed
   - THEN it states "PVC coated nylon webbing"
   - AND no mention of "biothane" remains

## Ambiguity Log

All gap and ambiguity findings from the Ambiguity Resolution Protocol, with their classifications and rationale.

| Decision | Classification | Resolved By | Rationale / Answer |
|----------|---------------|-------------|-------------------|
| Exact green color code for success message | `inferable` | inference | Match existing charms.html success modal color for consistency |
| Scope of shipping policy updates (which pages) | `inferable` | inference | All pages mentioning shipping (product pages, FAQ, shipping info pages) for consistency |
| Material description format/wording | `requires-stakeholder-input` | human | User specified "PVC coated nylon webbing" - exact wording provided |

## Consistency Gate

- [x] Intent is unambiguous - three specific, measurable fixes
- [x] Every behavior/goal maps to an acceptance criterion
- [x] Architecture constrains without over-engineering - CSS and content updates only
- [x] Terminology consistent across artifacts
- [x] No contradictions between artifacts
- [x] Every gap/ambiguity finding is logged - inferable with rationale or resolved by human
