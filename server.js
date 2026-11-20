const http = require('http');
const https = require('https');
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = req.url.split('?')[0];

  // Alias for app-B43p2XC9.js -> app-zxjZQ-wy.js
  if (reqPath.includes('app-B43p2XC9.js')) {
    const appPath = path.join(PUBLIC_DIR, 'assets', 'app-zxjZQ-wy.js');
    if (fs.existsSync(appPath)) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      });
      fs.createReadStream(appPath).pipe(res);
      return;
    }
  }

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
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      });
      fs.createReadStream(localImg).pipe(res);
      return;
    }
  }

  // Map WordPress /wp-content/uploads requests to local lamalama images or proxy & cache from lamalama.com
  if (reqPath.includes('/wp-content/uploads/')) {
    const filename = path.basename(reqPath);
    let localImg = path.join(PUBLIC_DIR, 'images', 'lamalama', filename);
    if (!fs.existsSync(localImg)) {
      const base = path.basename(filename, path.extname(filename));
      for (const trialExt of ['.webp', '.png', '.jpg', '.jpeg']) {
        const candidate = path.join(PUBLIC_DIR, 'images', 'lamalama', base + trialExt);
        if (fs.existsSync(candidate)) {
          localImg = candidate;
          break;
        }
      }
    }
    if (fs.existsSync(localImg)) {
      const ext = path.extname(localImg).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      });
      fs.createReadStream(localImg).pipe(res);
      return;
    } else {
      // Proxy and cache in the background
      const remoteUrl = `https://lamalama.com${reqPath}`;
      https.get(remoteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, (proxyRes) => {
        if (proxyRes.statusCode === 200) {
          const ext = path.extname(filename).toLowerCase();
          res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || proxyRes.headers['content-type'] || 'image/jpeg',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
          });
          const cacheDir = path.join(PUBLIC_DIR, 'images', 'lamalama');
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          const fileStream = fs.createWriteStream(localImg);
          proxyRes.pipe(fileStream);
          proxyRes.pipe(res);
        } else {
          res.writeHead(proxyRes.statusCode || 404, { 'Content-Type': 'text/plain' });
          res.end('Image not found');
        }
      }).on('error', (err) => {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy error');
      });
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

  // Handle /work or /work/
  if (reqPath === '/work' || reqPath === '/work/') {
    const workPath = fs.existsSync(path.join(PUBLIC_DIR, 'work', 'index.html'))
      ? path.join(PUBLIC_DIR, 'work', 'index.html')
      : path.join(ROOT_DIR, 'work', 'index.html');
    if (fs.existsSync(workPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(workPath).pipe(res);
      return;
    }
  }

  // Handle /projects or /projects/
  if (reqPath === '/projects' || reqPath === '/projects/') {
    const projectsPath = fs.existsSync(path.join(PUBLIC_DIR, 'projects', 'index.html'))
      ? path.join(PUBLIC_DIR, 'projects', 'index.html')
      : path.join(ROOT_DIR, 'projects', 'index.html');
    if (fs.existsSync(projectsPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(projectsPath).pipe(res);
      return;
    }
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

  let stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Directory Index Not Found');
      return;
    }
    stat = fs.statSync(filePath);
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
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
