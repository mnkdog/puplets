// Stripe Webhook Handler
// Processes checkout.session.completed events and captures orders in Airtable
//
// SECURITY: Stripe signature verification is mandatory
// See: https://stripe.com/docs/webhooks/signatures

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Verify Stripe webhook signature
 * @param {string} payload - Raw request body as string
 * @param {string} signature - Stripe-Signature header value
 * @param {string} secret - STRIPE_WEBHOOK_SECRET environment variable
 * @returns {object} Parsed event object
 * @throws {Error} If signature is invalid
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  if (!signature) {
    throw new Error('Missing Stripe signature header');
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Get raw body as string - Vercel provides this as req.body when content-type is application/json
    const payload = JSON.stringify(req.body);

    event = verifyWebhookSignature(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[WEBHOOK AUTH FAILURE]', err.message);
    return res.status(401).json({ error: 'Webhook signature verification failed' });
  }

  // Only process checkout.session.completed events for now
  if (event.type === 'checkout.session.completed') {
    // TODO: Process order in next step
    console.log('Checkout session completed:', event.data.object.id);
  }

  return res.status(200).json({ received: true });
};
