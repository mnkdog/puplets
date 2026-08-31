import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AirtableClient } from '../services/airtable-client.js';

// Create mock table object
const mockTable = {
  create: vi.fn(),
  select: vi.fn()
};

// Create a function that returns mockTable when called (this represents the base)
const mockBaseInstance = vi.fn(() => mockTable);

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
    mockTable.create.mockReset();
    mockTable.select.mockReset();
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

      mockTable.create.mockResolvedValue([mockRecord]);

      const result = await client.createOrder(orderData);

      // Verify create was called
      expect(mockTable.create).toHaveBeenCalledWith([
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

      mockTable.create.mockResolvedValue([{
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

      mockTable.create.mockResolvedValue([{
        id: 'recMIN123',
        fields: {}
      }]);

      await client.createOrder(minimalOrder);

      const callArgs = mockTable.create.mock.calls[0][0][0].fields;
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

      mockTable.create.mockResolvedValue([{
        id: 'recSTATUS',
        fields: { 'Status': 'pending' }
      }]);

      await client.createOrder(orderData);

      const callArgs = mockTable.create.mock.calls[0][0][0].fields;
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

      mockTable.create.mockResolvedValue([{
        id: 'recTIME',
        fields: {}
      }]);

      await client.createOrder(orderData);

      const callArgs = mockTable.create.mock.calls[0][0][0].fields;
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
      mockTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderBySessionId('cs_test_xyz789');

      expect(mockTable.select).toHaveBeenCalledWith({
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
      mockTable.select.mockReturnValue({
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
      mockTable.select.mockReturnValue({
        firstPage: mockFirstPage
      });

      const result = await client.findOrderBySessionId('cs_test_duplicate');

      expect(result.id).toBe('recFirst');
      expect(result.fields['Order ID']).toBe('PUP-first');
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
});
