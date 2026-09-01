/**
 * Shared pricing logic for collar and charm products
 * Single source of truth for client-side price calculations
 */

// Fetch catalog data (loaded from products.json by the page)
let catalogData = null;

/**
 * Initialize the pricing module with catalog data
 * @param {object} catalog - Product catalog loaded from products.json
 */
export function initPricing(catalog) {
  catalogData = catalog;
}

/**
 * Calculate collar price including extra charms
 * @param {string} size - Collar size (xs, s, m)
 * @param {number} extraCharmsCount - Number of extra charms beyond the free one
 * @returns {number} Total price in GBP
 */
export function calculateCollarPrice(size, extraCharmsCount = 0) {
  if (!catalogData) {
    throw new Error('Pricing module not initialized - call initPricing() first');
  }

  const sizeData = catalogData.collar.sizes.find(s => s.size === size.toLowerCase());
  if (!sizeData) {
    throw new Error(`Invalid collar size: ${size}`);
  }

  const basePrice = sizeData.price;
  const charmsPrice = extraCharmsCount * catalogData.charms.price;

  return basePrice + charmsPrice;
}

/**
 * Calculate charm price
 * @param {number} quantity - Number of charms
 * @returns {number} Total price in GBP
 */
export function calculateCharmPrice(quantity = 1) {
  if (!catalogData) {
    throw new Error('Pricing module not initialized - call initPricing() first');
  }

  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }

  return catalogData.charms.price * quantity;
}

/**
 * Calculate line item total based on item type
 * @param {object} item - Cart line item
 * @returns {number} Line total in GBP
 */
export function calculateLineTotal(item) {
  if (item.type === 'collar') {
    const extraCharmsCount = Array.isArray(item.extraCharms) ? item.extraCharms.length : 0;
    return calculateCollarPrice(item.size, extraCharmsCount);
  } else if (item.type === 'charm') {
    return calculateCharmPrice(item.quantity || 1);
  }

  // Fallback for items with precomputed total or price
  if (item.total !== undefined) {
    return typeof item.total === 'number' ? item.total :
           (typeof item.total === 'object' ? item.total.amount : 0);
  }
  if (item.price !== undefined) {
    const price = typeof item.price === 'object' ? item.price.amount : item.price;
    const quantity = item.quantity || 1;
    return price * quantity;
  }

  return 0;
}

/**
 * Get charm price from catalog
 * @returns {number} Charm price in GBP
 */
export function getCharmPrice() {
  if (!catalogData) {
    throw new Error('Pricing module not initialized - call initPricing() first');
  }
  return catalogData.charms.price;
}
