import { describe, it, expect, vi } from 'vitest';
import { parseAllowedOrigins, validateOrigin, setCORSHeaders } from '../api/security-utils.js';

describe('parseAllowedOrigins', () => {
  it('should parse single origin', () => {
    const result = parseAllowedOrigins('https://puplets.vercel.app');
    expect(result).toEqual(['https://puplets.vercel.app']);
  });

  it('should parse multiple comma-separated origins', () => {
    const result = parseAllowedOrigins('https://puplets.vercel.app,https://puplets-staging.vercel.app');
    expect(result).toEqual(['https://puplets.vercel.app', 'https://puplets-staging.vercel.app']);
  });

  it('should trim whitespace from origins', () => {
    const result = parseAllowedOrigins('https://puplets.vercel.app, https://puplets-staging.vercel.app');
    expect(result).toEqual(['https://puplets.vercel.app', 'https://puplets-staging.vercel.app']);
  });

  it('should trim whitespace around entire string', () => {
    const result = parseAllowedOrigins('  https://puplets.vercel.app  ');
    expect(result).toEqual(['https://puplets.vercel.app']);
  });

  it('should handle multiple spaces and tabs', () => {
    const result = parseAllowedOrigins('https://a.com,  https://b.com  ,https://c.com');
    expect(result).toEqual(['https://a.com', 'https://b.com', 'https://c.com']);
  });

  it('should return empty array for empty string', () => {
    const result = parseAllowedOrigins('');
    expect(result).toEqual([]);
  });

  it('should return empty array for whitespace-only string', () => {
    const result = parseAllowedOrigins('   ');
    expect(result).toEqual([]);
  });

  it('should throw error for undefined', () => {
    expect(() => parseAllowedOrigins(undefined)).toThrow('ALLOWED_ORIGINS must be a string');
  });

  it('should throw error for null', () => {
    expect(() => parseAllowedOrigins(null)).toThrow('ALLOWED_ORIGINS must be a string');
  });

  it('should throw error for non-string input', () => {
    expect(() => parseAllowedOrigins(123)).toThrow('ALLOWED_ORIGINS must be a string');
  });

  it('should throw error for malformed origin without protocol', () => {
    expect(() => parseAllowedOrigins('puplets.vercel.app')).toThrow('Invalid origin format: puplets.vercel.app');
  });

  it('should throw error for origin with invalid protocol', () => {
    expect(() => parseAllowedOrigins('ftp://puplets.vercel.app')).toThrow('Invalid origin format: ftp://puplets.vercel.app');
  });

  it('should throw error when all origins are invalid after trimming', () => {
    expect(() => parseAllowedOrigins(',,,')).toThrow('ALLOWED_ORIGINS must contain at least one valid origin');
  });

  it('should accept http:// protocol', () => {
    const result = parseAllowedOrigins('http://localhost:3000');
    expect(result).toEqual(['http://localhost:3000']);
  });

  it('should accept https:// protocol', () => {
    const result = parseAllowedOrigins('https://puplets.vercel.app');
    expect(result).toEqual(['https://puplets.vercel.app']);
  });

  it('should handle mixed http and https origins', () => {
    const result = parseAllowedOrigins('http://localhost:3000,https://puplets.vercel.app');
    expect(result).toEqual(['http://localhost:3000', 'https://puplets.vercel.app']);
  });

  it('should filter out empty strings between commas', () => {
    const result = parseAllowedOrigins('https://a.com,,https://b.com');
    expect(result).toEqual(['https://a.com', 'https://b.com']);
  });

  it('should parse wildcard patterns', () => {
    const result = parseAllowedOrigins('https://puplets-*.vercel.app');
    expect(result).toEqual(['https://puplets-*.vercel.app']);
  });

  it('should parse mix of exact origins and wildcard patterns', () => {
    const result = parseAllowedOrigins('https://puplets.vercel.app,https://puplets-*.vercel.app');
    expect(result).toEqual(['https://puplets.vercel.app', 'https://puplets-*.vercel.app']);
  });
});

describe('validateOrigin', () => {
  const allowedOrigins = ['https://puplets.vercel.app', 'https://puplets-staging.vercel.app'];

  it('should return valid true for allowed origin', () => {
    const result = validateOrigin('https://puplets.vercel.app', allowedOrigins);
    expect(result).toEqual({ valid: true, origin: 'https://puplets.vercel.app' });
  });

  it('should return valid true for second allowed origin', () => {
    const result = validateOrigin('https://puplets-staging.vercel.app', allowedOrigins);
    expect(result).toEqual({ valid: true, origin: 'https://puplets-staging.vercel.app' });
  });

  it('should return valid false for disallowed origin', () => {
    const result = validateOrigin('https://evil-site.com', allowedOrigins);
    expect(result).toEqual({ valid: false, origin: 'https://evil-site.com' });
  });

  it('should return valid false for missing origin (undefined)', () => {
    const result = validateOrigin(undefined, allowedOrigins);
    expect(result).toEqual({ valid: false, origin: '' });
  });

  it('should return valid false for missing origin (null)', () => {
    const result = validateOrigin(null, allowedOrigins);
    expect(result).toEqual({ valid: false, origin: '' });
  });

  it('should return valid false for empty string origin', () => {
    const result = validateOrigin('', allowedOrigins);
    expect(result).toEqual({ valid: false, origin: '' });
  });

  it('should be case-sensitive', () => {
    const result = validateOrigin('https://PUPLETS.VERCEL.APP', allowedOrigins);
    expect(result).toEqual({ valid: false, origin: 'https://PUPLETS.VERCEL.APP' });
  });

  it('should require exact match (no partial matches)', () => {
    const result = validateOrigin('https://puplets.vercel.app.evil.com', allowedOrigins);
    expect(result).toEqual({ valid: false, origin: 'https://puplets.vercel.app.evil.com' });
  });

  it('should work with empty allowed origins array', () => {
    const result = validateOrigin('https://puplets.vercel.app', []);
    expect(result).toEqual({ valid: false, origin: 'https://puplets.vercel.app' });
  });

  it('should match wildcard pattern for preview deployments', () => {
    const allowedWithWildcard = ['https://puplets.vercel.app', 'https://puplets-*.vercel.app'];
    const result = validateOrigin('https://puplets-abc123.vercel.app', allowedWithWildcard);
    expect(result).toEqual({ valid: true, origin: 'https://puplets-abc123.vercel.app' });
  });

  it('should match wildcard pattern with hyphens and numbers', () => {
    const allowedWithWildcard = ['https://puplets-*.vercel.app'];
    const result = validateOrigin('https://puplets-pr-456-xyz.vercel.app', allowedWithWildcard);
    expect(result).toEqual({ valid: true, origin: 'https://puplets-pr-456-xyz.vercel.app' });
  });

  it('should not match wildcard across different domains', () => {
    const allowedWithWildcard = ['https://puplets-*.vercel.app'];
    const result = validateOrigin('https://puplets-evil.evil.com', allowedWithWildcard);
    expect(result).toEqual({ valid: false, origin: 'https://puplets-evil.evil.com' });
  });

  it('should match exact origin when wildcard pattern is also present', () => {
    const allowedWithWildcard = ['https://puplets.vercel.app', 'https://puplets-*.vercel.app'];
    const result = validateOrigin('https://puplets.vercel.app', allowedWithWildcard);
    expect(result).toEqual({ valid: true, origin: 'https://puplets.vercel.app' });
  });

  it('should not match wildcard with protocol mismatch', () => {
    const allowedWithWildcard = ['https://puplets-*.vercel.app'];
    const result = validateOrigin('http://puplets-abc123.vercel.app', allowedWithWildcard);
    expect(result).toEqual({ valid: false, origin: 'http://puplets-abc123.vercel.app' });
  });

  it('should not match when wildcard pattern has wrong prefix', () => {
    const allowedWithWildcard = ['https://puplets-*.vercel.app'];
    const result = validateOrigin('https://evil-abc123.vercel.app', allowedWithWildcard);
    expect(result).toEqual({ valid: false, origin: 'https://evil-abc123.vercel.app' });
  });

  it('should not match wildcard across label boundaries (security)', () => {
    const allowedWithWildcard = ['https://puplets-*.vercel.app'];
    // puplets-evil.evil.com should NOT match even though * previously matched dots
    const result = validateOrigin('https://puplets-evil.evil.com', allowedWithWildcard);
    expect(result).toEqual({ valid: false, origin: 'https://puplets-evil.evil.com' });
  });

  it('should not match subdomain with internal dots via wildcard', () => {
    const allowedWithWildcard = ['https://puplets-*.vercel.app'];
    // puplets-a.b.c would match with [a-zA-Z0-9.-]+ but should not with [a-zA-Z0-9-]+
    const result = validateOrigin('https://puplets-a.b.c.vercel.app', allowedWithWildcard);
    expect(result).toEqual({ valid: false, origin: 'https://puplets-a.b.c.vercel.app' });
  });
});

describe('setCORSHeaders', () => {
  it('should set Access-Control-Allow-Origin header', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets.vercel.app');
  });

  it('should set Access-Control-Allow-Methods header', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  });

  it('should set Access-Control-Allow-Headers header', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  it('should set Access-Control-Allow-Credentials header', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
  });

  it('should set all five CORS headers including Vary', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    expect(res.setHeader).toHaveBeenCalledTimes(5);
  });

  it('should use the specific validated origin', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets-staging.vercel.app');

    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets-staging.vercel.app');
  });

  it('should never use wildcard origin', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    // Verify it's called with specific origin, not "*"
    expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://puplets.vercel.app');
  });

  it('should set Vary: Origin header to prevent cache poisoning', () => {
    const res = {
      setHeader: vi.fn()
    };

    setCORSHeaders(res, 'https://puplets.vercel.app');

    expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
  });
});
