import { describe, it, expect, vi } from 'vitest';
import {
  generateCSRFState,
  setSecureStateCookie,
  clearStateCookie,
  validateCSRFState
} from '../api/csrf-utils.js';

describe('generateCSRFState', () => {
  it('should return a 64-character hex string', () => {
    const state = generateCSRFState();
    expect(state).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate unique values on successive calls', () => {
    const states = new Set();
    for (let i = 0; i < 100; i++) {
      states.add(generateCSRFState());
    }
    expect(states.size).toBe(100);
  });

  it('should not throw errors', () => {
    expect(() => generateCSRFState()).not.toThrow();
  });
});

describe('setSecureStateCookie', () => {
  it('should set cookie with all required security attributes', () => {
    const mockRes = {
      setHeader: vi.fn()
    };
    const state = 'test_state_value';

    setSecureStateCookie(mockRes, state);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.any(String));
    const cookieValue = mockRes.setHeader.mock.calls[0][1];

    expect(cookieValue).toContain('__Host-oauth_state=test_state_value');
    expect(cookieValue).toContain('HttpOnly');
    expect(cookieValue).toContain('Secure');
    expect(cookieValue).toContain('SameSite=Lax');
    expect(cookieValue).toContain('Max-Age=300');
    expect(cookieValue).toContain('Path=/');
  });

  it('should handle empty string state', () => {
    const mockRes = {
      setHeader: vi.fn()
    };

    setSecureStateCookie(mockRes, '');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('__Host-oauth_state='));
  });

  it('should handle state with special characters', () => {
    const mockRes = {
      setHeader: vi.fn()
    };
    const specialState = 'abc=123;def';

    setSecureStateCookie(mockRes, specialState);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('__Host-oauth_state=abc=123;def'));
  });
});

describe('clearStateCookie', () => {
  it('should set cookie with Max-Age=0', () => {
    const mockRes = {
      setHeader: vi.fn()
    };

    clearStateCookie(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.any(String));
    const cookieValue = mockRes.setHeader.mock.calls[0][1];

    expect(cookieValue).toContain('Max-Age=0');
  });

  it('should match security attributes of setSecureStateCookie', () => {
    const mockRes = {
      setHeader: vi.fn()
    };

    clearStateCookie(mockRes);

    const cookieValue = mockRes.setHeader.mock.calls[0][1];

    expect(cookieValue).toContain('HttpOnly');
    expect(cookieValue).toContain('Secure');
    expect(cookieValue).toContain('SameSite=Lax');
    expect(cookieValue).toContain('Path=/');
  });

  it('should set empty __Host-oauth_state value', () => {
    const mockRes = {
      setHeader: vi.fn()
    };

    clearStateCookie(mockRes);

    const cookieValue = mockRes.setHeader.mock.calls[0][1];
    expect(cookieValue).toContain('__Host-oauth_state=');
  });
});

describe('validateCSRFState', () => {
  function createMockRequest(state, cookie = '') {
    return {
      query: { state },
      headers: { cookie }
    };
  }

  function createMockResponse() {
    return {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      setHeader: vi.fn()
    };
  }

  describe('validation logic', () => {
    it('should return true when state matches cookie', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=abc123');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(true);
      expect(res.send).not.toHaveBeenCalled();
    });

    it('should clear cookie after successful validation', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=abc123');
      const res = createMockResponse();

      validateCSRFState(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('Max-Age=0'));
    });

    it('should return false when state is missing', () => {
      const req = createMockRequest(undefined, '__Host-oauth_state=abc123');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return false when cookie is missing', () => {
      const req = createMockRequest('abc123', '');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return false when state does not match cookie', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=xyz789');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple __Host-oauth_state cookies (uses first match)', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=abc123; other=value; __Host-oauth_state=xyz789');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(true);
    });

    it('should handle cookie with no equals sign', () => {
      const req = createMockRequest('abc123', 'invalidcookie');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(false);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle empty cookie header', () => {
      const req = createMockRequest('abc123', '');
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(false);
    });

    it('should handle very long state values', () => {
      const longState = 'a'.repeat(1000);
      const req = createMockRequest(longState, `__Host-oauth_state=${longState}`);
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(true);
    });

    it('should handle state with URL-encoded characters', () => {
      const encodedState = 'abc%20123';
      const req = createMockRequest(encodedState, `__Host-oauth_state=${encodedState}`);
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(true);
    });

    it('should handle state with special regex characters', () => {
      const regexState = 'abc.+*?[]{}()';
      const req = createMockRequest(regexState, `__Host-oauth_state=${regexState}`);
      const res = createMockResponse();

      const result = validateCSRFState(req, res);

      expect(result).toBe(true);
    });
  });

  describe('error response', () => {
    it('should return 403 status code on validation failure', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=xyz789');
      const res = createMockResponse();

      validateCSRFState(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should send HTML error page on validation failure', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=xyz789');
      const res = createMockResponse();

      validateCSRFState(req, res);

      const html = res.send.mock.calls[0][0];
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Authentication failed');
    });

    it('should include role="alert" for accessibility', () => {
      const req = createMockRequest('abc123', '__Host-oauth_state=xyz789');
      const res = createMockResponse();

      validateCSRFState(req, res);

      const html = res.send.mock.calls[0][0];
      expect(html).toContain('role="alert"');
    });
  });
});
