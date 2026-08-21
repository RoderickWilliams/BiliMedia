import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseBilibiliVideo } from '../lib/bilibili';

const QUALITY_TAGS: Array<{ qn: number; label: string; sub: string; bitrateFactor: number }> = [
  { qn: 120, label: '4K 超清',   sub: '2160P', bitrateFactor: 1.1 },
  { qn: 112, label: '2K 高清',   sub: '1440P', bitrateFactor: 0.7 },
  { qn: 80,  label: '1080P 高清', sub: '1080P', bitrateFactor: 0.38 },
  { qn: 64,  label: '720P 高清',  sub: '720P',  bitrateFactor: 0.18 },
];

function formatSeconds(s: number): string {
  if (!s || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 统一 CORS 头（允许从 GitHub Pages / 其它域名跨域访问）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ ok: false, message: '缺少参数 url' });
    }
    const info = await parseBilibiliVideo(url.trim());

    const qualityOptions = QUALITY_TAGS.map((q) => {
      const available = !!info.playUrls[q.qn];
      const sizeMB = info.duration
        ? Math.max(6, Math.round(info.duration * q.bitrateFactor))
        : 0;
      return {
        qn: q.qn,
        label: q.label,
        sub: q.sub,
        available,
        sizeEstimateMB: sizeMB,
      };
    });

    return res.json({
      ok: true,
      data: {
        bvid: info.bvid,
        cid: info.cid,
        title: info.title,
        author: info.author,
        cover: info.cover,
        duration: info.duration,
        durationText: formatSeconds(info.duration),
        pubdate: info.pubdate,
        description: info.description,
        views: info.views,
        defaultVideoUrl: info.defaultVideoUrl,
        qualityOptions,
        playQnMap: info.playUrls,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
}
