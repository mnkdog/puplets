/**
 * Email template generation for customer notifications
 */

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format an item quantity (defaults to 1 if not provided)
 * @param {Object} item - Line item with optional quantity
 * @returns {number} Quantity value
 */
function getItemQuantity(item) {
  return item.quantity || 1;
}

/**
 * Format items list for HTML display
 * @param {Array} items - Array of line items
 * @returns {string} HTML list items
 */
function formatItemsHtml(items) {
  return items.map(item => {
    const quantity = getItemQuantity(item);
    return `<li>${item.description} (${quantity})</li>`;
  }).join('\n    ');
}

/**
 * Format items list for plain text display
 * @param {Array} items - Array of line items
 * @returns {string} Plain text item list
 */
function formatItemsText(items) {
  return items.map(item => {
    const quantity = getItemQuantity(item);
    return `- ${item.description} (${quantity})`;
  }).join('\n');
}

/**
 * Format total amount with £ symbol
 * @param {string|number} total - Total amount
 * @returns {string} Formatted total with £ symbol
 */
function formatTotal(total) {
  return typeof total === 'string' && total.startsWith('£')
    ? total
    : `£${total}`;
}

/**
 * Format greeting with customer name or fallback
 * @param {string} customerName - Customer name (optional)
 * @returns {string} Greeting text
 */
function formatGreeting(customerName) {
  return customerName || 'there';
}

// ============================================================================
// Template Generators
// ============================================================================

/**
 * Generate customer order confirmation email
 * @param {Object} orderData - Order details
 * @param {string} orderData.orderId - Order ID (e.g., PUP-abc123)
 * @param {Array} orderData.items - Array of line items {description, quantity, price}
 * @param {number} orderData.total - Total amount in pounds
 * @param {string} orderData.address - Full shipping address
 * @param {string} orderData.customerName - Customer name
 * @returns {Object} Email template with subject, html, and text fields
 */
export function generateCustomerConfirmation(orderData) {
  const { orderId, items, total, address, customerName } = orderData;

  const subject = `Order Confirmation - Puplets Order ${orderId}`;
  const itemsHtml = formatItemsHtml(items);
  const itemsText = formatItemsText(items);
  const formattedTotal = formatTotal(total);
  const greeting = formatGreeting(customerName);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #00AD50; border-bottom: 2px solid #00AD50; padding-bottom: 10px;">Order Confirmation</h1>

  <p>Hi ${greeting},</p>

  <p>Thank you for your order! We've received your purchase and will get it dispatched to you soon.</p>

  <h2 style="color: #333; margin-top: 30px;">Order Details</h2>

  <p><strong>Order ID:</strong> ${orderId}</p>

  <h3 style="color: #333;">Items Ordered:</h3>
  <ul style="list-style-type: none; padding-left: 0;">
    ${itemsHtml}
  </ul>

  <p><strong>Total:</strong> ${formattedTotal}</p>

  <h3 style="color: #333; margin-top: 30px;">Shipping Address:</h3>
  <p style="margin-left: 20px;">${address}</p>

  <div style="background-color: #f5f5f5; border-left: 4px solid #00AD50; padding: 15px; margin: 30px 0;">
    <p style="margin: 0;"><strong>Free delivery in 3-7 business days</strong></p>
  </div>

  <p style="margin-top: 30px;">If you have any questions about your order, please don't hesitate to get in touch.</p>

  <p style="margin-top: 40px;">Best regards,<br>The Puplets Team</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 40px 0;">

  <p style="font-size: 12px; color: #777; text-align: center;">
    Puplets - Quality collars for your furry friends
  </p>
</body>
</html>
  `.trim();

  const text = `
Order Confirmation - Puplets

Hi ${greeting},

Thank you for your order! We've received your purchase and will get it dispatched to you soon.

ORDER DETAILS
-------------

Order ID: ${orderId}

Items Ordered:
${itemsText}

Total: ${formattedTotal}

SHIPPING ADDRESS
----------------

${address}

*** FREE DELIVERY IN 3-7 BUSINESS DAYS ***

If you have any questions about your order, please don't hesitate to get in touch.

Best regards,
The Puplets Team

---
Puplets - Quality collars for your furry friends
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
 * @param {Array} orderData.items - Array of line items {description, quantity, price}
 * @param {number} orderData.total - Total amount in pounds
 * @param {string} orderData.address - Full shipping address
 * @param {string} orderData.customerName - Customer name
 * @param {string} orderData.customerEmail - Customer email address
 * @param {string} airtableLink - Clickable link to Airtable order record
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

  <p><strong>Order ID:</strong> ${orderId}</p>

  <h3 style="color: #333;">Customer Information:</h3>
  <p><strong>Name:</strong> ${customerName}</p>
  <p><strong>Email:</strong> ${customerEmail}</p>

  <h3 style="color: #333;">Items Ordered:</h3>
  <ul style="list-style-type: none; padding-left: 0;">
    ${itemsHtml}
  </ul>

  <p><strong>Total:</strong> ${formattedTotal}</p>

  <h3 style="color: #333; margin-top: 30px;">Shipping Address:</h3>
  <p style="margin-left: 20px;">${address}</p>

  <div style="background-color: #f5f5f5; border-left: 4px solid #00AD50; padding: 15px; margin: 30px 0;">
    <p style="margin: 0;"><strong>View in Airtable:</strong> <a href="${airtableLink}" style="color: #00AD50;">${airtableLink}</a></p>
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
