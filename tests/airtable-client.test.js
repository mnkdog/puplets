import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AirtableClient } from '../services/airtable-client.js';

// Create mock table objects
const mockOrdersTable = {
  create: vi.fn(),
  select: vi.fn()
};

const mockInventoryTable = {
  select: vi.fn(),
  update: vi.fn()
};

// Create a function that returns the appropriate table based on table name
const mockBaseInstance = vi.fn((tableName) => {
  if (tableName === 'Orders') return mockOrdersTable;
  if (tableName === 'Inventory') return mockInventoryTable;
  throw new Error(`Unknown table: ${tableName}`);
});

// Create a function that returns mockBaseInstance when called with baseId
const mockBase = vi.fn(() => mockBaseInstance);

// Mock the Airtable module
vi.mock('airtable', () => {
  const MockAirtable = function() {
    this.base = mockBase;
  };

  return {
    default: MockAirtable
  };
});

describe('AirtableClient', () => {
  let client;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockOrdersTable.create.mockReset();
    mockOrdersTable.select.mockReset();
    mockInventoryTable.select.mockReset();
    mockInventoryTable.update.mockReset();
    mockBase.mockClear();

    // Create client
    client = new AirtableClient('test-api-key', 'appTest123');
  });

  describe('constructor', () => {
    it('throws error when API key is missing', () => {
      expect(() => new AirtableClient(null, 'appTest123'))
        .toThrow('Airtable API key is required');
    });

    it('throws error when base ID is missing', () => {
      expect(() => new AirtableClient('test-key', null))
        .toThrow('Airtable base ID is required');
    });

    it('initializes with valid credentials', () => {
      const validClient = new AirtableClient('test-key', 'appTest123');
      expect(validClient).toBeDefined();
      expect(validClient.base).toBeDefined();
      expect(validClient.ordersTable).toBeDefined();
    });
  });

  describe('createOrder', () => {
    it('creates order record with all required fields', async () => {
      const orderData = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        customerName: 'Jane Smith',
        shippingAddress: '123 Main St, London SW1A 1AA, UK',
        items: [
          { description: 'Blue Waterproof Collar - Medium', quantity: 1, price: 1999 }
        ],
        total: 19.99
      };

      // Mock Airtable create response
      const mockRecord = {
        id: 'recABC123',
        fields: {
          'Order ID': 'PUP-abc123',
          'Stripe Session ID': 'cs_test_xyz789',
          'Customer Email': 'customer@example.com',
          'Customer Name': 'Jane Smith',
          'Shipping Address': '123 Main St, London SW1A 1AA, UK',
          'Items': JSON.stringify(orderData.items),
          'Total': 19.99,
          'Status': 'pending',
          'Created': expect.any(String)
        }
      };

      mockOrdersTable.create.mockResolvedValue([mockRecord]);

      const result = await client.createOrder(orderData);

      // Verify create was called
      expect(mockOrdersTable.create).toHaveBeenCalledWith([
        {
          fields: {
            'Order ID': 'PUP-abc123',
            'Stripe Session ID': 'cs_test_xyz789',
            'Customer Email': 'customer@example.com',
            'Customer Name': 'Jane Smith',
            'Shipping Address': '123 Main St, London SW1A 1AA, UK',
            'Items': JSON.stringify(orderData.items),
            'Total': 19.99,
            'Status': 'pending',
            'Created': expect.any(String)
          }
        }
      ]);

      // Verify return value
      expect(result).toEqual({
        id: 'recABC123',
        fields: mockRecord.fields
      });
    });

    it('returns record with Airtable record ID', async () => {
      const orderData = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        total: 19.99
      };

      mockOrdersTable.create.mockResolvedValue([{
        id: 'recXYZ789',
        fields: { 'Order ID': 'PUP-abc123' }
      }]);

      const result = await client.createOrder(orderData);

      expect(result.id).toBe('recXYZ789');
      expect(result.fields['Order ID']).toBe('PUP-abc123');
    });

    it('handles optional fields with defaults', async () => {
      const minimalOrder = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        total: 19.99
      };

      mockOrdersTable.create.mockResolvedValue([{
        id: 'recMIN123',
        fields: {}
      }]);

      await client.createOrder(minimalOrder);

      const callArgs = mockOrdersTable.create.mock.calls[0][0][0].fields;
      expect(callArgs['Customer Name']).toBe('');
      expect(callArgs['Shipping Address']).toBe('');
      expect(callArgs['Items']).toBe('[]');
      expect(callArgs['Status']).toBe('pending');
    });

    it('sets status to pending on creation', async () => {
      const orderData = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        total: 19.99
      };

      mockOrdersTable.create.mockResolvedValue([{
        id: 'recSTATUS',
        fields: { 'Status': 'pending' }
      }]);

      await client.createOrder(orderData);

      const callArgs = mockOrdersTable.create.mock.calls[0][0][0].fields;
      expect(callArgs['Status']).toBe('pending');
    });

    it('creates Created timestamp', async () => {
      // Use fake timers to make test deterministic
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T10:30:00.000Z'));

      const orderData = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        total: 19.99
      };

      mockOrdersTable.create.mockResolvedValue([{
        id: 'recTIME',
        fields: {}
      }]);

      await client.createOrder(orderData);

      const callArgs = mockOrdersTable.create.mock.calls[0][0][0].fields;

      expect(callArgs['Created']).toBeDefined();
      expect(callArgs['Created']).toBe('2026-01-15T10:30:00.000Z');

      vi.useRealTimers();
    });
  });

  describe('findOrderBySessionId', () => {
    it('finds order by Stripe session ID', async () => {
      const mockRecord = {
        id: 'recABC123',
        fields: {
          'Order ID': 'PUP-abc123',
          'Stripe Session ID': 'cs_test_xyz789',
          'Customer Email': 'customer@example.com',
          'Total': 19.99
        }
      };

      // Mock the select chain
      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      const mockSelect = vi.fn().mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderBySessionId('cs_test_xyz789');

      expect(mockOrdersTable.select).toHaveBeenCalledWith({
        filterByFormula: "{Stripe Session ID} = 'cs_test_xyz789'"
      });
      expect(result).toEqual({
        id: 'recABC123',
        fields: mockRecord.fields
      });
      expect(result.fields['Order ID']).toBe('PUP-abc123');
    });

    it('returns null when session ID not found', async () => {
      const mockFirstPage = vi.fn().mockResolvedValue([]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderBySessionId('cs_test_notfound');

      expect(result).toBeNull();
    });

    it('returns first record when multiple matches exist', async () => {
      const mockRecords = [
        {
          id: 'recFirst',
          fields: { 'Order ID': 'PUP-first' }
        },
        {
          id: 'recSecond',
          fields: { 'Order ID': 'PUP-second' }
        }
      ];

      const mockFirstPage = vi.fn().mockResolvedValue(mockRecords);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderBySessionId('cs_test_duplicate');

      expect(result.id).toBe('recFirst');
      expect(result.fields['Order ID']).toBe('PUP-first');
    });
  });

  describe('findOrderById', () => {
    it('finds order by Order ID', async () => {
      const mockRecord = {
        id: 'recDEF456',
        fields: {
          'Order ID': 'PUP-xyz789',
          'Stripe Session ID': 'cs_test_abc123',
          'Customer Email': 'test@example.com',
          'Total': 29.99
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderById('PUP-xyz789');

      expect(mockOrdersTable.select).toHaveBeenCalledWith({
        filterByFormula: "{Order ID} = 'PUP-xyz789'"
      });
      expect(result).toEqual({
        id: 'recDEF456',
        fields: mockRecord.fields
      });
      expect(result.fields['Order ID']).toBe('PUP-xyz789');
    });

    it('returns null when Order ID not found', async () => {
      const mockFirstPage = vi.fn().mockResolvedValue([]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderById('PUP-notfound');

      expect(result).toBeNull();
    });

    it('returns first record when multiple matches exist', async () => {
      const mockRecords = [
        {
          id: 'recFirst',
          fields: { 'Order ID': 'PUP-duplicate' }
        },
        {
          id: 'recSecond',
          fields: { 'Order ID': 'PUP-duplicate' }
        }
      ];

      const mockFirstPage = vi.fn().mockResolvedValue(mockRecords);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderById('PUP-duplicate');

      expect(result.id).toBe('recFirst');
      expect(result.fields['Order ID']).toBe('PUP-duplicate');
    });
  });

  describe('updateOrder', () => {
    it('updates order fields when order exists', async () => {
      const mockRecord = {
        id: 'recABC123',
        fields: {
          'Order ID': 'PUP-abc123',
          'Status': 'pending',
          'Customer Email': 'test@example.com'
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn().mockResolvedValue({});

      const updates = {
        'Status': 'shipped',
        'Tracking URL': 'https://tracking.example.com/abc123'
      };

      const result = await client.updateOrder('PUP-abc123', updates);

      expect(mockOrdersTable.select).toHaveBeenCalledWith({
        filterByFormula: "{Order ID} = 'PUP-abc123'"
      });
      expect(mockOrdersTable.update).toHaveBeenCalledWith('recABC123', updates);
      expect(result).toEqual({
        id: 'recABC123',
        fields: {
          'Order ID': 'PUP-abc123',
          'Status': 'shipped',
          'Customer Email': 'test@example.com',
          'Tracking URL': 'https://tracking.example.com/abc123'
        }
      });
    });

    it('returns null when order not found', async () => {
      const mockFirstPage = vi.fn().mockResolvedValue([]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn();

      const result = await client.updateOrder('PUP-notfound', { 'Status': 'shipped' });

      expect(result).toBeNull();
      expect(mockOrdersTable.update).not.toHaveBeenCalled();
    });

    it('updates Status field', async () => {
      const mockRecord = {
        id: 'recSTATUS',
        fields: {
          'Order ID': 'PUP-xyz789',
          'Status': 'pending'
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn().mockResolvedValue({});

      await client.updateOrder('PUP-xyz789', { 'Status': 'shipped' });

      expect(mockOrdersTable.update).toHaveBeenCalledWith('recSTATUS', {
        'Status': 'shipped'
      });
    });

    it('updates Tracking URL field', async () => {
      const mockRecord = {
        id: 'recTRACK',
        fields: {
          'Order ID': 'PUP-xyz789',
          'Status': 'pending'
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn().mockResolvedValue({});

      await client.updateOrder('PUP-xyz789', {
        'Tracking URL': 'https://tracking.example.com/xyz789'
      });

      expect(mockOrdersTable.update).toHaveBeenCalledWith('recTRACK', {
        'Tracking URL': 'https://tracking.example.com/xyz789'
      });
    });

    it('updates multiple fields at once', async () => {
      const mockRecord = {
        id: 'recMULTI',
        fields: {
          'Order ID': 'PUP-multi',
          'Status': 'pending'
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn().mockResolvedValue({});

      const updates = {
        'Status': 'shipped',
        'Tracking URL': 'https://tracking.example.com/multi'
      };

      await client.updateOrder('PUP-multi', updates);

      expect(mockOrdersTable.update).toHaveBeenCalledWith('recMULTI', updates);
    });

    it('uses findOrderById to locate the record', async () => {
      const mockRecord = {
        id: 'recFIND',
        fields: {
          'Order ID': 'PUP-find123',
          'Status': 'pending'
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn().mockResolvedValue({});

      await client.updateOrder('PUP-find123', { 'Status': 'shipped' });

      expect(mockOrdersTable.select).toHaveBeenCalledWith({
        filterByFormula: "{Order ID} = 'PUP-find123'"
      });
    });

    it('returns updated record with merged fields', async () => {
      const mockRecord = {
        id: 'recMERGE',
        fields: {
          'Order ID': 'PUP-merge',
          'Status': 'pending',
          'Customer Email': 'merge@example.com',
          'Total': 29.99
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockRecord]);
      mockOrdersTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockOrdersTable.update = vi.fn().mockResolvedValue({});

      const result = await client.updateOrder('PUP-merge', {
        'Status': 'shipped',
        'Tracking URL': 'https://tracking.example.com/merge'
      });

      expect(result.fields).toEqual({
        'Order ID': 'PUP-merge',
        'Status': 'shipped',
        'Customer Email': 'merge@example.com',
        'Total': 29.99,
        'Tracking URL': 'https://tracking.example.com/merge'
      });
    });
  });

  describe('mapOrderFields', () => {
    it('maps all fields to Airtable schema', () => {
      const orderData = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        customerName: 'Jane Smith',
        shippingAddress: '123 Main St',
        items: [{ description: 'Item 1', quantity: 1 }],
        total: 19.99
      };

      const mapped = client.mapOrderFields(orderData);

      expect(mapped).toMatchObject({
        'Order ID': 'PUP-abc123',
        'Stripe Session ID': 'cs_test_xyz789',
        'Customer Email': 'customer@example.com',
        'Customer Name': 'Jane Smith',
        'Shipping Address': '123 Main St',
        'Items': JSON.stringify(orderData.items),
        'Total': 19.99,
        'Status': 'pending'
      });
      expect(mapped['Created']).toBeDefined();
    });

    it('stringifies items array', () => {
      const items = [
        { description: 'Item 1', quantity: 1, price: 1000 },
        { description: 'Item 2', quantity: 2, price: 2000 }
      ];

      const mapped = client.mapOrderFields({
        orderId: 'PUP-test',
        sessionId: 'cs_test',
        customerEmail: 'test@example.com',
        items,
        total: 50.00
      });

      expect(mapped['Items']).toBe(JSON.stringify(items));
    });
  });

  describe('updateInventoryForOrder', () => {
    it('decrements inventory quantity for a single line item', async () => {
      const lineItems = [
        { description: 'Blue Waterproof Collar - Medium', quantity: 2 }
      ];

      const mockProduct = {
        id: 'recINV123',
        fields: {
          'Product': 'Blue Waterproof Collar - Medium',
          'Quantity': 10
        }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockProduct]);
      mockInventoryTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(mockInventoryTable.select).toHaveBeenCalledWith({
        filterByFormula: "{Product} = 'Blue Waterproof Collar - Medium'"
      });
      expect(mockInventoryTable.update).toHaveBeenCalledWith('recINV123', {
        'Quantity': 8
      });
    });

    it('handles multiple line items in a single order', async () => {
      const lineItems = [
        { description: 'Blue Waterproof Collar - Medium', quantity: 2 },
        { description: 'Red Leash - Large', quantity: 1 }
      ];

      const mockProduct1 = {
        id: 'recINV123',
        fields: { 'Product': 'Blue Waterproof Collar - Medium', 'Quantity': 10 }
      };

      const mockProduct2 = {
        id: 'recINV456',
        fields: { 'Product': 'Red Leash - Large', 'Quantity': 5 }
      };

      // Mock select for finding products and verification reads
      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct1])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([{ ...mockProduct1, fields: { ...mockProduct1.fields, 'Quantity': 8 } }])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct2])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([{ ...mockProduct2, fields: { ...mockProduct2.fields, 'Quantity': 4 } }])
        });

      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(mockInventoryTable.update).toHaveBeenCalledTimes(2);
      expect(mockInventoryTable.update).toHaveBeenNthCalledWith(1, 'recINV123', {
        'Quantity': 8
      });
      expect(mockInventoryTable.update).toHaveBeenNthCalledWith(2, 'recINV456', {
        'Quantity': 4
      });
    });

    it('logs warning when product not found in inventory', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const lineItems = [
        { description: 'Non-existent Product', quantity: 1 }
      ];

      const mockFirstPage = vi.fn().mockResolvedValue([]);
      mockInventoryTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      await client.updateInventoryForOrder(lineItems, 'PUP-xyz789');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Product not found in inventory: "Non-existent Product" for order PUP-xyz789'
      );
      expect(mockInventoryTable.update).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('continues processing remaining items when one product is not found', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const lineItems = [
        { description: 'Non-existent Product', quantity: 1 },
        { description: 'Blue Waterproof Collar - Medium', quantity: 2 }
      ];

      const mockProduct = {
        id: 'recINV123',
        fields: { 'Product': 'Blue Waterproof Collar - Medium', 'Quantity': 10 }
      };

      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct])
        });

      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-xyz789');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Product not found in inventory: "Non-existent Product" for order PUP-xyz789'
      );
      expect(mockInventoryTable.update).toHaveBeenCalledWith('recINV123', {
        'Quantity': 8
      });

      consoleWarnSpy.mockRestore();
    });

    it('logs warning when update fails but continues processing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const lineItems = [
        { description: 'Blue Waterproof Collar - Medium', quantity: 2 },
        { description: 'Red Leash - Large', quantity: 1 }
      ];

      const mockProduct1 = {
        id: 'recINV123',
        fields: { 'Product': 'Blue Waterproof Collar - Medium', 'Quantity': 10 }
      };

      const mockProduct2 = {
        id: 'recINV456',
        fields: { 'Product': 'Red Leash - Large', 'Quantity': 5 }
      };

      // Mock selects for finding products and verification reads
      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct1])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct1])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct1])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct2])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([{ ...mockProduct2, fields: { ...mockProduct2.fields, 'Quantity': 4 } }])
        });

      mockInventoryTable.update
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to update inventory for product "Blue Waterproof Collar - Medium" in order PUP-abc123 (attempt 1/3):',
        'Network error'
      );
      expect(mockInventoryTable.update).toHaveBeenCalledTimes(4);

      consoleWarnSpy.mockRestore();
    });

    it('matches products by exact description', async () => {
      const lineItems = [
        { description: 'Blue Waterproof Collar - Medium', quantity: 1 }
      ];

      const mockProduct = {
        id: 'recINV123',
        fields: { 'Product': 'Blue Waterproof Collar - Medium', 'Quantity': 10 }
      };

      const mockFirstPage = vi.fn().mockResolvedValue([mockProduct]);
      mockInventoryTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(mockInventoryTable.select).toHaveBeenCalledWith({
        filterByFormula: "{Product} = 'Blue Waterproof Collar - Medium'"
      });
    });

    it('handles zero initial quantity', async () => {
      const lineItems = [
        { description: 'Blue Waterproof Collar - Medium', quantity: 2 }
      ];

      const mockProduct = {
        id: 'recINV123',
        fields: {
          'Product': 'Blue Waterproof Collar - Medium',
          'Quantity': 0
        }
      };

      // Mock both the initial select and the verification select
      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([{ ...mockProduct, fields: { ...mockProduct.fields, 'Quantity': 0 } }])
        });
      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      // Math.max(0, 0 - 2) = 0 (prevents negative quantities)
      expect(mockInventoryTable.update).toHaveBeenCalledWith('recINV123', {
        'Quantity': 0
      });
    });

    it('handles missing Quantity field', async () => {
      const lineItems = [
        { description: 'Blue Waterproof Collar - Medium', quantity: 2 }
      ];

      const mockProduct = {
        id: 'recINV123',
        fields: {
          'Product': 'Blue Waterproof Collar - Medium'
        }
      };

      // Mock both the initial select and the verification select
      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([{ ...mockProduct, fields: { ...mockProduct.fields, 'Quantity': 0 } }])
        });
      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      // Undefined Quantity treated as 0: Math.max(0, 0 - 2) = 0
      expect(mockInventoryTable.update).toHaveBeenCalledWith('recINV123', {
        'Quantity': 0
      });
    });
  });

  describe('buildFieldEqualsFilter', () => {
    it('builds basic filter formula for field equality', () => {
      const formula = client.buildFieldEqualsFilter('Order ID', 'PUP-abc123');

      expect(formula).toBe("{Order ID} = 'PUP-abc123'");
    });

    it('escapes single quotes to prevent formula injection', () => {
      const formula = client.buildFieldEqualsFilter('Order ID', "PUP-abc'; DELETE FROM Orders; --");

      // Verify single quotes are escaped
      expect(formula).toBe("{Order ID} = 'PUP-abc\\'; DELETE FROM Orders; --'");
      // Verify the injection payload is neutralized (the quote is escaped)
      expect(formula).toContain("\\'");
      // The entire payload should be treated as a literal string value, not executable code
    });

    it('handles values with multiple single quotes', () => {
      const formula = client.buildFieldEqualsFilter('Customer Name', "O'Brien's Pet's Store");

      expect(formula).toBe("{Customer Name} = 'O\\'Brien\\'s Pet\\'s Store'");
    });

    it('preserves other special characters that are safe', () => {
      const formula = client.buildFieldEqualsFilter('Email', 'test+tag@example.com');

      expect(formula).toBe("{Email} = 'test+tag@example.com'");
    });
  });
});
