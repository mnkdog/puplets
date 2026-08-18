import { parseAllowedOrigins } from './cors-utils.js';
import {
  generateCSRFState,
  setSecureStateCookie,
  validateCSRFState
} from './csrf-utils.js';

export default async function handler(req, res) {
  const { code, error, cms_origin } = req.query;

  // Handle OAuth denial
  if (error === 'access_denied') {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Cancelled</title></head>
      <body>
        <h1 role="alert">Authentication was cancelled</h1>
        <p>You can close this window.</p>
        <script>setTimeout(() => window.close(), 2000);</script>
      </body>
      </html>
    `);
  }

  // Step 1: Redirect to GitHub OAuth if no code
  if (!code) {
    const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
    const redirectUri = process.env.OAUTH_REDIRECT_URI || 'https://puplets.vercel.app/api/auth';
    // Public repo + read-only user info (sufficient for Decap CMS on public repos)
    const scope = 'public_repo,read:user';

    // Validate and store CMS origin if provided
    let allowedOrigins;
    try {
      allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
    } catch (error) {
      console.error('[SECURITY ALERT] ALLOWED_ORIGINS not configured:', error.message);
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Configuration Error</title></head>
        <body>
          <h1 role="alert">Authentication failed due to server configuration</h1>
          <p>Please contact support.</p>
        </body>
        </html>
      `);
    }

    if (cms_origin) {
      // Validate CMS origin against allowed origins
      const { validateOrigin } = await import('./cors-utils.js');
      const validation = validateOrigin(cms_origin, allowedOrigins);

      if (!validation.valid) {
        console.error('[SECURITY ALERT] Invalid CMS origin attempted:', cms_origin);
        return res.status(403).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Invalid Origin</title></head>
          <body>
            <h1 role="alert">Authentication failed</h1>
            <p>The requesting origin is not authorized.</p>
          </body>
          </html>
        `);
      }

      // Store validated CMS origin in secure cookie
      res.setHeader('Set-Cookie', [
        `__Host-cms_origin=${encodeURIComponent(cms_origin)}`,
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Max-Age=300', // 5 minutes
        'Path=/'
      ].join('; '));
    }

    // Generate and store CSRF state
    const state = generateCSRFState();
    setSecureStateCookie(res, state);

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    return res.redirect(githubAuthUrl);
  }

  // Step 2: Validate CSRF state before proceeding
  if (!validateCSRFState(req, res)) {
    return; // validateCSRFState already sent response
  }

  // Step 3: Exchange code for access token
  try {
    // Security: Add timeout to prevent resource exhaustion if GitHub API is slow/unresponsive
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    let tokenResponse;
    try {
      tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
          client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
          code
        })
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[SECURITY ALERT] GitHub OAuth API timeout after 10s');
        return res.status(504).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Authentication Timeout</title></head>
          <body>
            <h1 role="alert">Authentication timed out</h1>
            <p>Please try again. If the problem persists, contact support.</p>
          </body>
          </html>
        `);
      }
      throw fetchError;
    }

    const data = await tokenResponse.json();

    if (data.error) {
      return res.status(400).json({ error: data.error_description || data.error });
    }

    if (!data.access_token) {
      console.error('[SECURITY ALERT] GitHub token response missing access_token');
      return res.status(502).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Failed</title></head>
        <body>
          <h1 role="alert">Authentication failed</h1>
          <p>Unable to complete authentication. Please try again.</p>
        </body>
        </html>
      `);
    }

    // Extract CMS origin from cookie if present
    const cookies = req.headers.cookie || '';
    const cmsOriginMatch = cookies.match(/(?:^|;\s*)__Host-cms_origin=([^;]*)/);
    const storedCmsOrigin = cmsOriginMatch ? decodeURIComponent(cmsOriginMatch[1]) : null;

    // Parse allowed origins for client-side validation
    let allowedOrigins;
    try {
      allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
    } catch (error) {
      console.error('[SECURITY ALERT] ALLOWED_ORIGINS not configured for OAuth:', error.message);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Referrer-Policy', 'no-referrer');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Configuration Error</title></head>
        <body>
          <h1 role="alert">Authentication failed due to server configuration</h1>
          <p>Please contact support.</p>
        </body>
        </html>
      `);
    }

    // Return token to CMS via postMessage with origin validation
    const escapedOrigins = JSON.stringify(allowedOrigins).replace(/</g, '\\u003c');
    const escapedToken = JSON.stringify(data.access_token).replace(/</g, '\\u003c');
    const escapedCmsOrigin = storedCmsOrigin ? JSON.stringify(storedCmsOrigin).replace(/</g, '\\u003c') : 'null';
    const script = `
      <!DOCTYPE html>
      <html>
      <head><title>Authorizing...</title></head>
      <body>
        <p>Authorization successful. Closing window...</p>
        <script>
          (function() {
            const allowedOrigins = ${escapedOrigins};
            const cmsOrigin = ${escapedCmsOrigin};

            function matchesPattern(origin, pattern) {
              if (!pattern.includes('*')) {
                return origin === pattern;
              }
              // Escape regex metachars except *
              const metachars = ['.', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\\\'];
              let escaped = pattern
                .split('').map(c => metachars.includes(c) ? '\\\\' + c : c).join('');
              // Replace * with subdomain pattern
              escaped = escaped.replace(/\\*/g, '[a-zA-Z0-9-]+');
              return new RegExp('^' + escaped + '$').test(origin);
            }

            function receiveMessage(e) {
              // Validate origin against patterns (supports wildcards)
              if (!allowedOrigins.some(pattern => matchesPattern(e.origin, pattern))) {
                document.body.innerHTML = '<h1 role="alert">Authentication failed due to a security policy. Please try again or contact support.</h1>';
                console.error('Popup origin not allowed:', e.origin);
                return;
              }

              // Send token to validated origin only (no wildcard)
              window.opener.postMessage(
                'authorization:github:success:' + JSON.stringify({
                  token: ${escapedToken},
                  provider: 'github'
                }),
                e.origin
              );
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);

            // Initial handshake to CMS origin
            if (window.opener) {
              // Use stored CMS origin if available, otherwise fall back to first allowed origin
              const targetOrigin = cmsOrigin || (allowedOrigins.length > 0 ? allowedOrigins[0] : window.location.origin);

              // Don't send to wildcard patterns - they need to message us first
              if (targetOrigin.includes('*')) {
                // Wait for CMS to send first message - no handshake
                console.log('Waiting for CMS message (wildcard pattern)');
              } else {
                window.opener.postMessage("authorizing:github", targetOrigin);
              }
            }
          })();
        </script>
      </body>
      </html>
    `;

    // Clear CMS origin cookie after use (validateCSRFState already cleared the CSRF cookie)
    // Need to set both cookies together since setHeader overwrites
    const cookiesToClear = [
      ['__Host-oauth_state=', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=0', 'Path=/'].join('; ')
    ];

    if (storedCmsOrigin) {
      cookiesToClear.push(
        ['__Host-cms_origin=', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=0', 'Path=/'].join('; ')
      );
    }

    res.setHeader('Set-Cookie', cookiesToClear);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.send(script);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
