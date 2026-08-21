import { Router, Request, Response } from 'express';
import { recognizeMusicFromVideo } from '../services/netease';

const router = Router();

function formatSeconds(s: number): string {
  if (!s || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

router.post('/', async (req: Request, res: Response) => {
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
});

export default router;
