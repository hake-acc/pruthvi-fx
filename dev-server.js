const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();

// Map of API routes
const apiRoutes = {
  '/api/thumbnails': require('./api/thumbnails'),
  '/api/auth/login': require('./api/auth/login'),
  '/api/auth/me': require('./api/auth/me'),
  '/api/auth/logout': require('./api/auth/logout'),
  '/api/admin/thumbnails': require('./api/admin/thumbnails'),
  '/api/admin/upload': require('./api/admin/upload'),
  '/api/admin/status': require('./api/admin/status'),
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';

  // API routing
  if (apiRoutes[pathname]) {
    // Add Vercel-like helper methods
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      sendJson(res, res.statusCode || 200, data);
    };

    try {
      await apiRoutes[pathname](req, res);
    } catch (err) {
      console.error('Unhandled API error on', pathname, err);
      if (!res.writableEnded) {
        sendJson(res, 500, { error: 'Internal Server Error' });
      }
    }
    return;
  }

  // Handle /hehdowjwneodhb and /admin hidden routes
  let filePath = '';
  if (pathname === '/hehdowjwneodhb' || pathname === '/hehdowjwneodhb/' || pathname === '/admin' || pathname === '/admin/') {
    filePath = path.join(ROOT, 'hehdowjwneodhb', 'index.html');
  } else {
    filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  }

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to index.html for SPA if not an asset or API call
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/assets/')) {
    const indexPath = path.join(ROOT, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  res.statusCode = 404;
  res.end('Not Found');
});

if (require.main === module) {
  if (!process.env.ADMIN_USERNAME) {
    process.env.ADMIN_USERNAME = 'dev_admin';
  }
  if (!process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASSWORD_HASH) {
    process.env.ADMIN_PASSWORD = 'dev_local_password_123';
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running on http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
    if (process.env.ADMIN_USERNAME === 'dev_admin') {
      console.log(`Development credentials: username=dev_admin, password=dev_local_password_123`);
    }
  });
}

module.exports = server;
