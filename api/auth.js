// Step 1 of the Decap CMS GitHub OAuth handshake.
// The CMS's "Login with GitHub" button links here; we redirect to GitHub's
// consent screen, then GitHub sends the browser back to /api/callback.
module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing OAUTH_CLIENT_ID environment variable.');
    return;
  }

  const redirectUri = `https://${req.headers.host}/api/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo,user',
    redirect_uri: redirectUri,
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
};
