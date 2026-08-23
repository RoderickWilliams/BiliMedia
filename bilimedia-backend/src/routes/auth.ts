import { Router, Request, Response } from 'express';
import { getUsers, saveUsers } from '../services/storage';
import { hashPassword, newSalt, signJwt } from '../services/jwt';

const router = Router();

function validEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const username = String(body.username || '').trim();
    const password = String(body.password || '');

    if (!username || !password) {
      return res.status(400).json({ ok: false, message: '用户名和密码不能为空' });
    }

    const users = await getUsers();
    const found = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!found) return res.status(401).json({ ok: false, message: '用户名或密码错误' });

    const hashed = hashPassword(password, found.salt);
    if (hashed !== found.passwordHash) return res.status(401).json({ ok: false, message: '用户名或密码错误' });

    const token = signJwt(found);
    return res.json({
      ok: true,
      data: {
        token,
        user: { id: found.id, username: found.username, email: found.email, createdAt: found.createdAt },
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || '登录失败' });
  }
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const username = String(body.username || '').trim();
    const email = String(body.email || '').trim();
    const password = String(body.password || '');

    if (username.length < 2) return res.status(400).json({ ok: false, message: '用户名至少 2 个字符' });
    if (!validEmail(email)) return res.status(400).json({ ok: false, message: '请输入有效的邮箱' });
    if (password.length < 4) return res.status(400).json({ ok: false, message: '密码至少 4 个字符' });

    const users = await getUsers();
    if (users.some((u: any) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ ok: false, message: '用户名已存在' });
    }
    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ ok: false, message: '邮箱已被注册' });
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
    return res.json({
      ok: true,
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, message: e?.message || '注册失败' });
  }
});

export default router;
