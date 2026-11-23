import crypto from 'node:crypto';

const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32);
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): Buffer {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return crypto.createHash('sha256').update(envSecret).digest();
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

export interface LocalSessionPayload {
  sub: string;
  username: string;
  name: string;
  authType: 'local';
  iat: number;
  exp: number;
}

export function normalizeUsername(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(username);
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  try {
    const storedBuf = Buffer.from(hashHex, 'hex');
    const candidateBuf = crypto.scryptSync(password, salt, storedBuf.length);
    if (storedBuf.length !== candidateBuf.length) return false;
    return crypto.timingSafeEqual(storedBuf, candidateBuf);
  } catch {
    return false;
  }
}

export function signLocalSessionToken(input: {
  uid: string;
  username: string;
  name: string;
}): string {
  const now = Date.now();
  const payload: LocalSessionPayload = {
    sub: input.uid,
    username: input.username,
    name: input.name,
    authType: 'local',
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function verifyLocalSessionToken(token: string): LocalSessionPayload | null {
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0 || dotIdx === token.length - 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);
  if (!payloadB64 || !sigB64 || sigB64.includes('.')) return null;

  try {
    const expectedSigB64 = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadB64)
      .digest('base64url');

    const providedBuf = Buffer.from(sigB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSigB64, 'utf8');
    if (providedBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as LocalSessionPayload;

    if (
      !decoded ||
      decoded.authType !== 'local' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.username !== 'string' ||
      typeof decoded.exp !== 'number' ||
      decoded.exp <= Date.now()
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
