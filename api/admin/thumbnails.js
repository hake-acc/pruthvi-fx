const {
  requireAuth,
  readJsonBody,
  readLocalThumbnails,
  writeLocalThumbnails,
  commitFileToGitHub,
  getEnvConfig,
} = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    const thumbnails = readLocalThumbnails();
    res.status(200).json({ ok: true, thumbnails });
    return;
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const body = await readJsonBody(req);
      const { thumbnails, commitMessage } = body || {};

      if (!Array.isArray(thumbnails)) {
        res.status(400).json({ error: 'Payload must contain a "thumbnails" array.' });
        return;
      }

      // Validate and sanitize thumbnails
      const sanitized = thumbnails.map((item, index) => {
        if (!item || typeof item !== 'object') {
          throw new Error(`Invalid thumbnail entry at index ${index}`);
        }
        const rawTitle = item.title && String(item.title).trim();
        const title = (rawTitle && rawTitle !== 'undefined' && rawTitle !== 'null') ? rawTitle : 'Untitled Thumbnail';
        
        const rawImage = item.image && String(item.image).trim();
        const image = (rawImage && rawImage !== 'undefined' && rawImage !== 'null') ? rawImage : '';
        if (!image) {
          throw new Error(`Thumbnail "${title}" requires an image path or URL.`);
        }

        const rawCat = item.category && String(item.category).trim();
        const category = (rawCat && rawCat !== 'undefined' && rawCat !== 'null') ? rawCat : 'General';

        const rawClient = item.client && String(item.client).trim();
        const client = (rawClient && rawClient !== 'undefined' && rawClient !== 'null') ? rawClient : 'Solo';

        const rawAlt = item.alt && String(item.alt).trim();
        const alt = (rawAlt && rawAlt !== 'undefined' && rawAlt !== 'null') ? rawAlt : title;

        const rawId = item.id && String(item.id).trim();
        const id = (rawId && rawId !== 'undefined' && rawId !== 'null') ? rawId : `thumb-${Date.now()}-${index}`;

        return {
          id,
          title,
          image,
          category,
          client,
          alt,
          order: (typeof item.order === 'number' && !isNaN(item.order)) ? item.order : index + 1,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      // Sort by order
      sanitized.sort((a, b) => (a.order || 0) - (b.order || 0));
      // Re-assign order numbers 1..N
      sanitized.forEach((item, idx) => {
        item.order = idx + 1;
      });

      // 1. Write locally
      const writeOk = writeLocalThumbnails(sanitized);
      if (!writeOk) {
        console.warn('Could not write to local filesystem (might be read-only lambda).');
      }

      // 2. Commit to GitHub if token configured
      const config = getEnvConfig();
      let publishedToGithub = false;
      let commitSha = null;
      let githubError = null;

      if (config.githubToken) {
        const jsonContent = JSON.stringify(sanitized, null, 2);
        const msg = commitMessage || `Update portfolio thumbnails (${sanitized.length} items) via Portfolio CMS`;
        const ghRes = await commitFileToGitHub('assets/thumbnails.json', jsonContent, msg);

        if (ghRes.ok) {
          publishedToGithub = true;
          commitSha = ghRes.commitSha;
        } else {
          githubError = ghRes.error || 'Failed to commit to GitHub';
        }
      }

      if (config.githubToken && !publishedToGithub) {
        return res.status(502).json({
          ok: false,
          error: `Failed to commit thumbnails to GitHub: ${githubError}`,
        });
      }

      res.status(200).json({
        ok: true,
        thumbnails: sanitized,
        publishedToGithub,
        commitSha,
        githubConfigured: Boolean(config.githubToken),
        githubError,
        message: publishedToGithub
          ? `Changes committed successfully to GitHub (${commitSha ? commitSha.slice(0, 7) : 'latest'}). Vercel will refresh content.`
          : 'Changes saved locally. (Configure GITHUB_TOKEN in Vercel to automatically push to GitHub).',
      });
    } catch (err) {
      console.error('Error saving thumbnails:', err);
      res.status(400).json({ error: err.message || 'Failed to process thumbnails update.' });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
