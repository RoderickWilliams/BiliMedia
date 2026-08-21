import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUsers } from '../../lib/storage';
import { hashPassword, signJwt } from '../../lib/jwt';
import { applyCors, fail, ok } from '../../lib/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method Not Allowed');

  try {
    const body = req.body || {};
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) return fail(res, 400, '用户名和密码不能为空');

    const users = await getUsers();
    const found = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!found) return fail(res, 401, '用户名或密码错误');

    const hashed = hashPassword(password, found.salt);
    if (hashed !== found.passwordHash) return fail(res, 401, '用户名或密码错误');

    const token = signJwt(found);
    return ok(res, {
      token,
      user: { id: found.id, username: found.username, email: found.email, createdAt: found.createdAt },
    });
  } catch (e: any) {
    return fail(res, 500, e?.message || '登录失败');
  }
}
