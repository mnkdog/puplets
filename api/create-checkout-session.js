// Stripe Checkout Session API
// This serverless function creates a Stripe checkout session for the cart items

import Stripe from 'stripe';
import { calculateCollarPrice, calculateCharmPrice } from './catalog.js';
import { parseAllowedOrigins, validateOrigin, setCORSHeaders } from './security-utils.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
          throw new Error('Collar item missing required field: size');
        }

        // Calculate price server-side based on size and extra charms
        const extraCharmsCount = item.extraCharms?.length || 0;
        const price = calculateCollarPrice(item.size, extraCharmsCount);
        unitAmount = Math.round(price * 100);

        // Build product name
        productName = `Puplets Dog Collar - ${item.colorName || item.color} (${item.sizeName || item.size})`;

        // Add charm info to description
        const charmInfo = item.charm ? ` with ${item.charmName || item.charm} charm` : '';
        const extraCharmsInfo = extraCharmsCount > 0
          ? ` + ${extraCharmsCount} extra charm${extraCharmsCount > 1 ? 's' : ''}`
          : '';

        productName += charmInfo + extraCharmsInfo;
      } else if (item.type === 'charm') {
        // Validate required fields
        if (!item.charm && !item.charmName) {
          throw new Error('Charm item missing required field: charm or charmName');
        }

        // Calculate price server-side
        const quantity = item.quantity || 1;
        const price = calculateCharmPrice(quantity);
        unitAmount = Math.round(price * 100);

        productName = `Puplets Charm - ${item.charmName || item.charm}`;
        if (quantity > 1) {
          productName += ` (×${quantity})`;
        }
      } else {
        throw new Error(`Unknown item type: ${item.type}`);
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

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${validatedOrigin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${validatedOrigin}/cart.html?cancelled=true`,
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
        allowed_countries: ['GB', 'US', 'CA', 'AU', 'NZ', 'IE'],
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    // Log full error details server-side for debugging
    console.error('Stripe session creation error:', error);

    // Security: Never expose error details (stack traces, file paths, internal messages) to client
    // Full error details are logged above for server-side debugging only
    return res.status(500).json({
      error: 'Failed to create checkout session'
    });
  }
};
