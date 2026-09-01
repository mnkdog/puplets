/**
 * Email template generation utilities
 * All functions return { subject, html, text } for Resend API
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  const str = String(text);
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return str.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Format greeting with proper fallback
 * @param {string} customerName - Customer name or empty string
 * @returns {string} Formatted greeting
 */
function formatGreeting(customerName) {
  return customerName && customerName.trim() ? `Hi ${customerName.trim()}` : 'Hi';
}

/**
 * Format order items as HTML list
 * @param {Array} items - Array of items with description and quantity
 * @returns {string} HTML list items
 */
function formatItemsHtml(items) {
  return items
    .map(item => `<li style="margin-bottom: 10px;">${escapeHtml(item.description)} x ${item.quantity}</li>`)
    .join('\n    ');
}

/**
 * Format order items as plain text list
 * @param {Array} items - Array of items with description and quantity
 * @returns {string} Plain text list items
 */
function formatItemsText(items) {
  return items
    .map(item => `- ${item.description} x ${item.quantity}`)
    .join('\n');
}

/**
 * Format total amount as currency
 * @param {number} total - Total amount in pence
 * @returns {string} Formatted currency string (e.g., "£12.99")
 */
function formatTotal(total) {
  const pounds = (total / 100).toFixed(2);
  return `£${pounds}`;
}

/**
 * Generate email signature HTML
 * @returns {string} HTML signature
 */
function generateSignatureHtml() {
  return `
  <p style="margin-top: 40px; color: #777; font-size: 14px;">
    Thanks,<br>
    The Puplets Team
  </p>`;
}

/**
 * Generate email signature plain text
 * @returns {string} Plain text signature
 */
function generateSignatureText() {
  return `
---
Thanks,
The Puplets Team`;
}

/**
 * Generate customer order confirmation email
 * @param {Object} orderData - Order details
 * @param {string} orderData.orderId - Order ID (e.g., PUP-abc123)
 * @param {string} orderData.customerName - Customer name
 * @param {Array} orderData.items - Array of items with description and quantity
 * @param {number} orderData.total - Total amount in pence
 * @param {string} orderData.address - Shipping address
 * @returns {Object} Email template with subject, html, and text fields
 */
export function generateCustomerConfirmation(orderData) {
  const { orderId, customerName, items, total, address } = orderData;
  const greeting = formatGreeting(customerName);

  const subject = `Your Puplets order ${orderId} is confirmed`;
  const itemsHtml = formatItemsHtml(items);
  const itemsText = formatItemsText(items);
  const formattedTotal = formatTotal(total);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #00AD50; border-bottom: 2px solid #00AD50; padding-bottom: 10px;">Thank You for Your Order!</h1>

  <p>${escapeHtml(greeting)},</p>

  <p>Your order has been confirmed and is being processed. You'll receive another email when it's dispatched.</p>

  <h2 style="color: #333; margin-top: 30px;">Order Summary</h2>

  <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>

  <h3 style="color: #333;">Items:</h3>
  <ul style="list-style-type: none; padding-left: 0;">
    ${itemsHtml}
  </ul>

  <p><strong>Total:</strong> ${escapeHtml(formattedTotal)}</p>

  <h3 style="color: #333; margin-top: 30px;">Shipping Address:</h3>
  <p style="margin-left: 20px;">${escapeHtml(address)}</p>

  <p style="margin-top: 30px;">If you have any questions about your order, please don't hesitate to get in touch.</p>

  ${generateSignatureHtml()}
</body>
</html>
  `.trim();

  const text = `
Thank You for Your Order!

${greeting},

Your order has been confirmed and is being processed. You'll receive another email when it's dispatched.

ORDER SUMMARY
-------------

Order ID: ${orderId}

Items:
${itemsText}

Total: ${formattedTotal}

SHIPPING ADDRESS
----------------

${address}

If you have any questions about your order, please don't hesitate to get in touch.
${generateSignatureText()}
  `.trim();

  return {
    subject,
    html,
    text
  };
}

/**
 * Generate shop owner notification email
 * @param {Object} orderData - Order details
 * @param {string} orderData.orderId - Order ID (e.g., PUP-abc123)
 * @param {Array} orderData.items - Array of items with description and quantity
 * @param {number} orderData.total - Total amount in pence
 * @param {string} orderData.address - Shipping address
 * @param {string} orderData.customerName - Customer name
 * @param {string} orderData.customerEmail - Customer email
 * @param {string} airtableLink - Airtable record link
 * @returns {Object} Email template with subject, html, and text fields
 */
export function generateShopOwnerNotification(orderData, airtableLink) {
  const { orderId, items, total, address, customerName, customerEmail } = orderData;

  const subject = `New Order - ${orderId}`;
  const itemsHtml = formatItemsHtml(items);
  const itemsText = formatItemsText(items);
  const formattedTotal = formatTotal(total);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #00AD50; border-bottom: 2px solid #00AD50; padding-bottom: 10px;">New Order Received</h1>

  <p>A new order has been placed and requires processing.</p>

  <h2 style="color: #333; margin-top: 30px;">Order Details</h2>

  <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>

  <h3 style="color: #333;">Customer Information:</h3>
  <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
  <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>

  <h3 style="color: #333;">Items Ordered:</h3>
  <ul style="list-style-type: none; padding-left: 0;">
    ${itemsHtml}
  </ul>

  <p><strong>Total:</strong> ${escapeHtml(formattedTotal)}</p>

  <h3 style="color: #333; margin-top: 30px;">Shipping Address:</h3>
  <p style="margin-left: 20px;">${escapeHtml(address)}</p>

  <div style="background-color: #f5f5f5; border-left: 4px solid #00AD50; padding: 15px; margin: 30px 0;">
    <p style="margin: 0;"><strong>View in Airtable:</strong> <a href="${escapeHtml(airtableLink)}" style="color: #00AD50;">${escapeHtml(airtableLink)}</a></p>
  </div>

  <p style="margin-top: 40px; color: #777; font-size: 14px;">
    This is an automated notification. Process this order in Airtable.
  </p>
</body>
</html>
  `.trim();

  const text = `
New Order Received

A new order has been placed and requires processing.

ORDER DETAILS
-------------

Order ID: ${orderId}

CUSTOMER INFORMATION
--------------------

Name: ${customerName}
Email: ${customerEmail}

Items Ordered:
${itemsText}

Total: ${formattedTotal}

SHIPPING ADDRESS
----------------

${address}

VIEW IN AIRTABLE
----------------

${airtableLink}

---
This is an automated notification. Process this order in Airtable.
  `.trim();

  return {
    subject,
    html,
    text
  };
}

/**
 * Generate shipping notification email
 * @param {Object} orderData - Order details
 * @param {string} orderData.orderId - Order ID (e.g., PUP-abc123)
 * @param {string} orderData.customerName - Customer name
 * @param {string} [trackingUrl] - Optional tracking URL
 * @returns {Object} Email template with subject, html, and text fields
 */
export function generateShippingNotification(orderData, trackingUrl) {
  const { orderId, customerName } = orderData;
  const greeting = formatGreeting(customerName);

  const subject = `Your Puplets order ${orderId} has shipped`;

  const trackingHtml = trackingUrl
    ? `
  <div style="background-color: #f5f5f5; border-left: 4px solid #00AD50; padding: 15px; margin: 30px 0;">
    <p style="margin: 0;"><strong>Track your order:</strong> <a href="${escapeHtml(trackingUrl)}" style="color: #00AD50;">${escapeHtml(trackingUrl)}</a></p>
  </div>`
    : `
  <p>Your order has been dispatched and is on its way to you.</p>`;

  const trackingText = trackingUrl
    ? `
TRACK YOUR ORDER
----------------

${trackingUrl}`
    : `
Your order has been dispatched and is on its way to you.`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Dispatched</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #00AD50; border-bottom: 2px solid #00AD50; padding-bottom: 10px;">Your Order Has Shipped!</h1>

  <p>${escapeHtml(greeting)},</p>

  <p>Good news! Your order ${escapeHtml(orderId)} has been dispatched and is on its way to you.</p>

  ${trackingHtml}

  <p style="margin-top: 30px;">If you have any questions about your order, please don't hesitate to get in touch.</p>

  ${generateSignatureHtml()}
</body>
</html>
  `.trim();

  const text = `
Your Order Has Shipped!

${greeting},

Good news! Your order ${orderId} has been dispatched and is on its way to you.
${trackingText}

If you have any questions about your order, please don't hesitate to get in touch.
${generateSignatureText()}
  `.trim();

  return {
    subject,
    html,
    text
  };
}

/**
 * Generate shop owner error notification email
 * @param {Object} errorData - Error details
 * @param {string} errorData.sessionId - Stripe session ID
 * @param {string} errorData.errorType - Error type (e.g., 'ORDER CREATION FAILED')
 * @param {string} errorData.errorMessage - Error message
 * @returns {Object} Email template with subject, html, and text fields
 */
export function generateShopOwnerErrorNotification(errorData) {
  const { sessionId, errorType, errorMessage } = errorData;

  const subject = `Order Processing Error - ${sessionId}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Processing Error</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 10px;">Order Processing Error</h1>

  <p>An error occurred while processing a Stripe checkout session.</p>

  <div style="background-color: #ffebee; border-left: 4px solid #d32f2f; padding: 15px; margin: 30px 0;">
    <p style="margin: 0;"><strong>Error Type:</strong> ${escapeHtml(errorType)}</p>
    <p style="margin: 10px 0 0 0;"><strong>Error Message:</strong> ${escapeHtml(errorMessage)}</p>
  </div>

  <h2 style="color: #333; margin-top: 30px;">Session Details</h2>
  <p><strong>Stripe Session ID:</strong> ${escapeHtml(sessionId)}</p>

  <p style="margin-top: 40px; color: #777; font-size: 14px;">
    This is an automated error notification. Please investigate and take appropriate action.
  </p>
</body>
</html>
  `.trim();

  const text = `
Order Processing Error

An error occurred while processing a Stripe checkout session.

ERROR DETAILS
-------------

Error Type: ${errorType}
Error Message: ${errorMessage}

SESSION DETAILS
---------------

Stripe Session ID: ${sessionId}

---
This is an automated error notification. Please investigate and take appropriate action.
  `.trim();

  return {
    subject,
    html,
    text
  };
}
