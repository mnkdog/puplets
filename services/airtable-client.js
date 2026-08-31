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
   * Build Airtable filterByFormula for field equality
   * @param {string} fieldName - Airtable field name
   * @param {string} value - Value to match
   * @returns {string} Filter formula
   */
  buildFieldEqualsFilter(fieldName, value) {
    return `{${fieldName}} = '${value}'`;
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
