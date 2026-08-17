/**
 * Shared security utilities for API endpoints
 */

/**
 * Parse comma-separated ALLOWED_ORIGINS environment variable
 * @param {string} envVar - Comma-separated list of allowed origins
 * @returns {string[]} Array of trimmed origin URLs
 * @throws {Error} If envVar is malformed or empty
 */
export function parseAllowedOrigins(envVar) {
  if (typeof envVar !== 'string') {
    throw new Error('ALLOWED_ORIGINS must be a non-empty string');
  }

  const trimmed = envVar.trim();
  if (trimmed === '') {
    throw new Error('ALLOWED_ORIGINS cannot be empty');
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
 * Validate if a request origin is in the allowed list
 * @param {string} origin - Request origin to validate
 * @param {string[]} allowedOrigins - List of allowed origins
 * @returns {{valid: boolean, origin: string}} Validation result
 */
export function validateOrigin(origin, allowedOrigins) {
  if (!origin) {
    return { valid: false, origin: '' };
  }

  const valid = allowedOrigins.includes(origin);
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
}
