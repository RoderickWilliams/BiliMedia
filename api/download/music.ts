import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { BILI_HEADERS } from '../../lib/bilibili';

function sanitizeFilename(raw: string): string {
  return String(raw || 'download')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'download';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 统一 CORS 头（允许从 GitHub Pages / 其它域名跨域访问）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const url = decodeURIComponent(String(req.query.url || ''));
    const name = String(req.query.name || 'music').trim();

    if (!url) {
      return res.status(400).send('缺少 url 参数');
    }
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).send('url 格式不合法');
    }

    const filename = `${sanitizeFilename(name)}.mp3`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      headers: {
        'User-Agent': BILI_HEADERS['User-Agent'],
        Accept: '*/*',
      },
      timeout: 0,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    if (stream.status >= 400) {
      return res
        .status(stream.status || 502)
        .send('音乐下载失败，可能是版权原因暂无资源');
    }

    if (stream.headers['content-length']) {
      res.setHeader('Content-Length', String(stream.headers['content-length']));
    }
    stream.data.pipe(res);
  } catch (e: any) {
    if (!res.headersSent) {
      res.status(500).send(`下载失败：${e?.message || e}`);
    } else {
      try { res.end(); } catch { /* ignore */ }
    }
  }
}
