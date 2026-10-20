const {
  verifyPassword,
  signSessionToken,
  createSessionCookieHeader,
  checkRateLimit,
  recordFailedLogin,
  clearRateLimit,
  getClientIp,
  readJsonBody,
} = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const clientIp = getClientIp(req);

  // Rate Limiting Check
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    res.status(429).json({ error: rateLimit.error });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { username, password } = body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      recordFailedLogin(clientIp);
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const trimmedUser = username.trim();
    const isValid = verifyPassword(password, trimmedUser);

    if (!isValid) {
      recordFailedLogin(clientIp);
      const updated = checkRateLimit(clientIp);
      const warning = updated.remaining > 0 ? ` (${updated.remaining} attempts remaining)` : '';
      res.status(401).json({ error: `Invalid username or password.${warning}` });
      return;
    }

    // Success: clear rate limiting and generate secure session
    clearRateLimit(clientIp);
    const token = signSessionToken(trimmedUser);
    const cookieHeader = createSessionCookieHeader(token);

    res.setHeader('Set-Cookie', cookieHeader);
    res.status(200).json({
      ok: true,
      user: {
        username: trimmedUser,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected authentication error occurred.' });
  }
};
