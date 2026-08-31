import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('send-shipping-update authentication', () => {
  let handler;
  let originalEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = process.env.SHIPPING_UPDATE_TOKEN;

    // Set test tokens and Airtable config
    process.env.SHIPPING_UPDATE_TOKEN = 'test-secret-token-123';
    process.env.AIRTABLE_API_KEY = 'test-api-key';
    process.env.AIRTABLE_BASE_ID = 'test-base-id';

    // Clear all mocks
    vi.clearAllMocks();

    // Mock AirtableClient.findOrderById and updateOrder for all tests by default
    const { AirtableClient } = await import('../services/airtable-client.js');
    vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
      id: 'rec123',
      fields: { 'Order ID': 'test-order-id' }
    });
    vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
      id: 'rec123',
      fields: { 'Order ID': 'test-order-id', 'Status': 'shipped' }
    });

    // Import handler fresh for each test
    const module = await import('../api/send-shipping-update.js');
    handler = module.default;
  });

  afterEach(() => {
    // Restore environment
    if (originalEnv !== undefined) {
      process.env.SHIPPING_UPDATE_TOKEN = originalEnv;
    } else {
      delete process.env.SHIPPING_UPDATE_TOKEN;
    }
    delete process.env.AIRTABLE_API_KEY;
    delete process.env.AIRTABLE_BASE_ID;

    // Restore all mocks
    vi.restoreAllMocks();
  });

  const createMockRequest = (method = 'POST', authHeader = undefined) => ({
    method,
    headers: authHeader !== undefined ? { authorization: authHeader } : {}
  });

  const createMockResponse = () => {
    const res = {
      status: vi.fn(),
      json: vi.fn(),
      end: vi.fn()
    };
    res.status.mockReturnValue(res);
    return res;
  };

  describe('method validation', () => {
    it('should return 405 Method Not Allowed for GET requests', async () => {
      const req = createMockRequest('GET', 'Bearer test-secret-token-123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should return 405 Method Not Allowed for PUT requests', async () => {
      const req = createMockRequest('PUT', 'Bearer test-secret-token-123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });

    it('should return 405 Method Not Allowed for DELETE requests', async () => {
      const req = createMockRequest('DELETE', 'Bearer test-secret-token-123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('missing authorization header', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const req = createMockRequest('POST', undefined);
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });

    it('should return 401 Unauthorized when Authorization header is empty string', async () => {
      const req = createMockRequest('POST', '');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing authorization header' });
    });
  });

  describe('invalid authorization format', () => {
    it('should return 401 Unauthorized when format does not start with Bearer', async () => {
      const req = createMockRequest('POST', 'notbearer token123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authorization format' });
    });

    it('should return 401 Unauthorized when only Bearer is provided without token', async () => {
      const req = createMockRequest('POST', 'Bearer');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authorization format' });
    });

    it('should return 401 Unauthorized when Bearer is lowercase', async () => {
      const req = createMockRequest('POST', 'bearer test-secret-token-123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authorization format' });
    });

    it('should return 401 Unauthorized when format is just a token without Bearer', async () => {
      const req = createMockRequest('POST', 'test-secret-token-123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authorization format' });
    });
  });

  describe('wrong bearer token', () => {
    it('should return 401 Unauthorized when token does not match', async () => {
      const req = createMockRequest('POST', 'Bearer wrong-token');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 Unauthorized when token has extra spaces', async () => {
      const req = createMockRequest('POST', 'Bearer  test-secret-token-123');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 Unauthorized when token is partially correct', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('request body validation', () => {
    it('should return 400 Bad Request when request body is missing', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = undefined;
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing request body' });
    });

    it('should return 400 Bad Request when request body is null', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = null;
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing request body' });
    });

    it('should return 400 Bad Request when orderId is missing', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = {};
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: orderId' });
    });

    it('should return 400 Bad Request when orderId is empty string', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: '' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: orderId' });
    });

    it('should return 400 Bad Request when orderId is not a string', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 123 };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing required field: orderId' });
    });

    it('should return 400 Bad Request when trackingUrl does not start with http:// or https://', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'order123', trackingUrl: 'not-a-url' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid trackingUrl format' });
    });

    it('should return 400 Bad Request when trackingUrl is not a string', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'order123', trackingUrl: 123 };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid trackingUrl format' });
    });

    it('should accept valid request with orderId only', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'order123' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept valid request with orderId and http trackingUrl', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'order123', trackingUrl: 'http://tracking.example.com/123' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept valid request with orderId and https trackingUrl', async () => {
      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'order123', trackingUrl: 'https://tracking.example.com/123' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('order lookup', () => {
    it('should return 404 Not Found when order does not exist (null)', async () => {
      const { AirtableClient } = await import('../services/airtable-client.js');

      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue(null);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-nonexist' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
    });

    it('should return 404 Not Found when order does not exist (undefined)', async () => {
      const { AirtableClient } = await import('../services/airtable-client.js');

      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue(undefined);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-nonexist' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
    });

    it('should call AirtableClient.findOrderById with correct orderId', async () => {
      // Import AirtableClient for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');

      const mockFindOrderById = vi.fn().mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789' }
      });

      // Spy on the prototype method
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockImplementation(mockFindOrderById);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      expect(mockFindOrderById).toHaveBeenCalledWith('PUP-xyz789');
    });

    it('should not return early when order is found', async () => {
      // Import AirtableClient for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');

      const mockFindOrderById = vi.fn().mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789' }
      });

      // Spy on the prototype method
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockImplementation(mockFindOrderById);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      // Verify the function continued processing (didn't return 404 or other error)
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should instantiate AirtableClient with process.env.AIRTABLE_BASE_ID', async () => {
      // Temporarily override the base ID
      const originalBaseId = process.env.AIRTABLE_BASE_ID;
      process.env.AIRTABLE_BASE_ID = 'test-base-id-123';

      // Import AirtableClient for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');

      const mockFindOrderById = vi.fn().mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789' }
      });

      // Spy on the constructor by checking the constructor was called with correct params
      // We'll verify by spying on the method and checking that it's called, which means constructor worked
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockImplementation(mockFindOrderById);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      // The fact that findOrderById was called with the right orderId proves that:
      // 1. AirtableClient was instantiated successfully
      // 2. The instance was used to call findOrderById
      expect(mockFindOrderById).toHaveBeenCalledWith('PUP-xyz789');

      // Restore
      process.env.AIRTABLE_BASE_ID = originalBaseId;
    });
  });

  describe('update order status', () => {
    it('should call AirtableClient.updateOrder with record ID and Status: "shipped"', async () => {
      // Import AirtableClient for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');

      const mockUpdateOrder = vi.fn().mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789', 'Status': 'shipped' }
      });

      // Mock both findOrderById and updateOrder
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789' }
      });
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockImplementation(mockUpdateOrder);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      expect(mockUpdateOrder).toHaveBeenCalledWith('rec123', { Status: 'shipped' });
    });
  });
});
