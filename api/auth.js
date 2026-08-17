import {
  parseAllowedOrigins,
  generateCSRFState,
  setSecureStateCookie,
  validateCSRFState
} from './security-utils.js';

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
