const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Session configuration
const COOKIE_NAME = 'portfolio_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Ephemeral fallback secret if not configured in environment (regenerates per runtime)
const RUNTIME_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// Rate limiting state for brute force protection (in-memory per lambda instance / server)
const loginAttempts = new Map();
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

function getEnvConfig() {
  return {
    adminUsername: (process.env.ADMIN_USERNAME || '').trim(),
    adminPasswordHash: (process.env.ADMIN_PASSWORD_HASH || '').trim(),
    adminPasswordPlain: (process.env.ADMIN_PASSWORD || '').trim(),
    sessionSecret: (process.env.SESSION_SECRET || RUNTIME_SESSION_SECRET).trim(),
    githubToken: (process.env.GITHUB_TOKEN || '').trim(),
    githubOwner: (process.env.GITHUB_OWNER || 'hake-acc').trim(),
    githubRepo: (process.env.GITHUB_REPO || 'pruthvi-fx').trim(),
    githubBranch: (process.env.GITHUB_BRANCH || 'main').trim(),
  };
}

// Rate Limiter
function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS };

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const waitSec = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      error: `Too many failed login attempts. Please try again in ${waitSec} seconds.`,
      waitSec,
    };
  }

  // Clear if window passed
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - entry.count);
  return { allowed: true, remaining };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: null };

  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.firstAttempt = now;
    entry.lockedUntil = null;
  } else {
    entry.count += 1;
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    entry.lockedUntil = now + RATE_LIMIT_LOCKOUT_MS;
  }

  loginAttempts.set(ip, entry);
}

function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}

// Password Verification using Timing-Safe Comparison
function verifyPassword(inputPassword, expectedUser) {
  const config = getEnvConfig();
  if (!inputPassword || typeof inputPassword !== 'string') return false;

  // Fail closed if admin credentials are not configured in environment
  if (!config.adminUsername || expectedUser !== config.adminUsername) return false;

  // 1. If explicit ADMIN_PASSWORD_HASH is set
  if (config.adminPasswordHash) {
    const inputHash = crypto.createHash('sha256').update(inputPassword).digest('hex');
    const a = Buffer.from(inputHash, 'utf-8');
    const b = Buffer.from(config.adminPasswordHash, 'utf-8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  // 2. If plain ADMIN_PASSWORD is set in env
  if (config.adminPasswordPlain) {
    const a = Buffer.from(inputPassword, 'utf-8');
    const b = Buffer.from(config.adminPasswordPlain, 'utf-8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  // Fail closed: no password configured
  console.warn('Authentication rejected: neither ADMIN_PASSWORD_HASH nor ADMIN_PASSWORD is set in environment.');
  return false;
}

// Sign and Verify Session Tokens
function signSessionToken(username) {
  const config = getEnvConfig();
  const now = Date.now();
  const payload = {
    u: username,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.sessionSecret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const config = getEnvConfig();
  const expectedSig = crypto.createHmac('sha256', config.sessionSecret).update(payloadB64).digest('base64url');

  const a = Buffer.from(sig, 'utf-8');
  const b = Buffer.from(expectedSig, 'utf-8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (!payload.u || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

// Cookie Helpers
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

function getSessionCookie(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const parsed = parseCookies(req.headers.cookie || req.headers.Cookie || '');
  return parsed[COOKIE_NAME] || null;
}

function createSessionCookieHeader(token, isLogout = false) {
  if (isLogout) {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const isSecure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecure ? '; Secure' : ''}`;
}

// Auth Middleware Check
function requireAuth(req, res) {
  const token = getSessionCookie(req);
  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: 'Unauthorized. Please log in to access this resource.' });
    return null;
  }
  return session;
}

// Body Parser for serverless or dev server
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // 15MB max payload size limit to prevent memory exhaustion
      if (raw.length > 15 * 1024 * 1024) {
        req.destroy();
        resolve(null);
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Thumbnails File Helpers (Local Filesystem)
function getThumbnailsFilePath() {
  const root = process.cwd();
  return path.join(root, 'assets', 'thumbnails.json');
}

function readLocalThumbnails() {
  try {
    const file = getThumbnailsFilePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.error('Error reading local thumbnails.json:', err.message);
  }
  return [];
}

function writeLocalThumbnails(thumbnails) {
  try {
    const file = getThumbnailsFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(thumbnails, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local thumbnails.json:', err.message);
    return false;
  }
}

// GitHub REST API Integration
async function githubRequest(endpoint, options = {}) {
  const config = getEnvConfig();
  if (!config.githubToken) {
    return { ok: false, status: 0, error: 'GITHUB_TOKEN environment variable is not configured.' };
  }

  const url = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}${endpoint}`;
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${config.githubToken}`,
    'User-Agent': 'Pruthvi-FX-Portfolio-CMS',
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });
    const status = res.status;
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      return {
        ok: false,
        status,
        error: data?.message || `GitHub API error (HTTP ${status})`,
        data,
      };
    }
    return { ok: true, status, data };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

// Get existing file SHA from GitHub
async function getGitHubFileSha(filePath) {
  const config = getEnvConfig();
  const res = await githubRequest(`/contents/${filePath}?ref=${encodeURIComponent(config.githubBranch)}`);
  if (res.ok && res.data && res.data.sha) {
    return res.data.sha;
  }
  return null;
}

// Commit a file to GitHub repository
async function commitFileToGitHub(filePath, contentBuffer, commitMessage) {
  const config = getEnvConfig();
  if (!config.githubToken) {
    return { ok: false, error: 'GITHUB_TOKEN not configured' };
  }

  const existingSha = await getGitHubFileSha(filePath);
  const base64Content = Buffer.isBuffer(contentBuffer)
    ? contentBuffer.toString('base64')
    : Buffer.from(contentBuffer).toString('base64');

  const body = {
    message: commitMessage || `Update ${filePath} via Portfolio CMS`,
    content: base64Content,
    branch: config.githubBranch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const res = await githubRequest(`/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, error: res.error, status: res.status };
  }
  return { ok: true, commitSha: res.data?.commit?.sha || res.data?.content?.sha };
}

// Client IP extractor for rate limiting
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

module.exports = {
  COOKIE_NAME,
  getEnvConfig,
  checkRateLimit,
  recordFailedLogin,
  clearRateLimit,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  parseCookies,
  getSessionCookie,
  createSessionCookieHeader,
  requireAuth,
  readJsonBody,
  readLocalThumbnails,
  writeLocalThumbnails,
  githubRequest,
  getGitHubFileSha,
  commitFileToGitHub,
  getClientIp,
};
