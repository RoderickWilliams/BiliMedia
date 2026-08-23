import { Router, Request, Response, NextFunction } from 'express';
import { getStore, saveStore, type Store } from '../services/storage';
import { verifyJwt } from '../services/jwt';

const router = Router();

type Bucket = 'downloads' | 'music' | 'favorites';
const BUCKETS: Bucket[] = ['downloads', 'music', 'favorites'];

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getTs(r: any): number {
  if (typeof r.recognizedAt === 'number') return r.recognizedAt;
  if (typeof r.createdAt === 'number') return r.createdAt;
  return 0;
}

function pruneUserBucket(arr: any[], userId: string, maxPerUser: number) {
  const indices: number[] = [];
  arr.forEach((r, i) => { if (r.userId === userId) indices.push(i); });
  if (indices.length <= maxPerUser) return;
  indices.sort((a, b) => a - b);
  const tss = indices.map(i => ({ i, ts: getTs(arr[i]) }));
  tss.sort((a, b) => b.ts - a.ts);
  const toRemove = new Set(tss.slice(maxPerUser).map(x => x.i));
  const sortedIdx = Array.from(toRemove).sort((a, b) => b - a);
  for (const i of sortedIdx) arr.splice(i, 1);
}

// JWT 鉴权中间件
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ ok: false, message: '请先登录', code: 'UNAUTHORIZED' });
  }
  (req as any).userId = payload.sub;
  next();
}

router.use(authMiddleware);

// GET /api/data?bucket=downloads|music|favorites|all
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const bucket = (req.query.bucket as string) || '';
    const store = await getStore();

    if (bucket === 'all') {
      const out: Record<string, any[]> = { downloads: [], music: [], favorites: [] };
      (Object.keys(out) as Bucket[]).forEach(k => {
        out[k] = store[k].filter((r: any) => r.userId === userId).sort((a: any, b: any) => getTs(b) - getTs(a));
      });
      return res.json({ ok: true, data: out });
    }

    if (!BUCKETS.includes(bucket as Bucket)) {
      return res.status(400).json({ ok: false, message: '非法 bucket' });
    }
    const list = (store[bucket as Bucket] as any[])
      .filter((r: any) => r.userId === userId)
      .sort((a, b) => getTs(b) - getTs(a));
    return res.json({ ok: true, data: list });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || '数据获取失败' });
  }
});

// POST /api/data?bucket=downloads|music|favorites
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const bucket = (req.query.bucket as string) || '';
    if (!BUCKETS.includes(bucket as Bucket)) {
      return res.status(400).json({ ok: false, message: '非法 bucket' });
    }

    const record = req.body?.record as Record<string, unknown> | undefined;
    if (!record || typeof record !== 'object') {
      return res.status(400).json({ ok: false, message: '缺少 record' });
    }

    const store = await getStore();
    const arr = store[bucket as Bucket] as any[];
    const toAdd: any = { ...record, userId };
    if (!toAdd.id) toAdd.id = uid();
    const now = Date.now();
    if (toAdd.createdAt == null) toAdd.createdAt = now;
    if (bucket === 'music' && toAdd.recognizedAt == null) toAdd.recognizedAt = now;

    if (bucket === 'favorites') {
      if (arr.some((f: any) => f.userId === userId && f.type === toAdd.type && f.targetId === toAdd.targetId)) {
        return res.json({ ok: true, data: { id: toAdd.id, existed: true } });
      }
    }

    arr.unshift(toAdd);
    pruneUserBucket(arr, userId, 500);
    await saveStore(store);
    return res.json({ ok: true, data: { id: toAdd.id } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || '数据保存失败' });
  }
});

// DELETE /api/data?bucket=downloads|music|favorites&id=xxx
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId as string;
    const bucket = (req.query.bucket as string) || '';
    if (!BUCKETS.includes(bucket as Bucket)) {
      return res.status(400).json({ ok: false, message: '非法 bucket' });
    }
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ ok: false, message: '缺少 id' });
    }

    const store = await getStore();
    const arr = store[bucket as Bucket] as any[];
    const filtered = arr.filter((r: any) => !(r.userId === userId && r.id === id));
    if (filtered.length === arr.length) {
      return res.status(404).json({ ok: false, message: '记录不存在' });
    }
    (store as any)[bucket] = filtered;
    await saveStore(store);
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || '数据删除失败' });
  }
});

export default router;
