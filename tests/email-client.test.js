import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailClient, createEmailClient } from '../services/email-client.js';

// Mock the Resend module
const mockSend = vi.fn();
const mockResend = {
  emails: {
    send: mockSend
  }
};

vi.mock('resend', () => {
  const MockResend = function() {
    return mockResend;
  };

  return {
    Resend: MockResend
  };
});

describe('EmailClient', () => {
  let client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockReset();
    client = new EmailClient('test-api-key');
  });

  describe('constructor', () => {
    it('throws error when API key is missing', () => {
      expect(() => new EmailClient(null))
        .toThrow('Resend API key is required');
    });

    it('throws error when API key is undefined', () => {
      expect(() => new EmailClient(undefined))
        .toThrow('Resend API key is required');
    });

    it('initializes with valid API key', () => {
      const validClient = new EmailClient('test-key');
      expect(validClient).toBeDefined();
      expect(validClient.resend).toBeDefined();
      expect(validClient.fromEmail).toBe('Puplets <hello@puplets.co.uk>');
    });
  });

  describe('sendCustomerConfirmation', () => {
    it('sends email with all template fields', async () => {
      const mockResponse = {
        data: { id: 'msg_123abc' },
        error: null
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await client.sendCustomerConfirmation(
        'customer@example.com',
        'Order Confirmation - Your Puplets Order',
        '<html><body>Order details</body></html>',
        'Order details text version'
      );

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Puplets <hello@puplets.co.uk>',
        to: 'customer@example.com',
        subject: 'Order Confirmation - Your Puplets Order',
        html: '<html><body>Order details</body></html>',
        text: 'Order details text version'
      });

      expect(result).toEqual({
        id: 'msg_123abc'
      });
    });

    it('returns message ID as non-empty string', async () => {
      const mockResponse = {
        data: { id: 'msg_xyz789' },
        error: null
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await client.sendCustomerConfirmation(
        'test@example.com',
        'Test Subject',
        '<p>Test HTML</p>',
        'Test Text'
      );

      expect(result.id).toBeTruthy();
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('throws no error when send succeeds', async () => {
      const mockResponse = {
        data: { id: 'msg_success' },
        error: null
      };
      mockSend.mockResolvedValue(mockResponse);

      await expect(
        client.sendCustomerConfirmation(
          'valid@example.com',
          'Subject',
          '<p>HTML</p>',
          'Text'
        )
      ).resolves.not.toThrow();
    });

    it('throws error when Resend API returns error', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Invalid API key' }
      };
      mockSend.mockResolvedValue(mockResponse);

      await expect(
        client.sendCustomerConfirmation(
          'test@example.com',
          'Subject',
          '<p>HTML</p>',
          'Text'
        )
      ).rejects.toThrow('Failed to send email: Invalid API key');
    });

    it('includes from address from constructor', async () => {
      const mockResponse = {
        data: { id: 'msg_test' },
        error: null
      };
      mockSend.mockResolvedValue(mockResponse);

      await client.sendCustomerConfirmation(
        'recipient@example.com',
        'Test',
        '<p>Test</p>',
        'Test'
      );

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('Puplets <hello@puplets.co.uk>');
    });

    it('handles different email addresses', async () => {
      const mockResponse = {
        data: { id: 'msg_multi' },
        error: null
      };
      mockSend.mockResolvedValue(mockResponse);

      await client.sendCustomerConfirmation(
        'different@test.com',
        'Different Subject',
        '<p>Different HTML</p>',
        'Different Text'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'different@test.com'
        })
      );
    });
  });

  describe('sendShopOwnerNotification', () => {
    it('sends email with all template fields', async () => {
      const mockResponse = {
        data: { id: 'msg_shop_123' },
        error: null
      };
      mockSend.mockResolvedValue(mockResponse);

      const result = await client.sendShopOwnerNotification(
        'shop@puplets.co.uk',
        'New Order Notification - Order #12345',
        '<html><body>New order details</body></html>',
        'New order details text version'
      );

      expect(mockSend).toHaveBeenCalledWith({
        from: 'Puplets <hello@puplets.co.uk>',
        to: 'shop@puplets.co.uk',
        subject: 'New Order Notification - Order #12345',
        html: '<html><body>New order details</body></html>',
        text: 'New order details text version'
      });

      expect(result).toEqual({
        id: 'msg_shop_123'
      });
    });
  });

  describe('createEmailClient', () => {
    it('creates client with API key from environment', () => {
      const originalEnv = process.env.RESEND_API_KEY;
      process.env.RESEND_API_KEY = 'env-test-key';

      const client = createEmailClient();

      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(EmailClient);

      process.env.RESEND_API_KEY = originalEnv;
    });

    it('throws error when environment variable is missing', () => {
      const originalEnv = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      expect(() => createEmailClient())
        .toThrow('Resend API key is required');

      process.env.RESEND_API_KEY = originalEnv;
    });
  });
});
