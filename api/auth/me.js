const { getSessionCookie, verifySessionToken } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const token = getSessionCookie(req);
    const session = verifySessionToken(token);

    if (!session) {
      res.status(200).json({ authenticated: false });
      return;
    }

    res.status(200).json({
      authenticated: true,
      user: {
        username: session.u,
        exp: session.exp,
      },
    });
  } catch (err) {
    console.error('Session validation error:', err);
    res.status(200).json({ authenticated: false });
  }
};
