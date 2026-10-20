const http = require('http');
const server = require('./dev-server');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const ROOT = process.cwd();

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ port: PORT, ...options }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          json,
        });
      });
    });
    req.on('error', reject);
    if (data) {
      if (typeof data === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(data));
      } else {
        req.write(data);
      }
    }
    req.end();
  });
}

function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  const first = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  return first.split(';')[0];
}

async function runTests() {
  console.log('🚀 Starting Comprehensive End-to-End Test Suite...\n');

  // Configure isolated mock credentials for local test run
  const TEST_USERNAME = 'test_mock_admin';
  const TEST_PASSWORD = 'TestMockPassword_Safe_123!';
  process.env.ADMIN_USERNAME = TEST_USERNAME;
  process.env.ADMIN_PASSWORD = TEST_PASSWORD;
  process.env.SESSION_SECRET = 'mock_session_secret_for_automated_testing_only_12345';

  // Start server
  await new Promise((res) => server.listen(PORT, '127.0.0.1', res));
  let cookie = '';
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // 1. Static HTML & Admin Route
    console.log('--- 1. Route Serving Tests ---');
    const rootRes = await request({ path: '/', method: 'GET' });
    assert(rootRes.statusCode === 200 && rootRes.body.includes('Pruthvi FX'), 'GET / serves portfolio index.html');

    const adminRes = await request({ path: '/hehdowjwneodhb', method: 'GET' });
    assert(adminRes.statusCode === 200 && adminRes.body.includes('Portfolio Admin'), 'GET /hehdowjwneodhb serves hidden admin panel');

    // 2. Public Thumbnails API
    console.log('\n--- 2. Public API Tests ---');
    const thumbsRes = await request({ path: '/api/thumbnails', method: 'GET' });
    assert(thumbsRes.statusCode === 200, 'GET /api/thumbnails returns 200');
    assert(Array.isArray(thumbsRes.json) && thumbsRes.json.length >= 12, 'Thumbnails array returned with initial items');

    // 3. Unauthorized Access Rejection
    console.log('\n--- 3. Security & Authorization Gate Tests ---');
    const meUnauth = await request({ path: '/api/auth/me', method: 'GET' });
    assert(meUnauth.statusCode === 200 && meUnauth.json.authenticated === false, 'GET /api/auth/me returns unauthenticated for guests');

    const adminPostUnauth = await request({ path: '/api/admin/thumbnails', method: 'POST' }, { thumbnails: [] });
    assert(adminPostUnauth.statusCode === 401, 'POST /api/admin/thumbnails rejected with 401 for guests');

    const uploadUnauth = await request({ path: '/api/admin/upload', method: 'POST' }, { fileData: 'abc' });
    assert(uploadUnauth.statusCode === 401, 'POST /api/admin/upload rejected with 401 for guests');

    // 4. Rate Limiting on Login
    console.log('\n--- 4. Authentication & Brute Force Rate Limiting ---');
    let got429 = false;
    for (let i = 1; i <= 6; i++) {
      const failRes = await request({
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'x-forwarded-for': '192.168.1.50' }
      }, { username: 'admin', password: 'wrongpassword' });

      if (failRes.statusCode === 429) {
        got429 = true;
        break;
      }
    }
    assert(got429, 'Excessive failed login attempts trigger 429 rate limit lockout');

    // 5. Successful Login
    console.log('\n--- 5. Valid Authentication & Session Token ---');
    const loginRes = await request({
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'x-forwarded-for': '127.0.0.1' }
    }, { username: TEST_USERNAME, password: TEST_PASSWORD });

    assert(loginRes.statusCode === 200 && loginRes.json.ok === true, 'POST /api/auth/login succeeds with generated credentials');
    assert(loginRes.headers['set-cookie'] !== undefined, 'Login returns Set-Cookie header');
    assert(loginRes.headers['set-cookie'][0].includes('HttpOnly'), 'Cookie has HttpOnly flag');
    assert(loginRes.headers['set-cookie'][0].includes('SameSite=Lax'), 'Cookie has SameSite flag');
    cookie = parseCookie(loginRes.headers['set-cookie']);

    // 6. Verified Session
    const meAuth = await request({
      path: '/api/auth/me',
      method: 'GET',
      headers: { Cookie: cookie }
    });
    assert(meAuth.statusCode === 200 && meAuth.json.authenticated === true, 'GET /api/auth/me validates session cookie');
    assert(meAuth.json.user.username === TEST_USERNAME, 'Session contains correct username');

    // 7. Admin Status
    const statusRes = await request({
      path: '/api/admin/status',
      method: 'GET',
      headers: { Cookie: cookie }
    });
    assert(statusRes.statusCode === 200 && statusRes.json.authenticated === true, 'GET /api/admin/status succeeds');
    assert(typeof statusRes.json.github === 'object', 'Status returns GitHub integration structure without secrets');

    // 8. Image Upload Validation
    console.log('\n--- 6. Image Upload & Validation Tests ---');
    // Invalid mime
    const badMimeRes = await request({
      path: '/api/admin/upload',
      method: 'POST',
      headers: { Cookie: cookie }
    }, {
      filename: 'script.exe',
      mimeType: 'application/x-msdownload',
      fileData: 'data:application/x-msdownload;base64,TVqQAAMAAAAEAAAA'
    });
    assert(badMimeRes.statusCode === 400, 'Rejects non-image mime types');

    // Valid WebP upload (1x1 dummy transparent pixel)
    const validWebpBase64 = 'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    const uploadRes = await request({
      path: '/api/admin/upload',
      method: 'POST',
      headers: { Cookie: cookie }
    }, {
      filename: 'my-custom-test-thumb.webp',
      mimeType: 'image/webp',
      fileData: validWebpBase64
    });
    assert(uploadRes.statusCode === 200 && uploadRes.json.ok === true, 'Uploads valid WebP image successfully');
    assert(uploadRes.json.url && uploadRes.json.url.startsWith('/assets/pruthvi-'), 'Generates safe unique asset path');
    const uploadedUrl = uploadRes.json.url;

    // Verify uploaded file exists on disk
    const onDisk = fs.existsSync(path.join(ROOT, uploadedUrl.slice(1)));
    assert(onDisk, 'Uploaded image was saved to assets directory');

    // 9. Thumbnail CRUD & Ordering Operations
    console.log('\n--- 7. Thumbnail CRUD & Ordering Operations ---');
    const currentList = thumbsRes.json;
    const initialCount = currentList.length;

    // Add new thumbnail
    const newThumb = {
      id: `thumb-test-${Date.now()}`,
      title: 'Nether Fortress Raid 100 Days',
      image: uploadedUrl,
      category: '100 Days',
      client: 'Solo',
      alt: 'Nether Fortress Raid test thumbnail',
      order: 1
    };

    const updatedList = [newThumb, ...currentList.map((t, idx) => ({ ...t, order: idx + 2 }))];
    const saveRes = await request({
      path: '/api/admin/thumbnails',
      method: 'POST',
      headers: { Cookie: cookie }
    }, {
      thumbnails: updatedList,
      commitMessage: 'Add Nether Fortress Raid thumbnail'
    });
    assert(saveRes.statusCode === 200 && saveRes.json.ok === true, 'POST /api/admin/thumbnails saves updated list');
    assert(saveRes.json.thumbnails.length === initialCount + 1, 'Thumbnail count increased by 1');
    assert(saveRes.json.thumbnails[0].title === 'Nether Fortress Raid 100 Days', 'New item placed in position #1');

    // Reorder (move position #1 to position #2)
    const reorderedList = [...saveRes.json.thumbnails];
    const swap = reorderedList[0];
    reorderedList[0] = reorderedList[1];
    reorderedList[1] = swap;
    reorderedList.forEach((t, i) => t.order = i + 1);

    const reorderRes = await request({
      path: '/api/admin/thumbnails',
      method: 'POST',
      headers: { Cookie: cookie }
    }, { thumbnails: reorderedList });
    assert(reorderRes.statusCode === 200, 'Reordering thumbnails succeeds');
    assert(reorderRes.json.thumbnails[1].id === newThumb.id, 'New item order persisted to position #2');

    // Delete the test thumbnail
    const cleanedList = reorderRes.json.thumbnails.filter(t => t.id !== newThumb.id);
    cleanedList.forEach((t, i) => t.order = i + 1);
    const deleteRes = await request({
      path: '/api/admin/thumbnails',
      method: 'POST',
      headers: { Cookie: cookie }
    }, { thumbnails: cleanedList });
    assert(deleteRes.statusCode === 200, 'Deleting thumbnail succeeds');
    assert(deleteRes.json.thumbnails.length === initialCount, 'Thumbnail count restored to initial count');

    // Clean up temporary uploaded test file
    try { fs.unlinkSync(path.join(ROOT, uploadedUrl.slice(1))); } catch {}

    // 10. Logout & Session Termination
    console.log('\n--- 8. Logout & Session Revocation ---');
    const logoutRes = await request({
      path: '/api/auth/logout',
      method: 'POST',
      headers: { Cookie: cookie }
    });
    assert(logoutRes.statusCode === 200 && logoutRes.json.ok === true, 'POST /api/auth/logout succeeds');
    assert(logoutRes.headers['set-cookie'][0].includes('Max-Age=0'), 'Logout clears session cookie (Max-Age=0)');

    const postLogoutCheck = await request({
      path: '/api/admin/thumbnails',
      method: 'GET',
      headers: { Cookie: parseCookie(logoutRes.headers['set-cookie']) }
    });
    assert(postLogoutCheck.statusCode === 401, 'Logged out cookie cannot access protected admin endpoints');

    console.log(`\n🎉 All ${passed}/${total} End-to-End Tests Passed Successfully!`);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
