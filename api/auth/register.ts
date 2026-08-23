import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUsers, saveUsers } from '../../lib/storage';
import { newSalt, hashPassword, signJwt } from '../../lib/jwt';
import { applyCors, fail, ok } from '../../lib/http';

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method Not Allowed');

  try {
    const body = req.body || {};
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (username.length < 2) return fail(res, 400, '用户名至少 2 个字符');
    if (!validEmail(email)) return fail(res, 400, '请输入有效的邮箱');
    if (password.length < 4) return fail(res, 400, '密码至少 4 个字符');

    const users = await getUsers();
    if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
      return fail(res, 409, '用户名已存在');
    }
    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return fail(res, 409, '邮箱已被注册');
    }

    const salt = newSalt();
    const passwordHash = hashPassword(password, salt);
    const user = {
      id: genId(),
      username,
      email,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };
    users.push(user);
    await saveUsers(users);

    const token = signJwt(user);
    return ok(res, {
      token,
      user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
    });
  } catch (e: any) {
    return fail(res, 500, e?.message || '注册失败');
  }
}
