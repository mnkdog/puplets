// Stripe Checkout Session API
// This serverless function creates a Stripe checkout session for the cart items

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// AUTHORITATIVE PRICE CATALOG - Server-side only
// Client-supplied prices are NEVER trusted
const PRICE_CATALOG = {
  collar: {
    xs: 17.99,
    s: 20.99,
    m: 23.99
  },
  charm: 3.99,
  extraCharm: 3.99
};

export default async (req, res) => {
  // CORS headers for local testing
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

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
    // SECURITY: Validate and resolve prices server-side, NEVER trust client
    const lineItems = items.map(item => {
      let productName = '';
      let unitAmount = 0;

      if (item.type === 'collar') {
        // Validate size and lookup server-side price
        const size = (item.size || '').toLowerCase();
        const validPrice = PRICE_CATALOG.collar[size];

        if (!validPrice) {
          throw new Error(`Invalid collar size: ${item.size}`);
        }

        productName = `Puplets Dog Collar - ${item.colorName || item.color} (${item.sizeName || item.size})`;
        unitAmount = Math.round(validPrice * 100); // Server-validated price only

        // Add charm info to description
        const charmInfo = item.charm ? ` with ${item.charmName || item.charm} charm` : '';
        const extraCharmsInfo = item.extraCharms && item.extraCharms.length > 0
          ? ` + ${item.extraCharms.length} extra charms`
          : '';

        productName += charmInfo + extraCharmsInfo;
      } else if (item.type === 'charm') {
        // Use server-side charm price
        productName = `Puplets Charm - ${item.charmName || item.charm}`;
        const quantity = item.quantity || 1;
        unitAmount = Math.round(PRICE_CATALOG.charm * 100); // Server price only

        return {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: productName,
              images: ['https://puplets.vercel.app/prod-1.jpg'],
            },
            unit_amount: unitAmount,
          },
          quantity: quantity, // Charms can have quantity > 1
        };
      } else {
        // Reject unknown item types (fail-secure)
        throw new Error(`Invalid item type: ${item.type}`);
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
      success_url: `${req.headers.origin || 'https://puplets.vercel.app'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'https://puplets.vercel.app'}/cart.html?cancelled=true`,
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
    console.error('Stripe session creation error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error.message
    });
  }
};
