// Step 2 of the Decap CMS GitHub OAuth handshake.
// GitHub redirects here with a one-time `code`; we exchange it server-side
// for an access token (using the secret, which never reaches the browser)
// and hand the token back to the /admin window via postMessage.
module.exports = async (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');

  if (!clientId || !clientSecret) {
    res.status(500).send('Missing OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET environment variables.');
    return;
  }
  if (!code) {
    res.status(400).send('Missing OAuth code from GitHub.');
    return;
  }

  let payload;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const json = await tokenRes.json();

    payload = json.error
      ? { status: 'error', content: { message: json.error_description || json.error } }
      : { status: 'success', content: { token: json.access_token, provider: 'github' } };
  } catch (err) {
    payload = { status: 'error', content: { message: 'Token exchange failed.' } };
  }

  const script = `
    (function() {
      function receiveMessage(e) {
        window.opener.postMessage(
          'authorization:github:${payload.status}:${JSON.stringify(payload.content)}',
          e.origin
        );
        window.removeEventListener('message', receiveMessage, false);
      }
      window.addEventListener('message', receiveMessage, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!doctype html><html><body><script>${script}</script></body></html>`);
};
