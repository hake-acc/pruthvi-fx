const { readLocalThumbnails } = require('./_utils');

module.exports = async function handler(req, res) {
  // CORS & Caching
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const thumbnails = readLocalThumbnails();
    // Cache for 60s at edge, stale-while-revalidate for 5 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).json(thumbnails);
  } catch (err) {
    console.error('API /api/thumbnails error:', err);
    res.status(500).json({ error: 'Failed to retrieve thumbnails' });
  }
};
