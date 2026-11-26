import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const authHeader = String(req.headers.authorization || '');
  const authenticated = authHeader.startsWith('Bearer ') && authHeader.length > 10;
  res.status(200).json({
    ok: true,
    configured: true,
    authenticated,
  });
}
