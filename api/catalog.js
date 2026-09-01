// Product catalog - loads from products.json to ensure price consistency
// Both the storefront and checkout API use the same price source

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load products from the same JSON file the storefront uses
const productsPath = join(__dirname, '../src/config/products.json');
const productsData = JSON.parse(readFileSync(productsPath, 'utf-8'));

// Transform to the CATALOG format expected by pricing functions
export const CATALOG = {
  collar: {
    basePrice: productsData.collar.basePrice,
    sizes: productsData.collar.sizes.reduce((acc, size) => {
      acc[size.size] = size.price;
      return acc;
    }, {})
  },
  charm: {
    price: productsData.charms.price
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
