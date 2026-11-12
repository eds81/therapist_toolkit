// Step 1 of the Decap CMS GitHub OAuth handshake.
// The CMS's "Login with GitHub" button links here; we redirect to GitHub's
// consent screen, then GitHub sends the browser back to /api/callback.
const crypto = require('crypto');

// Must match the cookie name read in api/callback.js.
const STATE_COOKIE = 'decap_oauth_state';

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing OAUTH_CLIENT_ID environment variable.');
    return;
  }

  // CSRF protection: a one-time random value that GitHub echoes back to the
  // callback, which only accepts it if it matches this cookie.
  const state = crypto.randomBytes(32).toString('hex');

  const redirectUri = `https://${req.headers.host}/api/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    // This repo is public, so public_repo is enough for the CMS to commit
    // content, and read:user covers reading the signed-in user's profile.
    // If the repo ever becomes private, switch 'public_repo' back to 'repo'
    // (private repos can't be written with public_repo).
    scope: 'public_repo,read:user',
    redirect_uri: redirectUri,
    state,
  });

  res.writeHead(302, {
    Location: `https://github.com/login/oauth/authorize?${params.toString()}`,
    'Set-Cookie': `${STATE_COOKIE}=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  });
  res.end();
};
