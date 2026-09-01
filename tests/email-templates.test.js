import { describe, it, expect } from 'vitest';
import { generateCustomerConfirmation, generateShopOwnerNotification, generateShippingNotification } from '../templates/email-templates.js';

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

describe('generateShopOwnerNotification', () => {
  describe('return structure', () => {
    it('returns object with subject, html, and text fields', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Blue Waterproof Collar - Medium', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
    });
  });

  describe('subject line', () => {
    it('formats subject as "New Order - {Order ID}"', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.subject).toBe('New Order - PUP-abc123');
    });

    it('handles different order ID formats', () => {
      const orderData = {
        orderId: 'PUP-xyz789',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£29.99',
        address: '456 Test Ave',
        customerName: 'Another User',
        customerEmail: 'another@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recAAAAAA';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.subject).toBe('New Order - PUP-xyz789');
    });
  });

  describe('HTML content', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('PUP-abc123');
      expect(result.html).toContain('Order ID:');
    });

    it('contains customer name', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('Name:');
    });

    it('contains customer email', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('jane@example.com');
      expect(result.html).toContain('Email:');
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
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

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
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('£19.99');
      expect(result.html).toContain('Total:');
    });

    it('formats total with £ symbol when not prefixed', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: 19.99,
        address: '123 Test St',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('£19.99');
    });

    it('contains full shipping address', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('123 Main St, London SW1A 1AA, UK');
      expect(result.html).toContain('Shipping Address:');
    });

    it('contains clickable Airtable link', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ');
      expect(result.html).toContain('View in Airtable:');
      expect(result.html).toContain(`<a href="${airtableLink}"`);
    });
  });

  describe('text content', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.text).toContain('PUP-abc123');
      expect(result.text).toContain('Order ID:');
    });

    it('contains customer name', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.text).toContain('Jane Smith');
      expect(result.text).toContain('Name:');
    });

    it('contains customer email', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.text).toContain('jane@example.com');
      expect(result.text).toContain('Email:');
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
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

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
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.text).toContain('£19.99');
      expect(result.text).toContain('Total:');
    });

    it('contains full shipping address', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.text).toContain('123 Main St, London SW1A 1AA, UK');
    });

    it('contains Airtable link', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Test User',
        customerEmail: 'test@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.text).toContain('https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ');
      expect(result.text).toContain('VIEW IN AIRTABLE');
    });
  });

  describe('Gherkin scenario compliance', () => {
    it('matches the exact scenario from the plan', () => {
      // Scenario: Email template generates shop owner notification
      //   Given order data with specific values and Airtable link
      const orderData = {
        orderId: 'PUP-abc123',
        items: [{ description: 'Blue Waterproof Collar - Medium', quantity: 1 }],
        total: '£19.99',
        address: '123 Main St, London SW1A 1AA, UK',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ';

      // When generateShopOwnerNotification is called
      const result = generateShopOwnerNotification(orderData, airtableLink);

      // Then template returns object with subject, html, text fields
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');

      // And subject is "New Order - PUP-abc123"
      expect(result.subject).toBe('New Order - PUP-abc123');

      // And html contains customer email
      expect(result.html).toContain('jane@example.com');

      // And html contains customer name
      expect(result.html).toContain('Jane Smith');

      // And html contains shipping address
      expect(result.html).toContain('123 Main St, London SW1A 1AA, UK');

      // And html contains itemized products with quantities
      expect(result.html).toContain('Blue Waterproof Collar - Medium');
      expect(result.html).toContain('(1)');

      // And html contains total amount
      expect(result.html).toContain('£19.99');

      // And html contains clickable Airtable link
      expect(result.html).toContain('https://airtable.com/appXXXXX/tblYYYYY/recZZZZZ');
      expect(result.html).toContain(`<a href="${airtableLink}"`);
    });
  });

  describe('edge cases', () => {
    it('handles items with missing quantity field', () => {
      const orderData = {
        orderId: 'PUP-no-qty',
        items: [{ description: 'Item Without Quantity' }],
        total: '£15.00',
        address: '2 Test Road',
        customerName: 'Quantity Tester',
        customerEmail: 'qty@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recAAAAAA';

      const result = generateShopOwnerNotification(orderData, airtableLink);

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
        customerName: 'Multi Buyer',
        customerEmail: 'multi@example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recBBBBBB';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('Item A');
      expect(result.html).toContain('(1)');
      expect(result.html).toContain('Item B');
      expect(result.html).toContain('(3)');
      expect(result.html).toContain('Item C');
      expect(result.html).toContain('(2)');
    });

    it('handles long email addresses', () => {
      const orderData = {
        orderId: 'PUP-long-email',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Long Email User',
        customerEmail: 'very.long.email.address.with.many.dots@subdomain.example.com'
      };
      const airtableLink = 'https://airtable.com/appXXXXX/tblYYYYY/recCCCCCC';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('very.long.email.address.with.many.dots@subdomain.example.com');
      expect(result.text).toContain('very.long.email.address.with.many.dots@subdomain.example.com');
    });

    it('handles different Airtable link formats', () => {
      const orderData = {
        orderId: 'PUP-link-test',
        items: [{ description: 'Test Item', quantity: 1 }],
        total: '£19.99',
        address: '123 Test St',
        customerName: 'Link Tester',
        customerEmail: 'link@example.com'
      };
      const airtableLink = 'https://airtable.com/app12345ABC/tblXYZ789/recMNO123';

      const result = generateShopOwnerNotification(orderData, airtableLink);

      expect(result.html).toContain('https://airtable.com/app12345ABC/tblXYZ789/recMNO123');
      expect(result.text).toContain('https://airtable.com/app12345ABC/tblXYZ789/recMNO123');
    });
  });
});

describe('generateShippingNotification', () => {
  describe('return structure', () => {
    it('returns object with subject, html, and text fields', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Jane Smith'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

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
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.subject).toBe('Your Puplets order PUP-abc123 has been dispatched');
    });

    it('handles different order ID formats', () => {
      const orderData = {
        orderId: 'PUP-xyz789',
        customerName: 'Another User'
      };

      const result = generateShippingNotification(orderData);

      expect(result.subject).toBe('Your Puplets order PUP-xyz789 has been dispatched');
    });
  });

  describe('HTML content with tracking URL', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.html).toContain('PUP-abc123');
    });

    it('contains dispatched message', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.html).toContain('Your Order Has Been Dispatched');
      expect(result.html).toContain('has been dispatched and is on its way to you');
    });

    it('contains tracking URL as clickable link', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.html).toContain('https://track.example.com/12345');
      expect(result.html).toContain('Track your order:');
      expect(result.html).toContain(`<a href="${trackingUrl}"`);
    });

    it('includes customer name in greeting', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Jane Smith'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.html).toContain('Hi Jane Smith');
    });

    it('uses fallback greeting when customer name is missing', () => {
      const orderData = {
        orderId: 'PUP-abc123'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.html).toContain('Hi there');
    });
  });

  describe('HTML content without tracking URL', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData);

      expect(result.html).toContain('PUP-abc123');
    });

    it('contains dispatched message without tracking section', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData);

      expect(result.html).toContain('Your Order Has Been Dispatched');
      expect(result.html).toContain('Your order has been dispatched and is on its way to you');
      expect(result.html).not.toContain('Track your order:');
    });

    it('does not contain tracking URL when null', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData, null);

      expect(result.html).not.toContain('Track your order:');
      expect(result.html).not.toContain('https://track');
    });

    it('does not contain tracking URL when undefined', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData, undefined);

      expect(result.html).not.toContain('Track your order:');
      expect(result.html).not.toContain('https://track');
    });
  });

  describe('text content with tracking URL', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.text).toContain('PUP-abc123');
    });

    it('contains dispatched message', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.text).toContain('Your Order Has Been Dispatched');
      expect(result.text).toContain('has been dispatched and is on its way to you');
    });

    it('contains tracking URL', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.text).toContain('https://track.example.com/12345');
      expect(result.text).toContain('TRACK YOUR ORDER');
    });

    it('includes customer name in greeting', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Jane Smith'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.text).toContain('Hi Jane Smith');
    });
  });

  describe('text content without tracking URL', () => {
    it('contains order ID', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData);

      expect(result.text).toContain('PUP-abc123');
    });

    it('contains dispatched message without tracking section', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData);

      expect(result.text).toContain('Your Order Has Been Dispatched');
      expect(result.text).toContain('Your order has been dispatched and is on its way to you');
      expect(result.text).not.toContain('TRACK YOUR ORDER');
    });

    it('does not contain tracking URL when null', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData, null);

      expect(result.text).not.toContain('TRACK YOUR ORDER');
      expect(result.text).not.toContain('https://track');
    });

    it('does not contain tracking URL when undefined', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test User'
      };

      const result = generateShippingNotification(orderData, undefined);

      expect(result.text).not.toContain('TRACK YOUR ORDER');
      expect(result.text).not.toContain('https://track');
    });
  });

  describe('Gherkin scenario compliance', () => {
    it('matches scenario with tracking URL provided', () => {
      // Scenario: POST /api/send-shipping-update with valid bearer token, valid orderId, and trackingUrl
      //   Given order data with orderId and customer name
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test Customer'
      };
      const trackingUrl = 'https://track.example.com/PUP-abc123';

      // When generateShippingNotification is called with trackingUrl
      const result = generateShippingNotification(orderData, trackingUrl);

      // Then template returns object with subject, html, text fields
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');

      // And subject contains order ID
      expect(result.subject).toContain('PUP-abc123');
      expect(result.subject).toContain('dispatched');

      // And html contains tracking link (customer receives email with tracking link)
      expect(result.html).toContain('https://track.example.com/PUP-abc123');
      expect(result.html).toContain('Track your order');

      // And text contains tracking URL
      expect(result.text).toContain('https://track.example.com/PUP-abc123');
    });

    it('matches scenario without tracking URL provided', () => {
      // Scenario: POST /api/send-shipping-update with valid bearer token and orderId but no trackingUrl
      //   Given order data with orderId and customer name
      const orderData = {
        orderId: 'PUP-abc123',
        customerName: 'Test Customer'
      };

      // When generateShippingNotification is called without trackingUrl
      const result = generateShippingNotification(orderData);

      // Then template returns object with subject, html, text fields
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');

      // And subject contains order ID
      expect(result.subject).toContain('PUP-abc123');
      expect(result.subject).toContain('dispatched');

      // And html states order dispatched (no tracking link shown)
      expect(result.html).toContain('Your order has been dispatched and is on its way to you');
      expect(result.html).not.toContain('Track your order');
      expect(result.html).not.toContain('https://track');

      // And text states order dispatched (no tracking link shown)
      expect(result.text).toContain('Your order has been dispatched and is on its way to you');
      expect(result.text).not.toContain('TRACK YOUR ORDER');
    });
  });

  describe('edge cases', () => {
    it('handles empty string tracking URL as falsy', () => {
      const orderData = {
        orderId: 'PUP-empty-track',
        customerName: 'Empty Track User'
      };

      const result = generateShippingNotification(orderData, '');

      expect(result.html).not.toContain('Track your order:');
      expect(result.text).not.toContain('TRACK YOUR ORDER');
    });

    it('handles different tracking URL formats', () => {
      const orderData = {
        orderId: 'PUP-custom-track',
        customerName: 'Custom Track User'
      };
      const trackingUrl = 'https://custom-carrier.com/track?id=ABC123XYZ&lang=en';

      const result = generateShippingNotification(orderData, trackingUrl);

      // HTML version escapes ampersands per HTML spec
      expect(result.html).toContain('https://custom-carrier.com/track?id=ABC123XYZ&amp;lang=en');
      // Plain text version keeps raw ampersand
      expect(result.text).toContain('https://custom-carrier.com/track?id=ABC123XYZ&lang=en');
    });

    it('handles long order IDs', () => {
      const orderData = {
        orderId: 'PUP-very-long-order-id-12345678',
        customerName: 'Long ID User'
      };
      const trackingUrl = 'https://track.example.com/12345';

      const result = generateShippingNotification(orderData, trackingUrl);

      expect(result.subject).toContain('PUP-very-long-order-id-12345678');
      expect(result.html).toContain('PUP-very-long-order-id-12345678');
      expect(result.text).toContain('PUP-very-long-order-id-12345678');
    });
  });
});

describe('formatTotal helper', () => {
  describe('numeric values', () => {
    it('formats integer as currency with two decimal places', () => {
      const orderData = {
        orderId: 'PUP-test',
        items: [{ description: 'Test', quantity: 1 }],
        total: 20,
        address: 'Test',
        customerName: 'Test'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('£20.00');
      expect(result.text).toContain('£20.00');
    });

    it('formats decimal with one decimal place to two decimal places', () => {
      const orderData = {
        orderId: 'PUP-test',
        items: [{ description: 'Test', quantity: 1 }],
        total: 19.9,
        address: 'Test',
        customerName: 'Test'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('£19.90');
      expect(result.text).toContain('£19.90');
    });

    it('formats decimal with three decimal places to two decimal places', () => {
      const orderData = {
        orderId: 'PUP-test',
        items: [{ description: 'Test', quantity: 1 }],
        total: 19.999,
        address: 'Test',
        customerName: 'Test'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('£20.00');
      expect(result.text).toContain('£20.00');
    });

    it('preserves already formatted string with £ symbol', () => {
      const orderData = {
        orderId: 'PUP-test',
        items: [{ description: 'Test', quantity: 1 }],
        total: '£19.99',
        address: 'Test',
        customerName: 'Test'
      };

      const result = generateCustomerConfirmation(orderData);

      expect(result.html).toContain('£19.99');
      expect(result.text).toContain('£19.99');
    });
  });
});
