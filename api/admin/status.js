const { requireAuth, getEnvConfig, githubRequest } = require('../_utils');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const session = requireAuth(req, res);
  if (!session) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const config = getEnvConfig();
  const hasToken = Boolean(config.githubToken && config.githubToken.length > 5);

  const status = {
    authenticated: true,
    user: session.u || 'Admin',
    github: {
      configured: hasToken,
      owner: config.githubOwner || 'hake-acc',
      repo: config.githubRepo || 'pruthvi-fx',
      branch: config.githubBranch || 'main',
      connected: false,
      error: null,
    },
  };

  if (hasToken) {
    // Verify connection to GitHub
    const ghRes = await githubRequest('');
    if (ghRes.ok && ghRes.data) {
      status.github.connected = true;
      status.github.defaultBranch = ghRes.data.default_branch;
      status.github.permissions = ghRes.data.permissions || {};
    } else {
      status.github.connected = false;
      status.github.error = ghRes.error || 'Failed to connect to GitHub with provided token.';
    }
  }

  res.status(200).json(status);
};
