/**
 * CSRF protection utilities for OAuth flows
 */

import crypto from 'crypto';

/**
 * Generate cryptographically random CSRF state
 * @returns {string} Hex-encoded random state (64 chars = 32 bytes)
 */
export function generateCSRFState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Set secure state cookie for CSRF protection
 * @param {Object} res - Response object
 * @param {string} state - CSRF state value to store
 */
export function setSecureStateCookie(res, state) {
  res.setHeader('Set-Cookie', [
    `oauth_state=${state}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=300`, // 5 minutes
    'Path=/api/auth'
  ].join('; '));
}

/**
 * Clear state cookie (set with expired date)
 * @param {Object} res - Response object
 */
export function clearStateCookie(res) {
  res.setHeader('Set-Cookie', [
    'oauth_state=',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
    'Path=/api/auth'
  ].join('; '));
}

/**
 * Validate CSRF state from cookie matches callback parameter
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {boolean} True if state is valid, false otherwise (sends error response)
 */
export function validateCSRFState(req, res) {
  const callbackState = req.query.state;
  const cookies = req.headers.cookie || '';
  const cookieMatch = cookies.match(/oauth_state=([^;]+)/);
  const cookieState = cookieMatch ? cookieMatch[1] : null;

  if (!callbackState || !cookieState || callbackState !== cookieState) {
    console.error('[SECURITY ALERT] CSRF state validation failed for OAuth callback');
    res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body>
        <h1 role="alert">Authentication failed. Please try again.</h1>
        <p>The security validation did not pass.</p>
      </body>
      </html>
    `);
    return false;
  }

  // Clear state cookie after successful validation
  clearStateCookie(res);
  return true;
}
