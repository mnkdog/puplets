import Airtable from 'airtable';

/**
 * Airtable client for managing orders and inventory
 */
export class AirtableClient {
  constructor(apiKey, baseId) {
    if (!apiKey) {
      throw new Error('Airtable API key is required');
    }
    if (!baseId) {
      throw new Error('Airtable base ID is required');
    }

    this.base = new Airtable({ apiKey }).base(baseId);
    this.ordersTable = this.base('Orders');
    this.inventoryTable = this.base('Inventory');
  }

  /**
   * Create a new order record in Airtable
   * @param {Object} orderData - Order details
   * @param {string} orderData.orderId - Order ID in format PUP-{last-8-chars}
   * @param {string} orderData.sessionId - Stripe session ID
   * @param {string} orderData.customerEmail - Customer email address
   * @param {string} orderData.customerName - Customer full name
   * @param {string} orderData.shippingAddress - Full shipping address
   * @param {Array} orderData.items - Line items array
   * @param {number} orderData.total - Total amount in pounds
   * @returns {Promise<Object>} Created record with Airtable record ID
   */
  async createOrder(orderData) {
    const fields = this.mapOrderFields(orderData);

    const records = await this.ordersTable.create([{ fields }]);
    const record = records[0];

    return {
      id: record.id,
      fields: record.fields
    };
  }

  /**
   * Find order by Stripe session ID
   * @param {string} sessionId - Stripe session ID
   * @returns {Promise<Object|null>} Order record or null if not found
   */
  async findOrderBySessionId(sessionId) {
    const records = await this.ordersTable
      .select({
        filterByFormula: this.buildFieldEqualsFilter('Stripe Session ID', sessionId)
      })
      .firstPage();

    if (records.length === 0) {
      return null;
    }

    return {
      id: records[0].id,
      fields: records[0].fields
    };
  }

  /**
   * Find ALL orders by Stripe Session ID (for race condition detection)
   * @param {string} sessionId - Stripe checkout session ID
   * @returns {Promise<Array>} Array of all order records with this session ID
   */
  async findAllOrdersBySessionId(sessionId) {
    const records = await this.ordersTable
      .select({
        filterByFormula: this.buildFieldEqualsFilter('Stripe Session ID', sessionId)
      })
      .firstPage();

    return records.map(record => ({
      id: record.id,
      fields: record.fields
    }));
  }

  /**
   * Find order by Order ID
   * @param {string} orderId - Order ID in format PUP-{last-8-chars}
   * @returns {Promise<Object|null>} Order record or null if not found
   */
  async findOrderById(orderId) {
    const records = await this.ordersTable
      .select({
        filterByFormula: this.buildFieldEqualsFilter('Order ID', orderId)
      })
      .firstPage();

    if (records.length === 0) {
      return null;
    }

    return {
      id: records[0].id,
      fields: records[0].fields
    };
  }

  /**
   * Delete an order by record ID
   * @param {string} recordId - Airtable record ID
   * @returns {Promise<void>}
   */
  async deleteOrder(recordId) {
    await this.ordersTable.destroy(recordId);
  }

  /**
   * Build Airtable filterByFormula for field equality
   * @param {string} fieldName - Airtable field name
   * @param {string} value - Value to match
   * @returns {string} Filter formula
   */
  buildFieldEqualsFilter(fieldName, value) {
    // Escape backslashes FIRST, then single quotes to prevent formula injection
    // Order matters: escaping quotes before backslashes would allow \' to defeat the escape
    const escapedValue = String(value)
      .replace(/\\/g, '\\\\')  // Backslashes first
      .replace(/'/g, "\\'");   // Then quotes
    return `{${fieldName}} = '${escapedValue}'`;
  }

  /**
   * Update order record fields
   * @param {string} orderId - Order ID in format PUP-{last-8-chars}
   * @param {Object} updates - Fields to update (e.g., {Status: 'shipped', 'Tracking URL': 'https://...'})
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateOrder(orderId, updates) {
    const order = await this.findOrderById(orderId);

    if (!order) {
      return null;
    }

    await this.ordersTable.update(order.id, updates);

    return {
      id: order.id,
      fields: { ...order.fields, ...updates }
    };
  }

  /**
   * Update inventory quantities for order line items with retry logic
   * Retries converge on a target quantity computed once, preventing re-application
   * @param {Array} lineItems - Array of line items [{description, quantity}]
   * @param {string} orderId - Order ID for logging purposes
   * @returns {Promise<void>}
   */
  async updateInventoryForOrder(lineItems, orderId) {
    for (const item of lineItems) {
      // Retry up to 3 times to handle race conditions
      const maxRetries = 3;
      let attemptNumber = 0;
      let updateSucceeded = false;
      let targetQuantity = null;
      let productId = null;

      while (attemptNumber < maxRetries && !updateSucceeded) {
        try {
          attemptNumber++;

          // Find product by exact description match
          const records = await this.inventoryTable
            .select({
              filterByFormula: this.buildFieldEqualsFilter('Product', item.description)
            })
            .firstPage();

          if (records.length === 0) {
            console.warn(`Product not found in inventory: "${item.description}" for order ${orderId}`);
            break; // No retry needed for missing product
          }

          const product = records[0];
          productId = product.id;

          // Calculate target quantity once on first attempt, then reuse for retries
          // This prevents re-applying the decrement on retry
          if (targetQuantity === null) {
            const currentQuantity = product.fields.Quantity || 0;
            targetQuantity = Math.max(0, currentQuantity - item.quantity);
          }

          // Attempt to update the inventory quantity
          await this.inventoryTable.update(productId, {
            'Quantity': targetQuantity
          });

          // Verify the update succeeded by checking the written value matches our target
          // This detects if another concurrent update overwrote our change
          const verifyRecords = await this.inventoryTable
            .select({
              filterByFormula: this.buildFieldEqualsFilter('Product', item.description)
            })
            .firstPage();

          if (verifyRecords.length > 0) {
            const verifiedQuantity = verifyRecords[0].fields.Quantity;
            // Verify the written value matches what we intended
            if (verifiedQuantity === targetQuantity) {
              updateSucceeded = true;
            } else {
              console.warn(`[INVENTORY UPDATE VERIFICATION FAILED] Product "${item.description}", expected ${targetQuantity}, got ${verifiedQuantity}, attempt ${attemptNumber}/${maxRetries}`);
              // Concurrent update detected - recalculate target for next retry
              targetQuantity = null;
              // Wait briefly before retry to reduce contention
              await new Promise(resolve => setTimeout(resolve, 100 * attemptNumber));
            }
          } else {
            console.warn(`[INVENTORY VERIFY READ FAILED] Product "${item.description}", attempt ${attemptNumber}/${maxRetries}`);
            // Wait briefly before retry
            await new Promise(resolve => setTimeout(resolve, 100 * attemptNumber));
          }
        } catch (error) {
          console.warn(`Failed to update inventory for product "${item.description}" in order ${orderId} (attempt ${attemptNumber}/${maxRetries}):`, error.message);
          if (attemptNumber < maxRetries) {
            // Wait briefly before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, 100 * attemptNumber));
          }
        }
      }

      if (!updateSucceeded && attemptNumber >= maxRetries) {
        console.error(`[INVENTORY UPDATE FAILED AFTER RETRIES] Product "${item.description}", order ${orderId}`);
      }
    }
  }

  /**
   * Map order data to Airtable table schema
   * @param {Object} orderData - Order data
   * @returns {Object} Mapped fields for Airtable
   */
  mapOrderFields(orderData) {
    return {
      'Order ID': orderData.orderId,
      'Stripe Session ID': orderData.sessionId,
      'Customer Email': orderData.customerEmail,
      'Customer Name': orderData.customerName || '',
      'Shipping Address': orderData.shippingAddress || '',
      'Items': JSON.stringify(orderData.items || []),
      'Total': orderData.total,
      'Status': 'pending',
      'Created': new Date().toISOString()
    };
  }
}
