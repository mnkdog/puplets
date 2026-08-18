import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('OAuth Authentication', () => {
  let handler;
  let originalEnv;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set test environment variables
    process.env.OAUTH_GITHUB_CLIENT_ID = 'test_client_id';
    process.env.OAUTH_GITHUB_CLIENT_SECRET = 'test_client_secret';
    process.env.ALLOWED_ORIGINS = 'https://puplets.vercel.app,https://puplets-staging.vercel.app';
    process.env.OAUTH_REDIRECT_URI = 'https://puplets.vercel.app/api/auth';

    // Import handler fresh for each test
    const module = await import('../api/auth.js');
    handler = module.default;

    // Mock fetch for GitHub OAuth token exchange
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // Helper to create mock request
  function createMockRequest(query = {}) {
    return {
      query,
      headers: {
        cookie: query._cookie || ''
      }
    };
  }

  // Helper to create mock response
  function createMockResponse() {
    const res = {
      redirect: vi.fn(),
      send: vi.fn(),
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    return res;
  }

  describe('OAuth initiation', () => {
    it('should generate CSRF state parameter', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      await handler(req, res);

      expect(res.redirect).toHaveBeenCalled();
      const redirectUrl = res.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('&state=');
      expect(redirectUrl).toMatch(/&state=[a-f0-9]{64}/); // 32 bytes = 64 hex chars
    });

    it('should set secure HTTP-only cookie with state', async () => {
      const req = createMockRequest({});
      const res = createMockResponse();

      await handler(req, res);

      // setHeader now receives an array of cookies (to prevent header overwrite)
      const setCookieCall = res.setHeader.mock.calls.find(call => call[0] === 'Set-Cookie');
      expect(setCookieCall).toBeDefined();
      const cookieArray = setCookieCall[1];
      expect(Array.isArray(cookieArray)).toBe(true);

      // Find the oauth_state cookie in the array
      const stateCookie = cookieArray.find(c => c.includes('__Host-oauth_state='));
      expect(stateCookie).toBeDefined();
      expect(stateCookie).toContain('HttpOnly');
      expect(stateCookie).toContain('Secure');
      expect(stateCookie).toContain('SameSite=Lax');
      expect(stateCookie).toContain('Max-Age=300'); // 5 minutes
    });

    it('should use configurable redirect URI from environment', async () => {
      process.env.OAUTH_REDIRECT_URI = 'https://staging.puplets.app/api/auth';

      const module = await import('../api/auth.js?t=' + Date.now());
      const freshHandler = module.default;

      const req = createMockRequest({});
      const res = createMockResponse();

      await freshHandler(req, res);

      const redirectUrl = res.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('redirect_uri=https://staging.puplets.app/api/auth');
    });

    it('should fall back to production redirect URI when not configured', async () => {
      delete process.env.OAUTH_REDIRECT_URI;

      const module = await import('../api/auth.js?t=' + Date.now());
      const freshHandler = module.default;

      const req = createMockRequest({});
      const res = createMockResponse();

      await freshHandler(req, res);

      const redirectUrl = res.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('redirect_uri=https://puplets.vercel.app/api/auth');
    });

    it('should generate different state on each request', async () => {
      const req1 = createMockRequest({});
      const res1 = createMockResponse();
      await handler(req1, res1);

      const req2 = createMockRequest({});
      const res2 = createMockResponse();
      await handler(req2, res2);

      const url1 = res1.redirect.mock.calls[0][0];
      const url2 = res2.redirect.mock.calls[0][0];

      const state1 = url1.match(/state=([^&]+)/)[1];
      const state2 = url2.match(/state=([^&]+)/)[1];

      expect(state1).not.toBe(state2);
    });
  });

  describe('OAuth callback CSRF validation', () => {
    it('should proceed when state matches', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123secure',
        _cookie: '__Host-oauth_state=abc123secure'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.any(Object)
      );
      expect(res.send).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Authorization successful');
    });

    it('should reject when state is missing from callback', async () => {
      const req = createMockRequest({
        code: 'test_code',
        // No state parameter
        _cookie: '__Host-oauth_state=abc123secure'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Authentication failed. Please try again.');
    });

    it('should reject when state cookie is missing', async () => {
      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123secure'
        // No cookie
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Authentication failed. Please try again.');
    });

    it('should reject when state does not match', async () => {
      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123secure',
        _cookie: '__Host-oauth_state=xyz456different'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Authentication failed. Please try again.');
    });

    it('should clear state cookie after successful validation', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123secure',
        _cookie: '__Host-oauth_state=abc123secure'
      });
      const res = createMockResponse();

      await handler(req, res);

      const setHeaderCalls = res.setHeader.mock.calls.filter(call => call[0] === 'Set-Cookie');
      expect(setHeaderCalls.length).toBeGreaterThan(0);

      // Check for cookie clearing (Max-Age=0)
      const clearCookie = setHeaderCalls.find(call => call[1].includes('Max-Age=0'));
      expect(clearCookie).toBeTruthy();
      expect(clearCookie[1]).toContain('__Host-oauth_state=');
    });
  });

  describe('OAuth denial handling', () => {
    it('should handle user denial gracefully', async () => {
      const req = createMockRequest({
        error: 'access_denied'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.send).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Authentication was cancelled');
      expect(html).toContain('window.close()');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('postMessage origin validation', () => {
    it('should inject allowed origins into client-side script', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await handler(req, res);

      const html = res.send.mock.calls[0][0];
      expect(html).toContain('const allowedOrigins');
      expect(html).toContain('https://puplets.vercel.app');
      expect(html).toContain('https://puplets-staging.vercel.app');
    });

    it('should validate origin before sending token', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await handler(req, res);

      const html = res.send.mock.calls[0][0];
      expect(html).toContain('function matchesPattern(origin, pattern)');
      expect(html).toContain('if (!allowedOrigins.some(pattern => matchesPattern(e.origin, pattern)))');
      expect(html).toContain('Authentication failed due to a security policy');
    });

    it('should not use wildcard in postMessage', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await handler(req, res);

      const html = res.send.mock.calls[0][0];
      expect(html).not.toContain('postMessage("authorizing:github", "*")');
      expect(html).not.toMatch(/postMessage\([^)]+,\s*"\*"\)/);
    });

    it('should fail when ALLOWED_ORIGINS is not configured', async () => {
      delete process.env.ALLOWED_ORIGINS;

      const module = await import('../api/auth.js?t=' + Date.now());
      const freshHandler = module.default;

      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await freshHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalled();
      const html = res.send.mock.calls[0][0];
      expect(html).toContain('Configuration Error');
    });

    it('should support wildcard patterns in allowed origins', async () => {
      // Set up with wildcard pattern for preview deployments
      process.env.ALLOWED_ORIGINS = 'https://puplets-*.example.com';

      const module = await import('../api/auth.js?t=' + Date.now());
      const freshHandler = module.default;

      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'test_token' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await freshHandler(req, res);

      const html = res.send.mock.calls[0][0];
      // Should inject the wildcard pattern
      expect(html).toContain('https://puplets-*.example.com');
      // Should include the matchesPattern function
      expect(html).toContain('function matchesPattern(origin, pattern)');
      // Should use pattern matching logic
      expect(html).toContain('.replace(/\\*/g,');
    });
  });

  describe('GitHub token exchange', () => {
    it('should exchange code for access token', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({ access_token: 'github_token_123' })
      });

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }),
          body: expect.stringContaining('test_client_id')
        })
      );
    });

    it('should handle GitHub token error', async () => {
      global.fetch.mockResolvedValue({
        json: async () => ({
          error: 'bad_verification_code',
          error_description: 'The code passed is incorrect or expired'
        })
      });

      const req = createMockRequest({
        code: 'bad_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'The code passed is incorrect or expired'
      });
    });

    it('should handle GitHub token exchange network failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network request failed'));

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed'
      });
    });

    it('should handle GitHub token exchange timeout', async () => {
      vi.useFakeTimers();

      global.fetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const req = createMockRequest({
        code: 'test_code',
        state: 'abc123',
        _cookie: '__Host-oauth_state=abc123'
      });
      const res = createMockResponse();

      const handlerPromise = handler(req, res);
      await vi.runAllTimersAsync();
      await handlerPromise;

      vi.useRealTimers();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://github.com/login/oauth/access_token',
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication failed'
      });
    });
  });
});
