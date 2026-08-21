import type { VercelRequest, VercelResponse } from '@vercel/node';
import { recognizeMusicFromVideo } from '../lib/netease';

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
    const { title, author } = req.body || {};
    if (!title) {
      return res.status(400).json({ ok: false, message: '缺少 title 参数' });
    }
    const result = await recognizeMusicFromVideo(
      String(title),
      String(author || '')
    );
    const list = result.list.map((s) => ({
      id: s.id,
      name: s.name,
      artists: s.artists,
      album: s.album,
      cover: s.cover,
      duration: s.duration,
      durationText: formatSeconds(s.duration),
      mp3Url: s.mp3Url,
      available: !!s.mp3Url,
      source: '网易云音乐',
    }));
    return res.json({
      ok: true,
      data: {
        accuracy: Number((result.accuracy * 100).toFixed(1)),
        total: list.length,
        list,
      },
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ ok: false, message: e?.message || String(e) });
  }
}
