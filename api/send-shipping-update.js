/**
 * Send shipping update notification API endpoint
 * Called by Airtable automation when shop owner marks order as shipped
 */

import { AirtableClient } from '../services/airtable-client.js';
import { EmailClient } from '../services/email-client.js';
import { generateShippingNotification } from '../templates/email-templates.js';

export default async (req, res) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract Authorization header
  const authHeader = req.headers.authorization;

  // Check if Authorization header is missing or empty
  if (!authHeader || authHeader.trim() === '') {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Check if Authorization header follows "Bearer <token>" format
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Extract token from "Bearer <token>" (do not trim - strict format check)
  const token = authHeader.slice(bearerPrefix.length);

  // Check if token is empty after "Bearer "
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Verify token matches environment variable
  if (token !== process.env.SHIPPING_UPDATE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate request body exists and is an object
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  // Validate orderId is present and is a non-empty string
  if (!req.body.orderId || typeof req.body.orderId !== 'string' || req.body.orderId.trim() === '') {
    return res.status(400).json({ error: 'Missing required field: orderId' });
  }

  // If trackingUrl is provided, validate it's a string starting with http:// or https://
  if (req.body.trackingUrl !== undefined) {
    if (typeof req.body.trackingUrl !== 'string' ||
        (!req.body.trackingUrl.startsWith('http://') && !req.body.trackingUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'Invalid trackingUrl format' });
    }
  }

  // Look up order in Airtable
  const airtableClient = new AirtableClient(
    process.env.AIRTABLE_API_KEY,
    process.env.AIRTABLE_BASE_ID
  );
  const order = await airtableClient.findOrderById(req.body.orderId);

  // Check if order exists
  if (order === null || order === undefined) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Update order status to "shipped" and persist tracking URL if provided
  const updates = { Status: 'shipped' };
  if (req.body.trackingUrl) {
    updates['Tracking URL'] = req.body.trackingUrl;
  }
  const updatedOrder = await airtableClient.updateOrder(order.fields['Order ID'], updates);

  // Check if update succeeded
  if (updatedOrder === null || updatedOrder === undefined) {
    return res.status(500).json({ error: 'Failed to update order status' });
  }

  // Send shipping notification email (with or without tracking URL)
  try {
    const emailClient = new EmailClient(process.env.RESEND_API_KEY);
    const customerEmail = order.fields['Customer Email'];
    const customerName = order.fields['Customer Name'];

    // Validate Customer Email exists before sending
    if (!customerEmail || customerEmail.trim() === '') {
      console.warn('[NO CUSTOMER EMAIL]', `Order ${req.body.orderId} has no customer email, skipping notification`);
    } else {
      const emailData = generateShippingNotification(
        {
          orderId: req.body.orderId,
          customerName
        },
        req.body.trackingUrl
      );

      await emailClient.sendShippingNotification(
        customerEmail,
        emailData.subject,
        emailData.html,
        emailData.text
      );
    }
  } catch (error) {
    console.warn('[SHIPPING EMAIL FAILED]', error.message);
  }

  return res.status(200).json({ message: 'Shipping update processed successfully' });
};
