// Stripe Webhook Handler
// Processes checkout.session.completed events and captures orders in Airtable
//
// SECURITY: Stripe signature verification is mandatory
// See: https://stripe.com/docs/webhooks/signatures

import Stripe from 'stripe';
import { AirtableClient } from '../services/airtable-client.js';
import { generateCustomerConfirmation, generateShopOwnerNotification } from '../templates/email-templates.js';
import { createEmailClient } from '../services/email-client.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const airtableClient = new AirtableClient(
  process.env.AIRTABLE_API_KEY,
  process.env.AIRTABLE_BASE_ID
);
const emailClient = createEmailClient();

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

// Currency conversion constant
const CENTS_TO_POUNDS = 100;

/**
 * Format Stripe shipping address to comma-separated string
 * @param {object} shipping - Stripe shipping object
 * @returns {string} Formatted address or empty string
 */
function formatShippingAddress(shipping) {
  if (!shipping?.address) {
    return '';
  }

  const { line1, line2, city, postal_code, country } = shipping.address;
  return [line1, line2, city, postal_code, country]
    .filter(Boolean)
    .join(', ');
}

/**
 * Transform Stripe line items to simplified format
 * @param {object} lineItems - Stripe line_items object
 * @returns {Array} Simplified line items array
 */
function transformLineItems(lineItems) {
  if (!lineItems?.data) {
    return [];
  }

  return lineItems.data.map(item => ({
    description: item.description,
    quantity: item.quantity,
    price: item.price.unit_amount
  }));
}

/**
 * Extract customer email with fallback
 * @param {object} session - Stripe session object
 * @returns {string} Customer email or empty string
 */
function extractCustomerEmail(session) {
  return session.customer_email || session.customer_details?.email || '';
}

/**
 * Transform Stripe session to Airtable order format
 * @param {object} session - Stripe checkout session object
 * @param {string} orderId - Generated order ID (PUP-{last-8-chars})
 * @returns {object} Order data formatted for AirtableClient.createOrder()
 */
function transformSessionToOrder(session, orderId) {
  return {
    orderId,
    sessionId: session.id,
    customerEmail: extractCustomerEmail(session),
    customerName: session.customer_details?.name || '',
    shippingAddress: formatShippingAddress(session.shipping),
    items: transformLineItems(session.line_items),
    total: session.amount_total / CENTS_TO_POUNDS
  };
}

/**
 * Transform order data to email template format
 * @param {object} orderData - Order data from transformSessionToOrder
 * @returns {object} Email order data for generateCustomerConfirmation
 */
function transformOrderDataForEmail(orderData) {
  return {
    orderId: orderData.orderId,
    items: orderData.items,
    total: orderData.total,
    address: orderData.shippingAddress,
    customerName: orderData.customerName
  };
}

/**
 * Transform order data to shop owner email format
 * @param {object} orderData - Order data from transformSessionToOrder
 * @returns {object} Email order data for generateShopOwnerNotification
 */
function transformOrderDataForShopOwner(orderData) {
  return {
    ...transformOrderDataForEmail(orderData),
    customerEmail: orderData.customerEmail
  };
}

/**
 * Log error and return 500 response
 * @param {object} res - Express response object
 * @param {string} sessionId - Stripe session ID for correlation
 * @param {string} errorTag - Error classification tag for logging (e.g., 'IDEMPOTENCY CHECK FAILED')
 * @param {Error} error - The error object
 * @param {string} clientMessage - User-facing error message
 * @returns {object} Express response with 500 status
 */
function handleAirtableError(res, sessionId, errorTag, error, clientMessage) {
  console.error(`[${errorTag}]`, 'Session:', sessionId, 'Error:', error.message);
  return res.status(500).json({ error: clientMessage });
}

/**
 * Log non-blocking warning for operational issues that don't prevent order completion
 * @param {string} warningTag - Warning classification tag for logging (e.g., 'INVENTORY UPDATE FAILED')
 * @param {string} orderId - Order ID for correlation
 * @param {Error} error - The error object
 */
function logWarning(warningTag, orderId, error) {
  console.warn(`[${warningTag}]`, 'Order:', orderId, 'Error:', error.message);
}

/**
 * Run a non-fatal operation (logs warning on failure but doesn't throw)
 * @param {Function} operation - Async function to execute
 * @param {string} warningTag - Warning classification tag for logging
 * @param {string} orderId - Order ID for correlation
 * @returns {Promise<void>}
 */
async function runNonFatalOperation(operation, warningTag, orderId) {
  try {
    await operation();
  } catch (err) {
    logWarning(warningTag, orderId, err);
  }
}

/**
 * Generic email sending helper - logs subject and sends email
 * @param {string} recipientEmail - Recipient email address
 * @param {object} emailData - Email data with subject, html, text
 * @param {Function} sendFn - Email client send function to call
 * @param {string} logPrefix - Prefix for console log
 * @returns {Promise<void>}
 */
async function sendEmail(recipientEmail, emailData, sendFn, logPrefix) {
  console.log(logPrefix, emailData.subject);
  await sendFn(recipientEmail, emailData.subject, emailData.html, emailData.text);
}

/**
 * Send customer confirmation email
 * @param {object} orderData - Order data from transformSessionToOrder
 * @returns {Promise<void>}
 */
async function sendCustomerEmail(orderData) {
  const emailOrderData = transformOrderDataForEmail(orderData);
  const emailData = generateCustomerConfirmation(emailOrderData);

  await sendEmail(
    orderData.customerEmail,
    emailData,
    emailClient.sendCustomerConfirmation.bind(emailClient),
    'Customer confirmation email generated:'
  );
}

/**
 * Construct Airtable record link
 * @param {string} recordId - Airtable record ID
 * @returns {string} Clickable Airtable link
 */
function constructAirtableLink(recordId) {
  const baseId = process.env.AIRTABLE_BASE_ID;
  return `https://airtable.com/${baseId}/Orders/${recordId}`;
}

/**
 * Send shop owner notification email
 * @param {object} orderData - Order data from transformSessionToOrder
 * @param {string} airtableRecordId - Airtable record ID
 * @returns {Promise<void>}
 */
async function sendShopOwnerEmail(orderData, airtableRecordId) {
  const airtableLink = constructAirtableLink(airtableRecordId);
  const shopOwnerData = transformOrderDataForShopOwner(orderData);
  const emailData = generateShopOwnerNotification(shopOwnerData, airtableLink);

  await sendEmail(
    process.env.SHOP_OWNER_EMAIL,
    emailData,
    emailClient.sendShopOwnerNotification.bind(emailClient),
    'Shop owner notification email generated:'
  );
}

/**
 * Check if order already exists for given session (idempotency check)
 * @param {AirtableClient} client - Airtable client instance
 * @param {string} sessionId - Stripe session ID
 * @returns {Promise<object|null>} Existing order record or null if not found
 * @throws {Error} If Airtable query fails
 */
async function checkExistingOrder(client, sessionId) {
  try {
    return await client.findOrderBySessionId(sessionId);
  } catch (err) {
    throw new Error(`Failed to check for existing order: ${err.message}`);
  }
}

const webhookHandler = async (req, res) => {
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
    const session = event.data.object;
    const orderId = `PUP-${session.id.slice(-8)}`;

    console.log('Checkout session completed:', session.id, '→ Order ID:', orderId);

    // Check for existing order (idempotency)
    let existingOrder;
    try {
      existingOrder = await checkExistingOrder(airtableClient, session.id);
    } catch (err) {
      return handleAirtableError(res, session.id, 'IDEMPOTENCY CHECK FAILED', err, 'Failed to check for existing order');
    }

    if (existingOrder) {
      console.log('Duplicate webhook for session:', session.id, '- order already exists:', existingOrder.fields['Order ID']);
      return res.status(200).json({ received: true });
    }

    // Transform and create order in Airtable
    const orderData = transformSessionToOrder(session, orderId);

    let airtableRecord;
    try {
      airtableRecord = await airtableClient.createOrder(orderData);
    } catch (err) {
      return handleAirtableError(res, session.id, 'ORDER CREATION FAILED', err, 'Failed to create order');
    }

    // Send customer confirmation email (non-fatal)
    await runNonFatalOperation(
      () => sendCustomerEmail(orderData),
      'CUSTOMER EMAIL FAILED',
      orderId
    );

    // Send shop owner notification email (non-fatal)
    await runNonFatalOperation(
      () => sendShopOwnerEmail(orderData, airtableRecord.id),
      'SHOP OWNER EMAIL FAILED',
      orderId
    );

    // Update inventory for order items (non-fatal)
    const inventoryLineItems = session.line_items?.data?.map(item => ({
      description: item.description,
      quantity: item.quantity
    })) || [];

    await runNonFatalOperation(
      () => airtableClient.updateInventoryForOrder(inventoryLineItems, orderId),
      'INVENTORY UPDATE FAILED',
      orderId
    );
  }

  return res.status(200).json({ received: true });
};

export default webhookHandler;
export { transformSessionToOrder };
