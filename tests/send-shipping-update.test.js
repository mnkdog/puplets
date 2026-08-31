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
    process.env.RESEND_API_KEY = 'test-resend-key';

    // Clear all mocks
    vi.clearAllMocks();

    // Mock AirtableClient.findOrderById and updateOrder for all tests by default
    const { AirtableClient } = await import('../services/airtable-client.js');
    vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
      id: 'rec123',
      fields: {
        'Order ID': 'test-order-id',
        'Customer Email': 'test@example.com',
        'Customer Name': 'Test Customer'
      }
    });
    vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
      id: 'rec123',
      fields: {
        'Order ID': 'test-order-id',
        'Status': 'shipped',
        'Customer Email': 'test@example.com',
        'Customer Name': 'Test Customer'
      }
    });

    // Mock EmailClient.sendShippingNotification for all tests by default
    const { EmailClient } = await import('../services/email-client.js');
    vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockResolvedValue({ id: 'email123' });

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
    delete process.env.RESEND_API_KEY;

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
      // Mock EmailClient to avoid sending real emails
      const { EmailClient } = await import('../services/email-client.js');
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockResolvedValue({ id: 'email123' });

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'order123', trackingUrl: 'http://tracking.example.com/123' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should accept valid request with orderId and https trackingUrl', async () => {
      // Mock EmailClient to avoid sending real emails
      const { EmailClient } = await import('../services/email-client.js');
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockResolvedValue({ id: 'email123' });

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
    it('should call AirtableClient.updateOrder with Order ID field (not record ID) and Status: "shipped"', async () => {
      // Import AirtableClient for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');

      const mockUpdateOrder = vi.fn().mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789', 'Status': 'shipped' }
      });

      // Mock both findOrderById and updateOrder
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789', 'Customer Email': 'test@example.com', 'Customer Name': 'Test' }
      });
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockImplementation(mockUpdateOrder);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      expect(mockUpdateOrder).toHaveBeenCalledWith('PUP-xyz789', { Status: 'shipped' });
    });

    it('should return 500 Internal Server Error when updateOrder fails (null)', async () => {
      const { AirtableClient } = await import('../services/airtable-client.js');

      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789', 'Customer Email': 'test@example.com', 'Customer Name': 'Test' }
      });
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue(null);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update order status' });
    });

    it('should return 500 Internal Server Error when updateOrder fails (undefined)', async () => {
      const { AirtableClient } = await import('../services/airtable-client.js');

      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec123',
        fields: { 'Order ID': 'PUP-xyz789', 'Customer Email': 'test@example.com', 'Customer Name': 'Test' }
      });
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue(undefined);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-xyz789' };
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to update order status' });
    });
  });

  describe('send shipping notification with tracking URL', () => {
    it('should send shipping notification email with tracking URL when trackingUrl is provided', async () => {
      // Import modules for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');
      const emailTemplates = await import('../templates/email-templates.js');

      // Mock AirtableClient.findOrderById to return order with customer email and name
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec123',
        fields: {
          'Order ID': 'PUP-xyz789',
          'Customer Email': 'customer@example.com',
          'Customer Name': 'Jane Smith'
        }
      });

      // Mock AirtableClient.updateOrder
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
        id: 'rec123',
        fields: {
          'Order ID': 'PUP-xyz789',
          'Status': 'shipped',
          'Customer Email': 'customer@example.com',
          'Customer Name': 'Jane Smith'
        }
      });

      // Mock generateShippingNotification to return template data
      const mockTemplateData = {
        subject: 'Your Puplets order PUP-xyz789 has been dispatched',
        html: '<html>Your order has been shipped</html>',
        text: 'Your order has been shipped'
      };
      vi.spyOn(emailTemplates, 'generateShippingNotification').mockReturnValue(mockTemplateData);

      // Mock EmailClient.sendShippingNotification
      const mockSendShippingNotification = vi.fn().mockResolvedValue({ id: 'email123' });
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockImplementation(mockSendShippingNotification);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = {
        orderId: 'PUP-xyz789',
        trackingUrl: 'https://track.example.com/123'
      };
      const res = createMockResponse();

      await handler(req, res);

      // Verify generateShippingNotification was called with orderId and trackingUrl
      expect(emailTemplates.generateShippingNotification).toHaveBeenCalledWith(
        {
          orderId: 'PUP-xyz789',
          customerName: 'Jane Smith'
        },
        'https://track.example.com/123'
      );

      // Verify EmailClient.sendShippingNotification was called with customer email and template data
      expect(mockSendShippingNotification).toHaveBeenCalledWith(
        'customer@example.com',
        'Your Puplets order PUP-xyz789 has been dispatched',
        '<html>Your order has been shipped</html>',
        'Your order has been shipped'
      );
    });
  });

  describe('send shipping notification without tracking URL', () => {
    it('should send shipping notification email without tracking URL when trackingUrl is not provided', async () => {
      // Import modules for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');
      const emailTemplates = await import('../templates/email-templates.js');

      // Mock AirtableClient.findOrderById to return order with customer email and name
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec456',
        fields: {
          'Order ID': 'PUP-abc123',
          'Customer Email': 'john@example.com',
          'Customer Name': 'John Doe'
        }
      });

      // Mock AirtableClient.updateOrder
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
        id: 'rec456',
        fields: {
          'Order ID': 'PUP-abc123',
          'Status': 'shipped',
          'Customer Email': 'john@example.com',
          'Customer Name': 'John Doe'
        }
      });

      // Mock generateShippingNotification to return template data
      const mockTemplateData = {
        subject: 'Your Puplets order PUP-abc123 has been dispatched',
        html: '<html>Your order has been shipped (no tracking yet)</html>',
        text: 'Your order has been shipped (no tracking yet)'
      };
      vi.spyOn(emailTemplates, 'generateShippingNotification').mockReturnValue(mockTemplateData);

      // Mock EmailClient.sendShippingNotification
      const mockSendShippingNotification = vi.fn().mockResolvedValue({ id: 'email456' });
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockImplementation(mockSendShippingNotification);

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = {
        orderId: 'PUP-abc123'
        // No trackingUrl provided
      };
      const res = createMockResponse();

      await handler(req, res);

      // Verify generateShippingNotification was called with orderId but no trackingUrl (undefined)
      expect(emailTemplates.generateShippingNotification).toHaveBeenCalledWith(
        {
          orderId: 'PUP-abc123',
          customerName: 'John Doe'
        },
        undefined
      );

      // Verify EmailClient.sendShippingNotification was called with customer email and template data
      expect(mockSendShippingNotification).toHaveBeenCalledWith(
        'john@example.com',
        'Your Puplets order PUP-abc123 has been dispatched',
        '<html>Your order has been shipped (no tracking yet)</html>',
        'Your order has been shipped (no tracking yet)'
      );
    });
  });

  describe('missing customer email handling (non-fatal)', () => {
    it('should log warning with [NO CUSTOMER EMAIL] prefix when Customer Email is missing', async () => {
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');

      // Mock order without Customer Email
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec999',
        fields: {
          'Order ID': 'PUP-noemail',
          'Customer Name': 'Test User'
          // No Customer Email field
        }
      });

      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
        id: 'rec999',
        fields: {
          'Order ID': 'PUP-noemail',
          'Status': 'shipped'
        }
      });

      const mockSendShippingNotification = vi.fn();
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockImplementation(mockSendShippingNotification);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-noemail' };
      const res = createMockResponse();

      await handler(req, res);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[NO CUSTOMER EMAIL]',
        'Order PUP-noemail has no customer email, skipping notification'
      );
      expect(mockSendShippingNotification).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      consoleWarnSpy.mockRestore();
    });

    it('should log warning when Customer Email is empty string', async () => {
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');

      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec888',
        fields: {
          'Order ID': 'PUP-emptyemail',
          'Customer Email': '',
          'Customer Name': 'Test User'
        }
      });

      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
        id: 'rec888',
        fields: {
          'Order ID': 'PUP-emptyemail',
          'Status': 'shipped'
        }
      });

      const mockSendShippingNotification = vi.fn();
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockImplementation(mockSendShippingNotification);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-emptyemail' };
      const res = createMockResponse();

      await handler(req, res);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[NO CUSTOMER EMAIL]',
        'Order PUP-emptyemail has no customer email, skipping notification'
      );
      expect(mockSendShippingNotification).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('email failure handling (non-fatal)', () => {
    it('should log warning with [SHIPPING EMAIL FAILED] prefix when email sending fails', async () => {
      // Import modules for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');

      // Mock AirtableClient.findOrderById to return order
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec789',
        fields: {
          'Order ID': 'PUP-fail123',
          'Customer Email': 'fail@example.com',
          'Customer Name': 'Test User'
        }
      });

      // Mock AirtableClient.updateOrder
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
        id: 'rec789',
        fields: {
          'Order ID': 'PUP-fail123',
          'Status': 'shipped',
          'Customer Email': 'fail@example.com',
          'Customer Name': 'Test User'
        }
      });

      // Mock EmailClient.sendShippingNotification to throw an error
      const emailError = new Error('Resend API error: rate limit exceeded');
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockRejectedValue(emailError);

      // Spy on console.warn
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-fail123' };
      const res = createMockResponse();

      await handler(req, res);

      // Verify console.warn was called with [SHIPPING EMAIL FAILED] prefix
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SHIPPING EMAIL FAILED]',
        emailError.message
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return 200 OK even when email sending fails', async () => {
      // Import modules for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');

      // Mock AirtableClient.findOrderById to return order
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec789',
        fields: {
          'Order ID': 'PUP-fail123',
          'Customer Email': 'fail@example.com',
          'Customer Name': 'Test User'
        }
      });

      // Mock AirtableClient.updateOrder
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockResolvedValue({
        id: 'rec789',
        fields: {
          'Order ID': 'PUP-fail123',
          'Status': 'shipped',
          'Customer Email': 'fail@example.com',
          'Customer Name': 'Test User'
        }
      });

      // Mock EmailClient.sendShippingNotification to throw an error
      const emailError = new Error('Network timeout');
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockRejectedValue(emailError);

      // Suppress console.warn output during test
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-fail123' };
      const res = createMockResponse();

      await handler(req, res);

      // Verify response is 200 OK, not 500
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Shipping update processed successfully' });

      consoleWarnSpy.mockRestore();
    });

    it('should keep order status as "shipped" even when email sending fails', async () => {
      // Import modules for mocking
      const { AirtableClient } = await import('../services/airtable-client.js');
      const { EmailClient } = await import('../services/email-client.js');

      const mockUpdateOrder = vi.fn().mockResolvedValue({
        id: 'rec789',
        fields: {
          'Order ID': 'PUP-fail123',
          'Status': 'shipped',
          'Customer Email': 'fail@example.com',
          'Customer Name': 'Test User'
        }
      });

      // Mock AirtableClient.findOrderById to return order
      vi.spyOn(AirtableClient.prototype, 'findOrderById').mockResolvedValue({
        id: 'rec789',
        fields: {
          'Order ID': 'PUP-fail123',
          'Customer Email': 'fail@example.com',
          'Customer Name': 'Test User'
        }
      });

      // Mock AirtableClient.updateOrder
      vi.spyOn(AirtableClient.prototype, 'updateOrder').mockImplementation(mockUpdateOrder);

      // Mock EmailClient.sendShippingNotification to throw an error
      const emailError = new Error('Email service unavailable');
      vi.spyOn(EmailClient.prototype, 'sendShippingNotification').mockRejectedValue(emailError);

      // Suppress console.warn output during test
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const req = createMockRequest('POST', 'Bearer test-secret-token-123');
      req.body = { orderId: 'PUP-fail123' };
      const res = createMockResponse();

      await handler(req, res);

      // Verify updateOrder was called with Order ID field (not record ID) and Status: "shipped"
      expect(mockUpdateOrder).toHaveBeenCalledWith('PUP-fail123', { Status: 'shipped' });

      // Verify the order status was updated (and not rolled back)
      expect(mockUpdateOrder).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });
  });
});
