import crypto from 'crypto';
import { parseAllowedOrigins } from './security-utils.js';

// Helper: Generate cryptographically random CSRF state
function generateCSRFState() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper: Set secure state cookie
function setSecureStateCookie(res, state) {
  res.setHeader('Set-Cookie', [
    `oauth_state=${state}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=300`, // 5 minutes
    'Path=/api/auth'
  ].join('; '));
}

// Helper: Clear state cookie
function clearStateCookie(res) {
  res.setHeader('Set-Cookie', [
    'oauth_state=',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
    'Path=/api/auth'
  ].join('; '));
}

// Helper: Validate CSRF state
function validateCSRFState(req, res) {
  const callbackState = req.query.state;
  const cookies = req.headers.cookie || '';
  const cookieMatch = cookies.match(/oauth_state=([^;]+)/);
  const cookieState = cookieMatch ? cookieMatch[1] : null;

  if (!callbackState || !cookieState || callbackState !== cookieState) {
    res.send(`
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

export default async function handler(req, res) {
  const { code, error } = req.query;

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
    const scope = 'repo,user';

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
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
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

    const data = await tokenResponse.json();

    if (data.error) {
      return res.status(400).json({ error: data.error_description || data.error });
    }

    // Parse allowed origins for client-side validation
    let allowedOrigins;
    try {
      allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
    } catch (error) {
      console.error('[SECURITY ALERT] ALLOWED_ORIGINS not configured for OAuth:', error.message);
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
    const script = `
      <!DOCTYPE html>
      <html>
      <head><title>Authorizing...</title></head>
      <body>
        <p>Authorization successful. Closing window...</p>
        <script>
          (function() {
            const allowedOrigins = ${JSON.stringify(allowedOrigins)};

            function receiveMessage(e) {
              // Validate origin before sending token
              if (!allowedOrigins.includes(e.origin)) {
                document.body.innerHTML = '<h1 role="alert">Authentication failed due to a security policy. Please try again or contact support.</h1>';
                console.error('Popup origin not allowed:', e.origin);
                return;
              }

              // Send token to validated origin only (no wildcard)
              window.opener.postMessage(
                'authorization:github:success:' + JSON.stringify({
                  token: '${data.access_token}',
                  provider: 'github'
                }),
                e.origin
              );
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);

            // Initial message to specific origin (determine from window.opener)
            if (window.opener) {
              window.opener.postMessage("authorizing:github", window.location.origin);
            }
          })();
        </script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(script);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
