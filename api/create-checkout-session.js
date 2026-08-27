// Stripe Checkout Session API
// This serverless function creates a Stripe checkout session for the cart items
//
// SECURITY TODO: Add rate limiting to prevent abuse
// Recommended: @upstash/ratelimit with Redis or Vercel Edge Config
// Example: 10 requests per 60s per IP address
// See: https://github.com/vercel/examples/tree/main/edge-middleware/api-rate-limit

import Stripe from 'stripe';
import { calculateCollarPrice, calculateCharmPrice, CATALOG } from './catalog.js';
import { parseAllowedOrigins, validateOrigin, setCORSHeaders } from './cors-utils.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Sanitize user-provided product name fields to prevent XSS
 * @param {string} value - User input (colorName, charmName, sizeName)
 * @returns {string} Sanitized string safe for display
 */
function sanitizeProductName(value) {
  if (typeof value !== 'string') return '';
  // Allow letters, numbers, spaces, hyphens only
  return value.replace(/[^a-zA-Z0-9 -]/g, '').trim().slice(0, 100);
}

export default async (req, res) => {
  // Parse allowed origins from environment variable
  let allowedOrigins;
  try {
    allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  } catch (error) {
    console.error('[SECURITY ALERT] ALLOWED_ORIGINS not configured or malformed:', error.message);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Validate request origin
  const requestOrigin = req.headers.origin;
  const { valid, origin: validatedOrigin } = validateOrigin(requestOrigin, allowedOrigins);

  if (!valid) {
    return res.status(403).json({ error: 'This request cannot be completed. Please contact support.' });
  }

  // Set CORS headers for validated origin only
  setCORSHeaders(res, validatedOrigin);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Custom error class for validation errors
  class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  }

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Convert cart items to Stripe line items
    // Prices are calculated SERVER-SIDE from the catalog - never trust client prices
    const lineItems = items.map(item => {
      let productName = '';
      let unitAmount = 0;

      if (item.type === 'collar') {
        // Validate required fields
        if (!item.size) {
          throw new ValidationError('Collar item missing required field: size');
        }

        // Calculate price server-side based on size and extra charms
        // Type-check extraCharms to prevent price manipulation via negative length
        const extraCharmsCount = Array.isArray(item.extraCharms) ? item.extraCharms.length : 0;
        const price = calculateCollarPrice(item.size, extraCharmsCount);
        unitAmount = Math.round(price * 100);

        // Security: Reject if calculated price is below catalog base (detect manipulation)
        const minPrice = Math.round(CATALOG.collar.basePrice * 100);
        if (unitAmount < minPrice) {
          throw new Error(`Invalid collar price: ${unitAmount} is below minimum ${minPrice}`);
        }

        // Build product name (sanitize user inputs to prevent XSS)
        productName = `Puplets Dog Collar - ${sanitizeProductName(item.colorName || item.color)} (${sanitizeProductName(item.sizeName || item.size)})`;

        // Add charm info to description
        const charmInfo = item.charm ? ` with ${sanitizeProductName(item.charmName || item.charm)} charm` : '';
        const extraCharmsInfo = extraCharmsCount > 0
          ? ` + ${extraCharmsCount} extra charm${extraCharmsCount > 1 ? 's' : ''}`
          : '';

        productName += charmInfo + extraCharmsInfo;
      } else if (item.type === 'charm') {
        // Validate required fields
        if (!item.charm && !item.charmName) {
          throw new ValidationError('Charm item missing required field: charm or charmName');
        }

        // Calculate price server-side
        // Type-check quantity to prevent price manipulation (matches collar guard)
        const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
        const price = calculateCharmPrice(quantity);
        unitAmount = Math.round(price * 100);

        // Security: Reject if calculated price is below catalog base (detect manipulation)
        const minPrice = Math.round(CATALOG.charm.price * 100);
        if (unitAmount < minPrice) {
          throw new Error(`Invalid charm price: ${unitAmount} is below minimum ${minPrice}`);
        }

        productName = `Puplets Charm - ${sanitizeProductName(item.charmName || item.charm)}`;
        if (quantity > 1) {
          productName += ` (×${quantity})`;
        }
      } else {
        throw new ValidationError(`Unknown item type: ${item.type}`);
      }

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: productName,
            images: ['https://puplets.vercel.app/prod-1.jpg'],
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      };
    });

    // Get base URL for redirects from server config (not client-supplied origin)
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://puplets.vercel.app';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart.html?cancelled=true`,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: {
              amount: 0, // Free shipping
              currency: 'gbp',
            },
            display_name: 'Free Shipping',
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 3,
              },
              maximum: {
                unit: 'business_day',
                value: 7,
              },
            },
          },
        },
      ],
      billing_address_collection: 'required',
      shipping_address_collection: {
        allowed_countries: ['GB'],
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    // Log full error details server-side for debugging
    console.error('Stripe session creation error:', error);

    // Validation errors return 400, all others return 500
    const statusCode = error instanceof ValidationError ? 400 : 500;

    // Security: Never expose error details (stack traces, file paths, internal messages) to client
    // Full error details are logged above for server-side debugging only
    return res.status(statusCode).json({
      error: 'Failed to create checkout session'
    });
  }
};
