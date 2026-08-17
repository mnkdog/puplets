// Product catalog - single source of truth for pricing
// This file is the authoritative price source for the checkout API

export const CATALOG = {
  collar: {
    basePrice: 17.99,
    sizes: {
      xs: 17.99,
      s: 17.99,
      m: 20.99
    }
  },
  charm: {
    price: 3.99
  }
};

/**
 * Calculate the price for a collar item
 * @param {string} size - Collar size (xs, s, m)
 * @param {number} extraCharmsCount - Number of extra charms (beyond the free one)
 * @returns {number} Total price in GBP
 */
export function calculateCollarPrice(size, extraCharmsCount = 0) {
  const normalizedSize = (size || 's').toLowerCase();

  if (!CATALOG.collar.sizes[normalizedSize]) {
    throw new Error(`Invalid collar size: ${size}`);
  }

  const basePrice = CATALOG.collar.sizes[normalizedSize];
  const charmsPrice = extraCharmsCount * CATALOG.charm.price;

  return basePrice + charmsPrice;
}

/**
 * Calculate the price for charm items
 * @param {number} quantity - Number of charms
 * @returns {number} Total price in GBP
 */
export function calculateCharmPrice(quantity = 1) {
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  return CATALOG.charm.price * quantity;
}
