const { createSessionCookieHeader } = require('../_utils');

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

  // Clear cookie
  const clearCookie = createSessionCookieHeader('', true);
  res.setHeader('Set-Cookie', clearCookie);
  res.status(200).json({ ok: true });
};
