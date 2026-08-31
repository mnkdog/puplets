import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Stripe webhooks using vi.hoisted to ensure proper initialization
const { mockWebhooks } = vi.hoisted(() => {
  return {
    mockWebhooks: {
      constructEvent: vi.fn()
    }
  };
});

vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      constructor() {
        this.webhooks = mockWebhooks;
      }
    }
  };
});

import webhookHandler from '../api/webhook-stripe.js';

describe('Stripe Webhook Handler', () => {
  let req;
  let res;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWebhooks.constructEvent.mockReset();

    // Spy on console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock request and response objects
    req = {
      method: 'POST',
      headers: {},
      body: {}
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    // Set up environment variables
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
  });

  describe('Signature Validation', () => {
    it('rejects request with invalid Stripe signature', async () => {
      req.headers['stripe-signature'] = 'invalid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_invalid123'
          }
        }
      };

      // Mock Stripe signature verification to fail
      mockWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Webhook signature verification failed'
      });
    });

    it('logs authentication failure when signature is invalid', async () => {
      req.headers['stripe-signature'] = 'invalid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_invalid123'
          }
        }
      };

      mockWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
      });

      await webhookHandler(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WEBHOOK AUTH FAILURE]',
        expect.stringContaining('Webhook signature verification failed')
      );
    });

    it('rejects request with missing Stripe signature header', async () => {
      // No stripe-signature header
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_invalid123'
          }
        }
      };

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Webhook signature verification failed'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WEBHOOK AUTH FAILURE]',
        expect.stringContaining('Missing Stripe signature header')
      );
    });

    it('rejects request when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      req.headers['stripe-signature'] = 'some_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_invalid123'
          }
        }
      };

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Webhook signature verification failed'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WEBHOOK AUTH FAILURE]',
        expect.stringContaining('STRIPE_WEBHOOK_SECRET is not configured')
      );
    });

    it('accepts request with valid Stripe signature', async () => {
      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_valid123'
          }
        }
      };

      // Mock successful signature verification
      mockWebhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_valid123'
          }
        }
      });

      await webhookHandler(req, res);

      expect(mockWebhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(String),
        'valid_signature',
        'whsec_test_secret'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });
  });

  describe('HTTP Method Validation', () => {
    it('rejects non-POST requests', async () => {
      req.method = 'GET';

      await webhookHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({ error: 'Method not allowed' });
    });
  });

  describe('Order ID Generation', () => {
    it('generates order ID in format PUP-{last-8-chars} from Stripe session ID', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_a1b2c3d4e5f6g7h8'
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_a1b2c3d4e5f6g7h8'
          }
        }
      });

      await webhookHandler(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Checkout session completed:',
        'cs_test_a1b2c3d4e5f6g7h8',
        '→ Order ID:',
        'PUP-e5f6g7h8'
      );

      consoleLogSpy.mockRestore();
    });

    it('generates order ID correctly for short session IDs', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_short'
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_short'
          }
        }
      });

      await webhookHandler(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Checkout session completed:',
        'cs_short',
        '→ Order ID:',
        'PUP-cs_short'
      );

      consoleLogSpy.mockRestore();
    });
  });
});
