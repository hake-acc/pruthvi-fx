const http = require('http');
const fs = require('fs');
const path = require('path');

let PORT = parseInt(process.env.PORT || process.argv[2] || 3010, 10);
const PUBLIC_DIR = __dirname;

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
  '.riv': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.hdr': 'image/vnd.radiance',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json'
};

// SSE Live Reload Clients
const clients = new Set();

function broadcastReload() {
  for (const client of clients) {
    try {
      client.write('data: reload\n\n');
    } catch (e) {
      clients.delete(client);
    }
  }
}

// Watch for file modifications to trigger live-reload
let debounceTimer = null;
try {
  fs.watch(PUBLIC_DIR, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const ext = path.extname(filename).toLowerCase();
    if (['.html', '.css', '.js', '.json'].includes(ext)) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(`🔄 [LiveReload] Detected change in ${filename}, triggering reload...`);
        broadcastReload();
      }, 150);
    }
  });
} catch (err) {
  console.warn('⚠️ File watcher error:', err.message);
}

const LIVE_RELOAD_SNIPPET = `
<!-- Live Server Auto-Reload -->
<script>
(function() {
  function connect() {
    var es = new EventSource('/live-reload');
    es.onmessage = function(e) {
      if (e.data === 'reload') {
        console.log('[LiveReload] Refreshing page...');
        location.reload();
      }
    };
    es.onerror = function() {
      es.close();
      setTimeout(connect, 2000);
    };
  }
  if (window.EventSource) connect();
})();
</script>
`;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqUrl = req.url.split('?')[0];
  try { reqUrl = decodeURIComponent(reqUrl); } catch (e) {}

  // Live Reload SSE Endpoint
  if (reqUrl === '/live-reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(': connected\n\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, reqUrl);
  if (reqUrl.startsWith('/wp-content/uploads/')) {
    const lamalamaFile = path.join(PUBLIC_DIR, 'images', 'lamalama', path.basename(reqUrl));
    if (fs.existsSync(lamalamaFile)) {
      filePath = lamalamaFile;
    }
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    const idx = path.join(filePath, 'index.html');
    if (fs.existsSync(idx)) filePath = idx;
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    // Inject Live Reload script into HTML responses
    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error loading HTML: ' + err.message);
          return;
        }
        let output = html;
        if (output.includes('</body>')) {
          output = output.replace('</body>', LIVE_RELOAD_SNIPPET + '</body>');
        } else {
          output += LIVE_RELOAD_SNIPPET;
        }
        const buf = Buffer.from(output, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': buf.length
        });
        res.end(buf);
      });
      return;
    }

    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mp3')) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to public/ or root if needed
  const fallbackPath = path.join(__dirname, '..', 'public', reqUrl);
  if (fs.existsSync(fallbackPath) && !fs.statSync(fallbackPath).isDirectory()) {
    const ext = path.extname(fallbackPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(fallbackPath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size
    });
    fs.createReadStream(fallbackPath).pipe(res);
    return;
  }

  const notFound = path.join(PUBLIC_DIR, '404.html');
  if (!/\.(?!html?$)[a-z0-9]+$/i.test(reqUrl) && fs.existsSync(notFound)) {
    const buf = Buffer.from(fs.readFileSync(notFound, 'utf8').replace('</body>', LIVE_RELOAD_SNIPPET + '</body>'), 'utf8');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
    res.end(buf);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + reqUrl);
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n=================================================`);
    console.log(`🚀 Live Server running at: http://localhost:${port}`);
    console.log(`⚡ Live Reload active: changes will auto-refresh`);
    console.log(`=================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️ Port ${PORT} is in use, trying port ${PORT + 1}...`);
    PORT++;
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
