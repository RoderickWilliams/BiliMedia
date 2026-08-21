import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getStore, saveStore, type Store } from '../../lib/storage';
import { verifyJwt } from '../../lib/jwt';
import { applyCors, fail, ok, parseBearerToken } from '../../lib/http';

type Bucket = 'downloads' | 'music' | 'favorites';
const BUCKETS: Bucket[] = ['downloads', 'music', 'favorites'];

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 统一数据接口（需登录）：
 *
 * GET /api/data?bucket=downloads|music|favorites|all
 *   - 当前用户的 bucket 记录（按 created 倒序）
 *
 * POST /api/data?bucket=downloads|music|favorites
 *   body: { record: {...} }
 *   - 新增一条记录；自动注入 userId 和 id/createdAt（缺省）
 *
 * DELETE /api/data?bucket=downloads|music|favorites&id=xxx
 *   - 删除当前用户下 id 匹配的记录
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  // 鉴权
  const payload = verifyJwt(parseBearerToken(req));
  if (!payload) return fail(res, 401, '请先登录', { code: 'UNAUTHORIZED' });
  const userId = payload.sub;

  try {
    const method = (req.method || 'GET').toUpperCase();
    const query = req.query || {};
    const bucket = (Array.isArray(query.bucket) ? query.bucket[0] : query.bucket) as string;

    // ============ GET ============
    if (method === 'GET') {
      const store = await getStore();
      if (bucket === 'all') {
        const out = { downloads: [] as any[], music: [] as any[], favorites: [] as any[] };
        (Object.keys(out) as Bucket[]).forEach(k => {
          out[k] = store[k].filter((r: any) => r.userId === userId).sort((a: any, b: any) => getTs(b) - getTs(a));
        });
        return ok(res, out);
      }
      if (!BUCKETS.includes(bucket as Bucket)) return fail(res, 400, '非法 bucket');
      const list = (store[bucket as Bucket] as any[])
        .filter((r: any) => r.userId === userId)
        .sort((a, b) => getTs(b) - getTs(a));
      return ok(res, list);
    }

    // ============ POST ============
    if (method === 'POST') {
      if (!BUCKETS.includes(bucket as Bucket)) return fail(res, 400, '非法 bucket');
      const body = req.body || {};
      const record = body.record as Record<string, unknown> | undefined;
      if (!record || typeof record !== 'object') return fail(res, 400, '缺少 record');
      const store = await getStore();
      const arr = store[bucket as Bucket] as any[];
      const toAdd: any = { ...record, userId };
      if (!toAdd.id) toAdd.id = uid();
      // 下载/音乐/收藏的 created ts 字段不同，统一注入兜底
      const now = Date.now();
      if (toAdd.createdAt == null) toAdd.createdAt = now;
      if (bucket === 'music' && toAdd.recognizedAt == null) toAdd.recognizedAt = now;

      // 收藏：同一 userId/type/targetId 不重复
      if (bucket === 'favorites') {
        if (arr.some((f: any) => f.userId === userId && f.type === toAdd.type && f.targetId === toAdd.targetId)) {
          // 视为幂等成功
          return ok(res, { id: toAdd.id, existed: true });
        }
      }
      // 下载历史：重复检测（同一用户+bvid+qn+filename 同一天的视为重复）可选跳过，保留即可
      arr.unshift(toAdd);
      // 限制单个用户每个 bucket 的数量
      const perUserMax = 500;
      pruneUserBucket(arr, userId, perUserMax);
      await saveStore(store);
      return ok(res, { id: toAdd.id });
    }

    // ============ DELETE ============
    if (method === 'DELETE') {
      if (!BUCKETS.includes(bucket as Bucket)) return fail(res, 400, '非法 bucket');
      const id = Array.isArray(query.id) ? query.id[0] : (query.id as string);
      if (!id) return fail(res, 400, '缺少 id');
      const store = await getStore();
      const arr = store[bucket as Bucket] as any[];
      const filtered = arr.filter((r: any) => !(r.userId === userId && r.id === id));
      if (filtered.length === arr.length) return fail(res, 404, '记录不存在');
      (store as any)[bucket] = filtered;
      await saveStore(store);
      return ok(res);
    }

    return fail(res, 405, 'Method Not Allowed');
  } catch (e: any) {
    return fail(res, 500, e?.message || '数据操作失败');
  }
}

function getTs(r: any): number {
  if (typeof r.recognizedAt === 'number') return r.recognizedAt;
  if (typeof r.createdAt === 'number') return r.createdAt;
  return 0;
}

function pruneUserBucket(arr: any[], userId: string, maxPerUser: number) {
  // 保留最新 maxPerUser 条（按时间倒序后截断）
  const indices: number[] = [];
  arr.forEach((r, i) => { if (r.userId === userId) indices.push(i); });
  if (indices.length <= maxPerUser) return;
  indices.sort((a, b) => a - b);
  const tss = indices.map(i => ({ i, ts: getTs(arr[i]) }));
  tss.sort((a, b) => b.ts - a.ts); // 最新在前
  const toRemove = new Set(tss.slice(maxPerUser).map(x => x.i));
  // 反向删除
  const sortedIdx = Array.from(toRemove).sort((a, b) => b - a);
  for (const i of sortedIdx) arr.splice(i, 1);
}
