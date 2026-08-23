import { createHmac, createHash, randomBytes } from 'node:crypto';

const SECRET =
  process.env.BILIMEDIA_JWT_SECRET ||
  'bilimedia-jwt-secret-please-change-me-via-env-var-2026';

function b64url(buf) {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf;
  return b
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(s) {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function signJwt(user, ttlSec = 60 * 60 * 24 * 30) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    iat: now,
    exp: now + ttlSec,
    jti: randomBytes(8).toString('hex'),
  };
  const encHeader = b64url(JSON.stringify(header));
  const encPayload = b64url(JSON.stringify(payload));
  const signingInput = encHeader + '.' + encPayload;
  const sig = createHmac('sha256', SECRET).update(signingInput).digest('base64');
  const encSig = b64url(Buffer.from(sig, 'base64'));
  return encHeader + '.' + encPayload + '.' + encSig;
}

export function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encHeader, encPayload, encSig] = parts;
  const signingInput = encHeader + '.' + encPayload;
  const expectedSig = createHmac('sha256', SECRET).update(signingInput).digest('base64');
  const expectedEnc = b64url(Buffer.from(expectedSig, 'base64'));
  if (expectedEnc.length !== encSig.length) return null;
  let diff = 0;
  for (let i = 0; i < expectedEnc.length; i++) diff |= expectedEnc.charCodeAt(i) ^ encSig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(b64urlDecode(encPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    if (!payload.sub || !payload.username) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPassword(password, salt) {
  return createHash('sha256')
    .update(salt + ':' + password)
    .digest('hex');
}

export function newSalt() {
  return randomBytes(8).toString('hex');
    }
