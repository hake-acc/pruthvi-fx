const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer((req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // Map Sanity CDN requests to local images if requested
  if (reqPath.startsWith('/images/') || reqPath.includes('sanity')) {
    const filename = path.basename(reqPath);
    let localImg = path.join(PUBLIC_DIR, 'images', filename);
    if (!fs.existsSync(localImg)) {
      // Try alternative extensions (.webp, .png, .jpg)
      const base = path.basename(filename, path.extname(filename));
      for (const trialExt of ['.webp', '.png', '.jpg', '.jpeg']) {
        const candidate = path.join(PUBLIC_DIR, 'images', base + trialExt);
        if (fs.existsSync(candidate)) {
          localImg = candidate;
          break;
        }
      }
    }
    if (fs.existsSync(localImg)) {
      const ext = path.extname(localImg).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'image/png',
        'Cache-Control': 'public, max-age=3600'
      });
      fs.createReadStream(localImg).pipe(res);
      return;
    }
  }

  // Handle root
  if (reqPath === '/' || reqPath === '') {
    const indexPath = fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))
      ? path.join(PUBLIC_DIR, 'index.html')
      : path.join(ROOT_DIR, 'pacome.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(indexPath).pipe(res);
    return;
  }

  // Handle /about or /about/
  if (reqPath === '/about' || reqPath === '/about/') {
    const aboutPath = path.join(ROOT_DIR, 'about.html');
    if (fs.existsSync(aboutPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(aboutPath).pipe(res);
      return;
    }
  }

  // Look in PUBLIC_DIR
  let filePath = path.join(PUBLIC_DIR, reqPath);

  // If not found in PUBLIC_DIR, check ROOT_DIR
  if (!fs.existsSync(filePath)) {
    filePath = path.join(ROOT_DIR, reqPath);
  }

  // If still not found, check if it's a SPA route (e.g. /:slug)
  if (!fs.existsSync(filePath)) {
    const ext = path.extname(reqPath);
    if (!ext) {
      // Fallback to index.html for SPA client-side routing
      const indexPath = fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))
        ? path.join(PUBLIC_DIR, 'index.html')
        : path.join(ROOT_DIR, 'pacome.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${req.url}`);
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Directory Index Not Found');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Support range requests for audio/video
  const range = req.headers.range;
  const fileSize = stat.size;

  if (range && (ext === '.ogg' || ext === '.mp3' || ext === '.mp4')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
