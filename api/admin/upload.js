const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  requireAuth,
  readJsonBody,
  commitFileToGitHub,
  getEnvConfig,
} = require('../_utils');

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/x-png': '.png',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { filename, fileData, mimeType } = body || {};

    if (!fileData || typeof fileData !== 'string') {
      res.status(400).json({ error: 'Missing image data (base64 required).' });
      return;
    }

    // Extract base64 payload if it has data URL prefix: data:image/png;base64,...
    let cleanBase64 = fileData;
    let detectedMime = mimeType;
    if (fileData.startsWith('data:')) {
      const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        detectedMime = match[1].toLowerCase();
        cleanBase64 = match[2];
      }
    }

    if (!detectedMime || !ALLOWED_MIME_TYPES[detectedMime]) {
      res.status(400).json({
        error: `Unsupported file format "${detectedMime}". Please upload WebP, PNG, or JPG images.`,
      });
      return;
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0) {
      res.status(400).json({ error: 'Uploaded file is empty.' });
      return;
    }
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({ error: 'File size exceeds maximum allowed limit (10MB).' });
      return;
    }

    // Generate safe, collision-resistant filename
    const ext = ALLOWED_MIME_TYPES[detectedMime] || path.extname(filename || '').toLowerCase() || '.png';
    const originalBase = filename
      ? path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 30)
      : 'thumb';
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const safeFilename = `pruthvi-${originalBase || 'upload'}-${uniqueSuffix}${ext}`;
    const targetRelativePath = `assets/${safeFilename}`;
    const publicUrl = `/${targetRelativePath}`;

    // 1. Write to local assets directory if writable
    try {
      const fullPath = path.join(process.cwd(), targetRelativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, buffer);
    } catch (fsErr) {
      console.warn('Could not save to local filesystem:', fsErr.message);
    }

    // 2. Commit to GitHub repository if GITHUB_TOKEN is available
    const config = getEnvConfig();
    let publishedToGithub = false;
    let commitSha = null;
    let githubError = null;

    if (config.githubToken) {
      const msg = `Upload portfolio thumbnail ${safeFilename} via Portfolio CMS`;
      const ghRes = await commitFileToGitHub(targetRelativePath, buffer, msg);
      if (ghRes.ok) {
        publishedToGithub = true;
        commitSha = ghRes.commitSha;
      } else {
        githubError = ghRes.error || 'Failed to upload image file to GitHub.';
      }
    }

    res.status(200).json({
      ok: true,
      url: publicUrl,
      filename: safeFilename,
      size: buffer.length,
      mimeType: detectedMime || 'image/png',
      publishedToGithub: Boolean(publishedToGithub),
      commitSha: commitSha || null,
      githubConfigured: Boolean(config.githubToken),
      githubError: githubError || null,
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: err.message || 'Failed to process image upload.' });
  }
};
