import type { VercelRequest, VercelResponse } from '@vercel/node';

export function applyCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function ok(res: VercelResponse, payload?: unknown) {
  return res.json({ ok: true, ...(payload !== undefined ? { data: payload } : {}) });
}
export function fail(res: VercelResponse, status: number, message: string, extra?: Record<string, unknown>) {
  return res.status(status).json({ ok: false, message, ...extra });
}

export function parseBearerToken(req: VercelRequest): string | null {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  const header = Array.isArray(h) ? h[0] : (h as string | undefined);
  if (!header || typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(\S+)$/i);
  return m ? m[1] : null;
}
