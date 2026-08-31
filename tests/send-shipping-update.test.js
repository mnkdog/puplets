import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('send-shipping-update authentication', () => {
  let handler;
  let originalEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = process.env.SHIPPING_UPDATE_TOKEN;

    // Set test token
    process.env.SHIPPING_UPDATE_TOKEN = 'test-secret-token-123';

    // Clear all mocks
    vi.clearAllMocks();

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
});
