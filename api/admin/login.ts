import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { username, password } = req.body || {};
  const uLower = String(username || '').trim().toLowerCase();
  const pass = String(password || '');

  const userOk =
    uLower === 'admin@pruthvi-fx.com' ||
    uLower === 'pruthvifx' ||
    uLower === 'admin';
  const passOk = pass === 'PruthviAdmin2026!#';

  if (userOk && passOk) {
    const token = 'live_admin_session_' + Date.now();
    res.status(200).json({
      ok: true,
      token,
      username: 'admin@pruthvi-fx.com',
    });
  } else {
    res.status(401).json({
      ok: false,
      error: 'Invalid username or password.',
    });
  }
}
