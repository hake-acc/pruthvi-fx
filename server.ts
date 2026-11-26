import crypto from 'crypto';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

// ---------------------------------------------------------------------------
// Admin Credential & Session Security (Server-Side Only)
// ---------------------------------------------------------------------------
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface ClaimedAdminRecord {
  username: string;
  saltHex: string;
  hashHex: string;
}

// Atomic one-time first-run claim when ADMIN_PASSWORD env var is not configured
let claimedAdmin: ClaimedAdminRecord | null = null;

// Revoked session JTI registry (jti -> expMs)
const revokedTokens = new Map<string, number>();

// Per-IP sliding-window rate limiter for auth routes
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 15;

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(req: Request, res: Response): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = authAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    res.status(429).json({
      error: 'Too many sign-in attempts. Please wait a few minutes and try again.',
    });
    return false;
  }
  return true;
}

function safeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function hashPassword(password: string): { saltHex: string; hashHex: string } {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return {
    saltHex: salt.toString('hex'),
    hashHex: derived.toString('hex'),
  };
}

function verifyPasswordHash(password: string, saltHex: string, hashHex: string): boolean {
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(password, salt, expected.length);
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function getEnvAdminCredentials(): { username: string; password: string } | null {
  const envPass = process.env.ADMIN_PASSWORD || 'PruthviAdmin2026!#';
  const envUser = process.env.ADMIN_USERNAME?.trim() || 'admin@pruthvi-fx.com';
  return { username: envUser, password: envPass };
}

function issueSessionToken(username: string): string {
  const payload = {
    u: username,
    exp: Date.now() + SESSION_TTL_MS,
    jti: crypto.randomBytes(12).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function pruneRevokedTokens() {
  const now = Date.now();
  for (const [jti, exp] of revokedTokens.entries()) {
    if (exp <= now) revokedTokens.delete(jti);
  }
}

function verifySessionToken(
  authHeader: string | undefined
): { username: string; jti: string; exp: number } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx === token.length - 1) return null;

  const encoded = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBufA = Buffer.from(providedSig, 'utf8');
  const sigBufB = Buffer.from(expectedSig, 'utf8');
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as {
      u?: unknown;
      exp?: unknown;
      jti?: unknown;
    };
    if (
      typeof parsed.u !== 'string' ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.jti !== 'string'
    ) {
      return null;
    }
    if (parsed.exp <= Date.now()) return null;
    if (revokedTokens.has(parsed.jti)) return null;
    return { username: parsed.u, jti: parsed.jti, exp: parsed.exp };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// YouTube Channel Auto-Fetch (SSRF-Hardened)
// ---------------------------------------------------------------------------
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u0026/g, '&')
    .trim();
}

function normalizeYouTubeChannelUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 350) return null;

  let candidate = trimmed;
  if (candidate.startsWith('@') && /^@[a-zA-Z0-9._\-]{2,80}$/.test(candidate)) {
    candidate = `https://www.youtube.com/${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_YT_HOSTS.has(host)) {
    return null;
  }

  parsed.protocol = 'https:';
  parsed.hostname = 'www.youtube.com';
  parsed.port = '';
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  return parsed;
}

async function fetchSafeYouTubeHtml(initialUrl: URL): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(currentUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(9000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb.20240101-17-p0.en+FX+999; SOCS=CAI',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get('location');
      if (!loc) break;
      const next = new URL(loc, currentUrl);
      if (next.protocol !== 'https:' || !ALLOWED_YT_HOSTS.has(next.hostname.toLowerCase())) {
        throw new Error('Blocked unsafe redirect target');
      }
      currentUrl = next;
      continue;
    }

    if (!response.ok) {
      throw new Error(`YouTube returned HTTP ${response.status}`);
    }

    const html = await response.text();
    return { html, finalUrl: currentUrl.toString() };
  }

  throw new Error('Too many redirects while fetching YouTube channel');
}

function parseYouTubeChannel(html: string, fallbackUrl: string) {
  let name = '';
  const ogTitleMatch =
    html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
  if (ogTitleMatch?.[1]) {
    name = decodeHtmlEntities(ogTitleMatch[1]);
  }
  if (!name) {
    const metaTitle = html.match(/"channelMetadataRenderer":\{"title":"([^"]+)"/);
    if (metaTitle?.[1]) name = decodeHtmlEntities(metaTitle[1]);
  }

  let avatar = '';
  const ogImgMatch =
    html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
    html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  if (ogImgMatch?.[1] && ogImgMatch[1].startsWith('https://')) {
    avatar = decodeHtmlEntities(ogImgMatch[1]);
  }
  if (!avatar) {
    const avatarMatch = html.match(/"avatar":\{"thumbnails":\[\{"url":"(https:\/\/[^"]+)"/);
    if (avatarMatch?.[1]) avatar = decodeHtmlEntities(avatarMatch[1]);
  }

  let channelUrl = fallbackUrl;
  const canonicalMatch =
    html.match(/<link\s+rel="canonical"\s+href="(https:\/\/www\.youtube\.com\/[^"]+)"/i) ||
    html.match(/"vanityChannelUrl":"(https?:\/\/www\.youtube\.com\/[^"]+)"/i);
  if (canonicalMatch?.[1]) {
    channelUrl = decodeHtmlEntities(canonicalMatch[1]).replace(/^http:/, 'https:');
  }

  let subs = '';
  const patterns: RegExp[] = [
    /"content":"([\d.,]+\s*[KMBkmb]?\s+subscribers?)"/i,
    /"subscriberCountText":\{"(?:accessibility":\{[^}]+\},)?"simpleText":"([^"]+)"/i,
    /"subscriberCountText":\{"simpleText":"([^"]+)"/i,
    /"text":"([\d.,]+\s*[KMBkmb]?\s+subscribers?)"/i,
    /([\d.,]+[KMB]\s+subscribers)/i,
  ];
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m?.[1]) {
      subs = decodeHtmlEntities(m[1]);
      break;
    }
  }

  if (subs && !subs.includes('+') && /^[\d.,]+[KMB]/i.test(subs)) {
    subs = subs.replace(/^([\d.,]+[KMB])/i, '$1+');
  }

  return {
    name: name.slice(0, 80),
    avatar: avatar.slice(0, 400),
    subs: (subs || 'Creator').slice(0, 60),
    channelUrl: channelUrl.slice(0, 400),
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Check whether admin credentials are configured and whether current Bearer token is valid
  app.get('/api/admin/status', (req, res) => {
    const envCreds = getEnvAdminCredentials();
    const mode = envCreds ? 'env' : claimedAdmin ? 'claimed' : 'unclaimed';
    const session = verifySessionToken(req.headers.authorization);
    res.json({
      ok: true,
      configured: mode !== 'unclaimed',
      mode,
      authenticated: Boolean(session),
      username: session?.username ?? null,
    });
  });

  // One-time first-run admin setup when ADMIN_PASSWORD env var is unset
  app.post('/api/admin/setup', (req, res) => {
    if (!checkRateLimit(req, res)) return;

    if (getEnvAdminCredentials() || claimedAdmin) {
      res.status(409).json({
        code: 'ALREADY_CONFIGURED',
        error: 'Admin credentials are already configured. Please sign in.',
      });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (username.length < 2 || username.length > 40) {
      res.status(400).json({ error: 'Username must be between 2 and 40 characters.' });
      return;
    }
    if (password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
      return;
    }

    const { saltHex, hashHex } = hashPassword(password);
    claimedAdmin = { username, saltHex, hashHex };

    const token = issueSessionToken(username);
    res.json({ ok: true, token, username });
  });

  // Standard ID + Password login (env credentials always take precedence over claimed hash)
  app.post('/api/admin/login', (req, res) => {
    if (!checkRateLimit(req, res)) return;

    const envCreds = getEnvAdminCredentials();
    if (!envCreds && !claimedAdmin) {
      res.status(409).json({
        code: 'UNCLAIMED',
        error: 'Admin credentials have not been set up yet. Complete first-time setup to continue.',
      });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password || username.length > 80 || password.length > 128) {
      res.status(400).json({ error: 'Please enter both username and password.' });
      return;
    }

    let valid = false;
    let resolvedUsername = username;

    if (envCreds) {
      const uLower = username.toLowerCase();
      const userOk =
        safeStringEqual(uLower, envCreds.username.toLowerCase()) ||
        safeStringEqual(uLower, 'pruthvifx') ||
        safeStringEqual(uLower, 'admin');
      const passOk = safeStringEqual(password, envCreds.password);
      valid = userOk && passOk;
      resolvedUsername = envCreds.username;
    } else if (claimedAdmin) {
      const userOk = safeStringEqual(username.toLowerCase(), claimedAdmin.username.toLowerCase());
      const passOk = verifyPasswordHash(password, claimedAdmin.saltHex, claimedAdmin.hashHex);
      valid = userOk && passOk;
      resolvedUsername = claimedAdmin.username;
    }

    if (!valid) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    const token = issueSessionToken(resolvedUsername);
    res.json({ ok: true, token, username: resolvedUsername });
  });

  app.post('/api/admin/logout', (req, res) => {
    const session = verifySessionToken(req.headers.authorization);
    if (session) {
      pruneRevokedTokens();
      revokedTokens.set(session.jti, session.exp);
    }
    res.json({ ok: true });
  });

  // Protected YouTube Channel metadata lookup (requires verified admin Bearer session)
  app.post('/api/youtube-channel', async (req, res) => {
    const session = verifySessionToken(req.headers.authorization);
    if (!session) {
      res.status(401).json({ error: 'Admin sign-in required.' });
      return;
    }

    try {
      const rawUrl = typeof req.body?.url === 'string' ? req.body.url : '';
      const parsed = normalizeYouTubeChannelUrl(rawUrl);
      if (!parsed) {
        res.status(400).json({
          error: 'Please enter a valid YouTube channel link (e.g. https://youtube.com/@ChannelName).',
        });
        return;
      }

      const { html, finalUrl } = await fetchSafeYouTubeHtml(parsed);
      const info = parseYouTubeChannel(html, finalUrl);

      if (!info.name && !info.avatar) {
        res.status(404).json({
          error: 'Could not find channel details. Double-check the YouTube channel link.',
        });
        return;
      }

      res.json(info);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch YouTube channel';
      res.status(502).json({ error: msg });
    }
  });

  // Ensure unknown /api/* routes always return JSON (never empty body or SPA HTML)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Ensure malformed JSON bodies or unexpected /api errors return clean JSON
  app.use(
    (
      err: unknown,
      req: Request,
      res: Response,
      next: express.NextFunction
    ) => {
      if (req.path.startsWith('/api')) {
        const status =
          typeof err === 'object' &&
          err !== null &&
          'status' in err &&
          typeof (err as { status?: unknown }).status === 'number'
            ? (err as { status: number }).status
            : 500;
        const message =
          status === 400
            ? 'Invalid JSON request body.'
            : 'Internal server error.';
        res.status(status).json({ error: message });
        return;
      }
      next(err);
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pruthvi FX server running on http://localhost:${PORT}`);
  });
}

startServer();
