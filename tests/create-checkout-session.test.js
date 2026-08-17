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

// Mock catalog functions and constants
vi.mock('../api/catalog.js', () => ({
  CATALOG: {
    collar: {
      basePrice: 17.99,
      sizes: { xs: 17.99, s: 17.99, m: 20.99 }
    },
    charm: { price: 3.99 }
  },
  calculateCollarPrice: vi.fn((size, extraCharms = 0) => {
    const prices = { xs: 17.99, s: 17.99, m: 20.99, medium: 20.99 };
    const basePrice = prices[size] || 17.99;
    return basePrice + (extraCharms * 3.99);
  }),
  calculateCharmPrice: vi.fn((quantity = 1) => 3.99 * quantity)
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

    it('should accept request from wildcard-matched preview deployment', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app,https://puplets-*.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_preview_123',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets-pr-456.vercel.app', 'POST', {
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
      expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets-pr-456.vercel.app');
    });

    it('should reject request that does not match wildcard pattern', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets-*.vercel.app';

      const req = createMockRequest('https://evil-*.vercel.app', 'POST', {
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

    it('should return 403 when ALLOWED_ORIGINS is empty string', async () => {
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

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
      });
    });

    it('should return 403 when ALLOWED_ORIGINS is whitespace only', async () => {
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

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'This request cannot be completed. Please contact support.'
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
      process.env.ALLOWED_ORIGINS = 'puplets.vercel.app'; // Missing protocol - truly malformed

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

  describe('redirect URL validation', () => {
    it('should use validated origin for success_url and cancel_url', async () => {
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
      expect(mockCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://puplets.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://puplets.vercel.app/cart.html?cancelled=true'
        })
      );
    });

    it('should prevent open redirect by using validated origin only', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'medium',
          color: 'red',
          colorName: 'Red'
        }],
        // Attacker tries to inject malicious success_url
        success_url: 'https://evil-site.com/success'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify the Stripe session creation was called
      const createCall = mockCheckoutSessions.create.mock.calls[0][0];

      // success_url must use validated origin, not the user-supplied one
      expect(createCall.success_url).toBe('https://puplets.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}');
      expect(createCall.success_url).not.toContain('evil-site.com');

      // cancel_url must also use validated origin
      expect(createCall.cancel_url).toBe('https://puplets.vercel.app/cart.html?cancelled=true');
      expect(createCall.cancel_url).not.toContain('evil-site.com');
    });

    it('should use different validated origin when request comes from staging', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app,https://puplets-staging.vercel.app';

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
      expect(mockCheckoutSessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://puplets-staging.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://puplets-staging.vercel.app/cart.html?cancelled=true'
        })
      );
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

    it('should reject charm item missing charm identifier', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'charm',
          quantity: 1
          // Missing both charm and charmName
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      // Verify server logs contain the validation error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Stripe session creation error:',
        expect.any(Error)
      );

      const loggedError = consoleErrorSpy.mock.calls[0][1];
      expect(loggedError.message).toContain('missing required field');

      consoleErrorSpy.mockRestore();
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

  describe('error response security', () => {
    it('should not leak error details when Stripe API fails', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock Stripe to simulate API failure
      const stripeError = new Error('Invalid API key provided');
      stripeError.stack = 'Error: Invalid API key provided\n    at /node_modules/stripe/lib/Error.js:14:15';
      mockCheckoutSessions.create.mockRejectedValue(stripeError);

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

      const responseBody = res.json.mock.calls[0][0];

      // Verify response contains generic error message
      expect(responseBody.error).toBe('Failed to create checkout session');

      // Verify response does NOT contain sensitive details
      expect(responseBody.details).toBeUndefined();
      expect(JSON.stringify(responseBody)).not.toContain('Invalid API key');
      expect(JSON.stringify(responseBody)).not.toContain('node_modules');
      expect(JSON.stringify(responseBody)).not.toContain('/stripe/lib/');
      expect(JSON.stringify(responseBody)).not.toContain('Error.js');

      // Verify server logs still contain full error details
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Stripe session creation error:',
        stripeError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not leak error details when network error occurs', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate network error
      const networkError = new Error('Network request failed');
      networkError.stack = 'Error: Network request failed\n    at fetch (/app/node_modules/node-fetch/lib/index.js:50:10)';
      mockCheckoutSessions.create.mockRejectedValue(networkError);

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

      const responseBody = res.json.mock.calls[0][0];

      // Verify response contains only generic error
      expect(responseBody).toEqual({
        error: 'Failed to create checkout session'
      });

      // Verify no stack trace or internal paths leaked
      expect(JSON.stringify(responseBody)).not.toContain('node_modules');
      expect(JSON.stringify(responseBody)).not.toContain('node-fetch');
      expect(JSON.stringify(responseBody)).not.toContain('/app/');
      expect(JSON.stringify(responseBody)).not.toContain('fetch (');

      // Verify server logs have full details
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Stripe session creation error:',
        networkError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not leak error details when malformed item causes exception', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock doesn't matter - the error will be thrown during processing
      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'unknown-type',
          // This will trigger "Unknown item type" validation error in the handler
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      // Validation errors return 400 (not 500)
      expect(res.status).toHaveBeenCalledWith(400);

      const responseBody = res.json.mock.calls[0][0];

      // Verify response contains only generic error
      expect(responseBody).toEqual({
        error: 'Failed to create checkout session'
      });

      // Verify no internal error message leaked
      expect(JSON.stringify(responseBody)).not.toContain('Unknown item type');
      expect(JSON.stringify(responseBody)).not.toContain('unknown-type');

      // Verify server logs contain the real error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Stripe session creation error:',
        expect.any(Error)
      );

      const loggedError = consoleErrorSpy.mock.calls[0][1];
      expect(loggedError.message).toContain('Unknown item type');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('price manipulation security', () => {
    it('should reject collar with negative extraCharms length (price manipulation attempt)', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Attack: extraCharms as object with negative length to lower price
      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'm',
          color: 'red',
          colorName: 'Red',
          extraCharms: { length: -4 }  // Attack: fake Array.length
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Failed to create checkout session'
      });

      consoleErrorSpy.mockRestore();
    });

    it('should correctly handle valid array extraCharms', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_charms',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 'm',
          color: 'red',
          colorName: 'Red',
          extraCharms: ['charm1', 'charm2']  // Valid array with 2 charms
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify price calculation: m = £20.99 + 2*£3.99 = £28.97 = 2897 pence
      const session = mockCheckoutSessions.create.mock.calls[0][0];
      expect(session.line_items[0].price_data.unit_amount).toBe(2897);
    });

    it('should handle missing extraCharms as zero count', async () => {
      process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app';

      mockCheckoutSessions.create.mockResolvedValue({
        id: 'cs_test_no_charms',
        url: 'https://checkout.stripe.com/test'
      });

      const req = createMockRequest('https://puplets.vercel.app', 'POST', {
        items: [{
          type: 'collar',
          size: 's',
          color: 'red',
          colorName: 'Red'
          // No extraCharms field
        }]
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);

      // Verify price calculation: s = £17.99 + 0*£3.99 = £17.99 = 1799 pence
      const session = mockCheckoutSessions.create.mock.calls[0][0];
      expect(session.line_items[0].price_data.unit_amount).toBe(1799);
    });
  });
});
