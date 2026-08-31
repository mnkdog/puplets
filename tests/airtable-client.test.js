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
      const orderData = {
        orderId: 'PUP-abc123',
        sessionId: 'cs_test_xyz789',
        customerEmail: 'customer@example.com',
        total: 19.99
      };

      const beforeCreate = new Date().toISOString();

      mockOrdersTable.create.mockResolvedValue([{
        id: 'recTIME',
        fields: {}
      }]);

      await client.createOrder(orderData);

      const callArgs = mockOrdersTable.create.mock.calls[0][0][0].fields;
      const afterCreate = new Date().toISOString();

      expect(callArgs['Created']).toBeDefined();
      expect(callArgs['Created']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(callArgs['Created'] >= beforeCreate).toBe(true);
      expect(callArgs['Created'] <= afterCreate).toBe(true);
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

      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct1])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct2])
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

      mockInventoryTable.select
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct1])
        })
        .mockReturnValueOnce({
          firstPage: vi.fn().mockResolvedValue([mockProduct2])
        });

      mockInventoryTable.update
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to update inventory for product "Blue Waterproof Collar - Medium" in order PUP-abc123:',
        'Network error'
      );
      expect(mockInventoryTable.update).toHaveBeenCalledTimes(2);

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

      const mockFirstPage = vi.fn().mockResolvedValue([mockProduct]);
      mockInventoryTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(mockInventoryTable.update).toHaveBeenCalledWith('recINV123', {
        'Quantity': -2
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

      const mockFirstPage = vi.fn().mockResolvedValue([mockProduct]);
      mockInventoryTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });
      mockInventoryTable.update.mockResolvedValue({});

      await client.updateInventoryForOrder(lineItems, 'PUP-abc123');

      expect(mockInventoryTable.update).toHaveBeenCalledWith('recINV123', {
        'Quantity': -2
      });
    });
  });
});
