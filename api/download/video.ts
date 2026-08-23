import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { BILI_HEADERS, getVideoPlayUrl } from '../../lib/bilibili';

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
    const bvid = String(req.query.bvid || '').trim();
    const cid = Number(req.query.cid) || 0;
    const qn = Number(req.query.qn) || 80;
    const filenameRaw = String(req.query.filename || 'video').trim();

    if (!bvid || !cid) {
      return res.status(400).send('缺少 bvid 或 cid 参数');
    }

    // 实时重新拉取直链（避免过期）
    const realUrl = await getVideoPlayUrl(bvid, cid, qn);
    if (!realUrl) {
      return res.status(404).send('该清晰度暂不可用，请尝试其他档');
    }

    const filename = `${sanitizeFilename(filenameRaw)}_${qn}P.mp4`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache');

    const stream = await axios({
      method: 'GET',
      url: realUrl,
      responseType: 'stream',
      headers: {
        ...BILI_HEADERS,
        Range: req.headers.range || undefined,
      },
      timeout: 0,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    if (stream.status >= 400) {
      return res
        .status(stream.status || 502)
        .send('视频源请求失败，可能被 B 站风控，请稍后重试');
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
