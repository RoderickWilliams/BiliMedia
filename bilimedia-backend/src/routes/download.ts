import { Router, Request, Response } from 'express';
import axios from 'axios';
import { BILI_HEADERS, getVideoPlayUrl } from '../services/bilibili';

const router = Router();

function sanitizeFilename(raw: string): string {
  return String(raw || 'download')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'download';
}

/**
 * GET /api/download/video
 *   ?bvid=BV1...
 *   &cid=123
 *   &qn=80
 *   &filename=可选文件名
 *
 * 通过后端代理下载 B 站视频（带 Referer），避免防盗链/跨域
 */
router.get('/video', async (req: Request, res: Response) => {
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
});

/**
 * GET /api/download/music
 *   ?url=<已编码的网易云MP3地址>
 *   &name=歌曲名称
 *
 * 通过后端代理下载网易云音乐，避免 Referer 防盗链
 */
router.get('/music', async (req: Request, res: Response) => {
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
});

export default router;

