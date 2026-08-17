import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Stripe before importing the handler
const mockCheckoutSessions = {
  create: vi.fn()
};

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      constructor() {
        this.checkout = {
          sessions: mockCheckoutSessions
        };
      }
    }
  };
});

// Mock catalog functions
vi.mock('../api/catalog.js', () => ({
  calculateCollarPrice: vi.fn(() => 15.99),
  calculateCharmPrice: vi.fn(() => 4.99)
}));

describe('create-checkout-session origin validation', () => {
  let handler;
  let originalEnv;

  beforeEach(async () => {
    // Reset environment
    originalEnv = process.env.ALLOWED_ORIGINS;

    // Clear all mocks
    vi.clearAllMocks();

    // Re-import handler fresh for each test
    const module = await import('../api/create-checkout-session.js');
    handler = module.default;
  });

  afterEach(() => {
    // Restore environment
    if (originalEnv !== undefined) {
      process.env.ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  const createMockRequest = (origin, method = 'POST', body = { items: [] }) => ({
    method,
    headers: {
      origin
    },
    body
  });

  const createMockResponse = () => {
    const res = {
      setHeader: vi.fn(),
      status: vi.fn(),
      json: vi.fn(),
      end: vi.fn()
    };
    res.status.mockReturnValue(res);
    return res;
  };

  describe('allowed origin validation', () => {
    it('should accept request from allowed origin and set correct CORS headers', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test'
      });
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets.vercel.app');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should accept request from second allowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app,https://puplets-staging.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets-staging.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets-staging.vercel.app');
    });

    it('should handle ALLOWED_ORIGINS with whitespace', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app, https://puplets-staging.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_789',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets-staging.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('disallowed origin rejection', () => {
    it('should reject request from disallowed origin with 403', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest('https://evil-site.com', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
      });
      expect(mockCheckoutSessions.create).not.toHaveBeenCalled();
    });

    it('should reject request with missing origin header', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest(undefined, 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
      });
      expect(mockCheckoutSessions.create).not.toHaveBeenCalled();
    });

    it('should reject request with null origin header', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest(null, 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
      });
    });

    it('should reject request with empty string origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest('', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
      });
    });
  });

  describe('malformed ALLOWED_ORIGINS handling', () => {
    it('should return 500 when ALLOWED_ORIGINS is undefined', async () => {
      delete process.env.ALLOWED_ORIGINS;

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
      expect(mockCheckoutSessions.create).not.toHaveBeenCalled();
    });

    it('should return 500 when ALLOWED_ORIGINS is empty string', async () => {
      process.env.ALLOWED_ORIGINS = '';

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
    });

    it('should return 500 when ALLOWED_ORIGINS is whitespace only', async () => {
      process.env.ALLOWED_ORIGINS = '   ';

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
    });

    it('should return 500 when ALLOWED_ORIGINS is malformed (no protocol)', async () => {
      process.env.ALLOWED_ORIGINS = 'puplets.vercel.app';

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
    });

    it('should log security alert when ALLOWED_ORIGINS is malformed', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      process.env.ALLOWED_ORIGINS = '';

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY ALERT] ALLOWED_ORIGINS not configured or malformed'),
        expect.any(String)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('OPTIONS preflight handling', () => {
    it('should handle OPTIONS request from allowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest('https://puplets.vercel.app', 'OPTIONS');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets.vercel.app');
      expect(mockCheckoutSessions.create).not.toHaveBeenCalled();
    });

    it('should reject OPTIONS request from disallowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest('https://evil-site.com', 'OPTIONS');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
      });
    });
  });

  describe('existing functionality preservation', () => {
    it('should still validate cart items after origin check', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: []
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'No items provided'
      });
    });

    it('should still reject non-POST methods after origin check', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const req = createMockRequest('https://puplets.vercel.app', 'GET');
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Method not allowed'
      });
    });
  });
});
