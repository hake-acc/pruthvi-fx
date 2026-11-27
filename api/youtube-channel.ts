import type { VercelRequest, VercelResponse } from '@vercel/node';

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

function normalizeUrl(raw: string): string | null {
  let val = raw.trim();
  if (!val || val.length > 300) return null;
  if (val.startsWith('@')) {
    val = `https://www.youtube.com/${val}`;
  } else if (!/^https?:\/\//i.test(val)) {
    val = `https://${val}`;
  }
  try {
    const parsed = new URL(val);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ') || authHeader.length < 10) {
    res.status(401).json({ ok: false, error: 'Admin sign-in required.' });
    return;
  }

  const rawUrl = typeof req.body?.url === 'string' ? req.body.url : '';
  const targetUrl = normalizeUrl(rawUrl);

  if (!targetUrl) {
    res.status(400).json({
      ok: false,
      error: 'Please enter a valid YouTube channel link (e.g. https://youtube.com/@MrBeast).',
    });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb.20240101-17-p0.en+FX+999; SOCS=CAI',
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube returned status ${response.status}`);
    }

    const html = await response.text();

    let name = '';
    const ogTitle =
      html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:title"/i)?.[1];
    if (ogTitle) name = decodeHtmlEntities(ogTitle);
    if (!name) {
      const metaTitle = html.match(/"channelMetadataRenderer":\{"title":"([^"]+)"/);
      if (metaTitle?.[1]) name = decodeHtmlEntities(metaTitle[1]);
    }

    let avatar = '';
    const ogImg =
      html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)?.[1] ||
      html.match(/<meta\s+content="([^"]+)"\s+(?:property|name)="og:image"/i)?.[1];
    if (ogImg && ogImg.startsWith('https://')) {
      avatar = decodeHtmlEntities(ogImg);
    }
    if (!avatar) {
      const avatarMatch = html.match(/"avatar":\{"thumbnails":\[\{"url":"(https:\/\/[^"]+)"/);
      if (avatarMatch?.[1]) avatar = decodeHtmlEntities(avatarMatch[1]);
    }

    let channelUrl = targetUrl;
    const canonicalMatch =
      html.match(/<link\s+rel="canonical"\s+href="(https:\/\/www\.youtube\.com\/[^"]+)"/i) ||
      html.match(/"vanityChannelUrl":"(https?:\/\/www\.youtube\.com\/[^"]+)"/i);
    if (canonicalMatch?.[1]) {
      channelUrl = decodeHtmlEntities(canonicalMatch[1]).replace(/^http:/, 'https:');
    }

    let subs = '';
    const patterns = [
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

    if (!name && !avatar) {
      res.status(404).json({
        ok: false,
        error: 'Could not find channel details. Double-check the YouTube channel link.',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      name: name.slice(0, 80),
      avatar,
      subs: subs.slice(0, 40) || 'Active Creator',
      channelUrl,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch YouTube channel';
    res.status(502).json({ ok: false, error: msg });
  }
}
