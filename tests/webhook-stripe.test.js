import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Stripe webhooks and AirtableClient using vi.hoisted to ensure proper initialization
const { mockWebhooks, mockCreateOrder, mockFindOrderBySessionId } = vi.hoisted(() => {
  return {
    mockWebhooks: {
      constructEvent: vi.fn()
    },
    mockCreateOrder: vi.fn(),
    mockFindOrderBySessionId: vi.fn()
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

vi.mock('../services/airtable-client.js', () => {
  return {
    AirtableClient: class MockAirtableClient {
      constructor() {
        this.createOrder = mockCreateOrder;
        this.findOrderBySessionId = mockFindOrderBySessionId;
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
    mockCreateOrder.mockReset();
    mockFindOrderBySessionId.mockReset();

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

  describe('Order Payload Transformation', () => {
    // Import the transformation function for direct testing
    // We'll test it via the module's internal behavior through the webhook handler
    // by verifying the console output or by exposing it as a named export

    it('transforms complete Stripe session to order format with all fields', async () => {
      // We need to expose the transformation function or test it via integration
      // For now, let's add a test helper that we can call
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_a1b2c3d4e5f6g7h8',
        customer_email: 'customer@example.com',
        customer_details: {
          name: 'Jane Smith',
          email: 'customer@example.com'
        },
        shipping: {
          address: {
            line1: '123 Main St',
            line2: 'Apt 4B',
            city: 'London',
            postal_code: 'SW1A 1AA',
            country: 'UK'
          }
        },
        line_items: {
          data: [
            {
              description: 'Blue Waterproof Collar - Medium',
              quantity: 1,
              price: {
                unit_amount: 1999
              }
            }
          ]
        },
        amount_total: 1999
      };

      const orderId = 'PUP-e5f6g7h8';
      const result = transformSessionToOrder(stripeSession, orderId);

      expect(result).toEqual({
        orderId: 'PUP-e5f6g7h8',
        sessionId: 'cs_test_a1b2c3d4e5f6g7h8',
        customerEmail: 'customer@example.com',
        customerName: 'Jane Smith',
        shippingAddress: '123 Main St, Apt 4B, London, SW1A 1AA, UK',
        items: [
          {
            description: 'Blue Waterproof Collar - Medium',
            quantity: 1,
            price: 1999
          }
        ],
        total: 19.99
      });
    });

    it('converts currency from cents to pounds correctly', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 2550,  // £25.50
        customer_email: 'test@example.com',
        line_items: { data: [] }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.total).toBe(25.50);
    });

    it('formats shipping address with all components present', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 1000,
        customer_email: 'test@example.com',
        shipping: {
          address: {
            line1: '456 Oak Ave',
            line2: 'Suite 200',
            city: 'Manchester',
            postal_code: 'M1 1AA',
            country: 'UK'
          }
        },
        line_items: { data: [] }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.shippingAddress).toBe('456 Oak Ave, Suite 200, Manchester, M1 1AA, UK');
    });

    it('formats shipping address with missing optional line2', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 1000,
        customer_email: 'test@example.com',
        shipping: {
          address: {
            line1: '789 Elm St',
            city: 'Birmingham',
            postal_code: 'B1 1AA',
            country: 'UK'
          }
        },
        line_items: { data: [] }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.shippingAddress).toBe('789 Elm St, Birmingham, B1 1AA, UK');
    });

    it('handles missing shipping address gracefully', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 1000,
        customer_email: 'test@example.com',
        line_items: { data: [] }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.shippingAddress).toBe('');
    });

    it('transforms line items to simplified format', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 3998,
        customer_email: 'test@example.com',
        line_items: {
          data: [
            {
              description: 'Blue Waterproof Collar - Medium',
              quantity: 1,
              price: { unit_amount: 1999 }
            },
            {
              description: 'Red Waterproof Collar - Small',
              quantity: 2,
              price: { unit_amount: 1899 }
            }
          ]
        }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.items).toEqual([
        { description: 'Blue Waterproof Collar - Medium', quantity: 1, price: 1999 },
        { description: 'Red Waterproof Collar - Small', quantity: 2, price: 1899 }
      ]);
    });

    it('handles missing line items gracefully', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 1000,
        customer_email: 'test@example.com'
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.items).toEqual([]);
    });

    it('uses customer_details.email as fallback when customer_email is missing', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 1000,
        customer_details: {
          email: 'fallback@example.com',
          name: 'Test User'
        },
        line_items: { data: [] }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.customerEmail).toBe('fallback@example.com');
    });

    it('handles missing customer name gracefully', async () => {
      const { transformSessionToOrder } = await import('../api/webhook-stripe.js');

      const stripeSession = {
        id: 'cs_test_123',
        amount_total: 1000,
        customer_email: 'test@example.com',
        line_items: { data: [] }
      };

      const result = transformSessionToOrder(stripeSession, 'PUP-test123');

      expect(result.customerName).toBe('');
    });
  });

  describe('Webhook Idempotency', () => {
    it('returns 200 and skips order creation when session already processed', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_a1b2c3d4e5f6g7h8',
            customer_email: 'customer@example.com',
            amount_total: 1999,
            line_items: { data: [] }
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue(req.body);

      // Mock existing order found
      mockFindOrderBySessionId.mockResolvedValue({
        id: 'recABC123',
        fields: { 'Order ID': 'PUP-e5f6g7h8' }
      });

      await webhookHandler(req, res);

      expect(mockFindOrderBySessionId).toHaveBeenCalledWith('cs_test_a1b2c3d4e5f6g7h8');
      expect(mockCreateOrder).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Duplicate webhook for session:',
        'cs_test_a1b2c3d4e5f6g7h8',
        '- order already exists:',
        'PUP-e5f6g7h8'
      );

      consoleLogSpy.mockRestore();
    });

    it('creates order when session not previously processed', async () => {
      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_new123',
            customer_email: 'new@example.com',
            amount_total: 1000,
            line_items: { data: [] }
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue(req.body);

      // Mock no existing order found
      mockFindOrderBySessionId.mockResolvedValue(null);
      mockCreateOrder.mockResolvedValue({
        id: 'recXYZ789',
        fields: { 'Order ID': 'PUP-w123' }
      });

      await webhookHandler(req, res);

      expect(mockFindOrderBySessionId).toHaveBeenCalledWith('cs_test_new123');
      expect(mockCreateOrder).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('returns 500 when idempotency check fails', async () => {
      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_error123',
            customer_email: 'error@example.com',
            amount_total: 1000,
            line_items: { data: [] }
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue(req.body);
      mockFindOrderBySessionId.mockRejectedValue(new Error('Airtable query failed'));

      await webhookHandler(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[IDEMPOTENCY CHECK FAILED]',
        'Session:',
        'cs_test_error123',
        'Error:',
        'Failed to check for existing order: Airtable query failed'
      );
      expect(mockCreateOrder).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to check for existing order' });
    });
  });

  describe('Order Creation Integration', () => {
    it('delegates order creation to airtableClient.createOrder with transformed data', async () => {
      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_a1b2c3d4e5f6g7h8',
            customer_email: 'customer@example.com',
            customer_details: {
              name: 'Jane Smith',
              email: 'customer@example.com'
            },
            shipping: {
              address: {
                line1: '123 Main St',
                line2: 'Apt 4B',
                city: 'London',
                postal_code: 'SW1A 1AA',
                country: 'UK'
              }
            },
            line_items: {
              data: [
                {
                  description: 'Blue Waterproof Collar - Medium',
                  quantity: 1,
                  price: {
                    unit_amount: 1999
                  }
                }
              ]
            },
            amount_total: 1999
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue(req.body);
      mockFindOrderBySessionId.mockResolvedValue(null);
      mockCreateOrder.mockResolvedValue({
        id: 'recABC123',
        fields: { 'Order ID': 'PUP-e5f6g7h8' }
      });

      await webhookHandler(req, res);

      expect(mockCreateOrder).toHaveBeenCalledWith({
        orderId: 'PUP-e5f6g7h8',
        sessionId: 'cs_test_a1b2c3d4e5f6g7h8',
        customerEmail: 'customer@example.com',
        customerName: 'Jane Smith',
        shippingAddress: '123 Main St, Apt 4B, London, SW1A 1AA, UK',
        items: [
          {
            description: 'Blue Waterproof Collar - Medium',
            quantity: 1,
            price: 1999
          }
        ],
        total: 19.99
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ received: true });
    });

    it('returns 500 and logs error when airtableClient.createOrder fails', async () => {
      req.headers['stripe-signature'] = 'valid_signature';
      req.body = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_fail123',
            customer_email: 'fail@example.com',
            amount_total: 1000,
            line_items: { data: [] }
          }
        }
      };

      mockWebhooks.constructEvent.mockReturnValue(req.body);
      mockFindOrderBySessionId.mockResolvedValue(null);
      mockCreateOrder.mockRejectedValue(new Error('Airtable API error'));

      await webhookHandler(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ORDER CREATION FAILED]',
        'Session:',
        'cs_test_fail123',
        'Error:',
        'Airtable API error'
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create order' });
    });
  });
});
