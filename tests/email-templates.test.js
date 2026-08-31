import { describe, it, expect } from 'vitest';
import { generateCustomerConfirmation } from '../templates/email-templates.js';

describe('generateCustomerConfirmation', () => {
  describe('return structure', () => {
    it('returns object with subject, html, and text fields', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Blue Waterproof Collar - Medium', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Jane Smith'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
    });
  });

  describe('subject line', () => {
    it('formats subject with order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.subject).toBe('Order Confirmation - Puplets Order PUP-abc123');
    });

    it('handles different order ID formats', () => {
      const orderData = {
        orderId: 'PUP-xyz789',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£29.99',
        address: '456 Test Ave',
        customerName: 'Another User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.subject).toBe('Order Confirmation - Puplets Order PUP-xyz789');
    });
  });

  describe('HTML content', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('PUP-abc123');
      expect(result.html).toContain('Order ID:');
    });

    it('contains itemized products with quantities', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [
          { description: 'Blue Waterproof Collar - Medium', quantity: 1 },
          { description: 'Red Waterproof Collar - Small', quantity: 2 }
        ],
        total: '£49.97',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Blue Waterproof Collar - Medium');
      expect(result.html).toContain('(1)');
      expect(result.html).toContain('Red Waterproof Collar - Small');
      expect(result.html).toContain('(2)');
    });

    it('contains total amount with £ symbol', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('£19.99');
      expect(result.html).toContain('Total:');
    });

    it('formats total with £ symbol when not prefixed', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: 19.99,
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('£19.99');
    });

    it('contains full shipping address', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('123 Main St, London SW1A 1AA, UK');
      expect(result.html).toContain('Shipping Address:');
    });

    it('contains free delivery message', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Free delivery in 3-7 business days');
    });

    it('includes customer name in greeting', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Jane Smith'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Hi Jane Smith');
    });

    it('uses fallback greeting when customer name is missing', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Hi there');
    });
  });

  describe('text content', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.text).toContain('PUP-abc123');
      expect(result.text).toContain('Order ID:');
    });

    it('contains itemized products with quantities', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [
          { description: 'Blue Waterproof Collar - Medium', quantity: 1 },
          { description: 'Red Waterproof Collar - Small', quantity: 2 }
        ],
        total: '£49.97',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.text).toContain('Blue Waterproof Collar - Medium');
      expect(result.text).toContain('(1)');
      expect(result.text).toContain('Red Waterproof Collar - Small');
      expect(result.text).toContain('(2)');
    });

    it('contains total amount with £ symbol', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.text).toContain('£19.99');
      expect(result.text).toContain('Total:');
    });

    it('contains full shipping address', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.text).toContain('123 Main St, London SW1A 1AA, UK');
    });

    it('contains free delivery message', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.text).toContain('FREE DELIVERY IN 3-7 BUSINESS DAYS');
    });

    it('includes customer name in greeting', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Jane Smith'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.text).toContain('Hi Jane Smith');
    });
  });

  describe('Gherkin scenario compliance', () => {
    it('matches the exact scenario from the plan', () => {
      // Scenario: Email template generates customer confirmation HTML
      //   Given order data with specific values
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Blue Waterproof Collar - Medium', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Test Customer'
      };

      // When generateCustomerConfirmation is called
      const result = generateCustomerConfirmation(orderData);

      // Then template returns object with subject, html, text fields
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');

      // And subject is "Order Confirmation - Puplets Order PUP-abc123"
      expect(result.subject).toBe('Order Confirmation - Puplets Order PUP-abc123');

      // And html contains order ID, itemized products, total, address
      expect(result.html).toContain('PUP-abc123');
      expect(result.html).toContain('Blue Waterproof Collar - Medium');
      expect(result.html).toContain('(1)');
      expect(result.html).toContain('£19.99');
      expect(result.html).toContain('123 Main St, London SW1A 1AA, UK');

      // And html contains "Free delivery in 3-7 business days"
      expect(result.html).toContain('Free delivery in 3-7 business days');
    });
  });

  describe('edge cases', () => {
    it('handles single item orders', () => {
      const orderData = {
        orderId: 'PUP-single',
        items: [{ description: 'Single Item', quantity: 1 }],
        total: '£9.99',
        address: '1 Test Lane',
        customerName: 'Solo Buyer'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Single Item');
      expect(result.text).toContain('Single Item');
    });

    it('handles items with missing quantity field', () => {
      const orderData = {
        orderId: 'PUP-no-qty',
        items: [{ description: 'Item Without Quantity' }],
        total: '£15.00',
        address: '2 Test Road',
        customerName: 'Quantity Tester'
      };

      const result = generateCustomerConfirmation(orderData);

      // Should default to 1
      expect(result.html).toContain('(1)');
      expect(result.text).toContain('(1)');
    });

    it('handles multiple items with various quantities', () => {
      const orderData = {
        orderId: 'PUP-multi',
        items: [
          { description: 'Item A', quantity: 1 },
          { description: 'Item B', quantity: 3 },
          { description: 'Item C', quantity: 2 }
        ],
        total: '£99.99',
        address: '3 Multi Lane',
        customerName: 'Multi Buyer'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Item A');
      expect(result.html).toContain('(1)');
      expect(result.html).toContain('Item B');
      expect(result.html).toContain('(3)');
      expect(result.html).toContain('Item C');
      expect(result.html).toContain('(2)');
    });

    it('handles long addresses', () => {
      const orderData = {
        orderId: 'PUP-long-addr',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: 'Apartment 42B, Building 7, The Grand Estate Complex, 123 Very Long Street Name Avenue, Westminster, London, Greater London, SW1A 1AA, United Kingdom',
        customerName: 'Address Tester'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('Apartment 42B');
      expect(result.text).toContain('Apartment 42B');
    });
  });
});
