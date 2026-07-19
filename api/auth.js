export default async function handler(req, res) {
  const { code, provider } = req.query;

  if (!code || provider !== 'github') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    // Exchange code for access token
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

    // Return token to CMS
    const script = `
      <script>
        (function() {
          function recieveMessage(e) {
            console.log("Received message:", e);
            window.opener.postMessage(
              'authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}',
              e.origin
            );
            window.removeEventListener("message", recieveMessage, false);
          }
          window.addEventListener("message", recieveMessage, false);
          console.log("Posting message:", ${JSON.stringify({ token: data.access_token, provider: 'github' })});
          window.opener.postMessage("authorizing:github", "*");
        })();
      </script>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(script);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
