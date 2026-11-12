// Step 2 of the Decap CMS GitHub OAuth handshake.
// GitHub redirects here with a one-time `code`; we exchange it server-side
// for an access token (using the secret, which never reaches the browser)
// and hand the token back to the /admin window via postMessage — but only to
// a trusted origin, so no other site can open this popup and receive it.
const crypto = require('crypto');

// Must match the cookie name set in api/auth.js.
const STATE_COOKIE = 'decap_oauth_state';

// Origins allowed to receive the token: this deployment, plus any extra
// origins (Vercel preview URLs, a custom domain) listed comma-separated in
// the ALLOWED_ORIGINS environment variable. Each value is normalized to a bare
// origin (scheme + host + port) so a trailing slash or path doesn't break the
// exact match against MessageEvent.origin; invalid values are ignored.
function allowedOrigins(req) {
  const origins = new Set([`https://${req.headers.host}`]);
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .forEach(value => {
      try {
        origins.add(new URL(value).origin);
      } catch (err) {
        // not a valid URL — skip it
      }
    });
  return [...origins];
}

// JSON for embedding inside an inline <script>: escapes characters that
// could close the script tag or break the JavaScript string.
function scriptSafeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

// Constant-time comparison so the check doesn't leak how much of the state matched.
function statesMatch(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
  // Never cache this response, and never leak the URL (which carries the
  // one-time code) to other sites through the Referer header.
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const expectedState = readCookie(req, STATE_COOKIE);

  // The state is single-use: clear the cookie whatever happens next.
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);

  if (!clientId || !clientSecret) {
    res.status(500).send('Missing OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET environment variables.');
    return;
  }
  if (!state || !expectedState || !statesMatch(state, expectedState)) {
    res.status(400).send('Invalid or missing OAuth state. Please close this window and try logging in again.');
    return;
  }
  if (!code) {
    res.status(400).send('Missing OAuth code from GitHub.');
    return;
  }

  let status;
  let content;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const json = await tokenRes.json();

    if (json.error) {
      status = 'error';
      content = { message: json.error_description || json.error };
    } else {
      status = 'success';
      content = { token: json.access_token, provider: 'github' };
    }
  } catch (err) {
    status = 'error';
    content = { message: 'Token exchange failed.' };
  }

  // Built server-side and embedded as escaped JSON, so nothing in the message
  // (e.g. a quote or "</script>" in an error) can break out of the script.
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;

  const script = `
    (function() {
      var allowedOrigins = ${scriptSafeJson(allowedOrigins(req))};
      var message = ${scriptSafeJson(message)};

      if (!window.opener) {
        document.body.textContent = 'You can close this window.';
        return;
      }

      function receiveMessage(e) {
        // Only answer the CMS window on a trusted origin, and only its
        // handshake reply; ignore everything else and keep listening.
        if (allowedOrigins.indexOf(e.origin) === -1 || e.data !== 'authorizing:github') return;
        window.removeEventListener('message', receiveMessage, false);
        window.opener.postMessage(message, e.origin);
      }
      window.addEventListener('message', receiveMessage, false);

      // Start the handshake with the opener. Each post only arrives if the
      // opener is actually on that origin; no wildcard target is used.
      allowedOrigins.forEach(function(origin) {
        window.opener.postMessage('authorizing:github', origin);
      });
    })();
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html><html><body><script>${script}</script></body></html>`);
};
