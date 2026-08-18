/**
 * CORS validation utilities for API endpoints
 */

/**
 * Parse comma-separated ALLOWED_ORIGINS environment variable
 * @param {string} envVar - Comma-separated list of allowed origins (or patterns)
 * @returns {string[]} Array of trimmed origin URLs/patterns
 * @throws {Error} If envVar is malformed or missing
 */
export function parseAllowedOrigins(envVar) {
  if (typeof envVar !== 'string') {
    throw new Error('ALLOWED_ORIGINS must be a string');
  }

  const trimmed = envVar.trim();

  // Empty string is valid (means no origins allowed) - returns empty array for 403
  if (trimmed === '') {
    return [];
  }

  const origins = trimmed.split(',').map(origin => origin.trim()).filter(origin => origin !== '');

  if (origins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must contain at least one valid origin');
  }

  // Validate format: each origin should start with http:// or https://
  for (const origin of origins) {
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      throw new Error(`Invalid origin format: ${origin}. Origins must start with http:// or https://`);
    }
  }

  return origins;
}

/**
 * Match origin against a pattern with wildcard support
 * @param {string} origin - Origin to test
 * @param {string} pattern - Pattern with optional * wildcard
 * @returns {boolean} True if origin matches pattern
 */
function matchesPattern(origin, pattern) {
  if (!pattern.includes('*')) {
    return origin === pattern;
  }

  // Convert pattern to regex: escape special chars, replace * with valid subdomain pattern
  // * matches single label only (alphanumeric, hyphens) - NOT dots to prevent cross-label matching
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
    .replace(/\*/g, '[a-zA-Z0-9-]+');       // Replace * with single-label pattern (no dot)

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(origin);
}

/**
 * Validate if a request origin is in the allowed list
 * @param {string} origin - Request origin to validate
 * @param {string[]} allowedOrigins - List of allowed origins (may include wildcard patterns)
 * @returns {{valid: boolean, origin: string}} Validation result
 */
export function validateOrigin(origin, allowedOrigins) {
  if (!origin) {
    return { valid: false, origin: '' };
  }

  // Check exact match first, then wildcard patterns
  const valid = allowedOrigins.some(allowed => matchesPattern(origin, allowed));
  return { valid, origin };
}

/**
 * Set CORS headers for a validated origin
 * @param {Object} res - Response object
 * @param {string} validatedOrigin - The validated origin to allow
 */
export function setCORSHeaders(res, validatedOrigin) {
  res.setHeader('Access-Control-Allow-Origin', validatedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');  // Prevent cache serving wrong origin's CORS response
}
