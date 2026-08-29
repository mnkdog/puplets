---
id: collar-addtocart-stale-editingitem-index
created: 2026-08-27T15:15:00Z
status: resolved
confidence: confirmed
---

# collar.html addToCart() corrupts cart with stale editingItem index

## Problem

- **Actual behavior**: When user edits item #3, removes item #1, then returns to collar.html and adds to basket, the cart is corrupted - either the wrong item is overwritten, or a sparse array is created that crashes cart.html with "There was an error loading your cart"
- **Expected behavior**: Adding to basket after editing should update the correct cart item, or add a new item if the edit was abandoned
- **Reproduction**: 
  1. Add 3+ collar items to cart
  2. Click "Edit" on item #3 in cart.html (stores `editingItem` with index 3)
  3. Navigate back to cart
  4. Remove item #1 (cart shrinks, but `editingItem` still has index: 3)
  5. Navigate to collar.html and click "Add to Basket"
  6. Observe: cart[3] is set when cart only has 2 items, creating sparse array [item0, item1, null, newItem]
  7. cart.html's `renderCart()` line 399 calls `cart.map(item => item.type...)` which throws on null entry

## Root Cause Analysis

The cart editing flow stores an array index in localStorage but never invalidates it when the cart changes:

- **cart.html editItem() (line 517-526)**: Stores `{item, index}` in localStorage.editingItem and navigates to collar.html
- **cart.html removeItem() (line 503-508)**: Uses `cart.splice(index, 1)` which re-indexes the array, but does NOT clear localStorage.editingItem - the stored index is now stale
- **cart.html clearCart() (line 510-515)**: Clears the cart but also does NOT clear editingItem
- **collar.html addToCart() (line 1219-1229)**: Reads editingItem and blindly overwrites `cart[index]` with the stale index

This creates two failure modes:
1. If stale index < cart.length after removal: overwrites the wrong item
2. If stale index >= cart.length after removal: `cart[3] = item` creates sparse array with null entries, which crashes cart.html's map operation

Each cart item already has a stable `id: Date.now()` field (collar.html:1204) that could be used for lookup instead of array index.

## TDD Fix Plan

1. **RED**: Write a test that simulates editing item at index 2, removing item at index 0, then adding a new item. Verify cart has correct items with no corruption (no sparse entries, no overwrites).
   **GREEN**: Change collar.html addToCart() to match cart items by id instead of index:
   ```javascript
   if (editingData) {
       const { item } = JSON.parse(editingData);
       const existingIndex = cart.findIndex(c => c.id === item.id);
       if (existingIndex >= 0) {
           cart[existingIndex] = cartItem;
       } else {
           cart.push(cartItem);  // Edit target was removed, add as new
       }
       localStorage.removeItem('editingItem');
   }
   ```

2. **RED**: Write a test that verifies editingItem is cleared when cart.removeItem() is called.
   **GREEN**: Add `localStorage.removeItem('editingItem');` to cart.html removeItem() function (after line 505).

3. **RED**: Write a test that verifies editingItem is cleared when cart.clearCart() is called.
   **GREEN**: Add `localStorage.removeItem('editingItem');` to cart.html clearCart() function (after line 512).

**REFACTOR**: Consider adding a helper `invalidateEditingItem()` to centralize this cleanup if more cart-modifying operations are added later.

## Acceptance Criteria

- [x] Root cause is addressed (id-based lookup, not index-based)
- [x] editingItem is cleared on all cart modifications (remove, clear)
- [x] All new tests pass
- [x] Existing tests still pass
- [x] No regressions introduced

## Resolution

**Fixed in PR #56** (merged 2026-08-29)

The fix implemented ID-based cart item lookup and selective editingItem clearing:

1. **collar.html addToCart()**: Changed from index-based to ID-based lookup using `cart.findIndex(c => c.id === item.id)`. If the edited item is found, it updates it; if removed, adds as new item.

2. **cart.html removeItem()**: Only clears editingItem when removing the specific item being edited (by comparing item IDs), not on any removal.

3. **cart.html clearCart()**: Always clears editingItem when clearing entire cart.

4. **BDD test coverage**: Added bug reproduction scenario in `features/shopping-cart.feature` with full step definitions.

**Files changed:**
- src/collar.html (ID-based lookup)
- src/cart.html (selective editingItem clearing)
- features/shopping-cart.feature (test scenario)
- features/step_definitions/cart.steps.js (step definitions)
