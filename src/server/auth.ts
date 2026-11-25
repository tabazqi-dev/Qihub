import type { Request, Response, NextFunction } from 'express';
import { eq, or } from 'drizzle-orm';
import { adminAuth } from './firebase-admin.ts';
import { verifyLocalSessionToken } from './localAuth.ts';
import { getDb, isDatabaseConfigured } from '../db/index.ts';
import { ensurePostgresSchema } from '../db/bootstrap.ts';
import { qhubLocalAccounts, qhubUsers } from '../db/schema.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  username?: string;
  googleEmail?: string;
  hasPassword?: boolean;
  hasGoogle?: boolean;
  authType: 'firebase' | 'local';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function resolveUnifiedUser(base: {
  rawUid: string;
  email?: string;
  name?: string;
  username?: string;
  authType: 'firebase' | 'local';
}): Promise<AuthenticatedUser> {
  if (!isDatabaseConfigured()) {
    return {
      uid: base.rawUid,
      email: base.email,
      name: base.name,
      username: base.username,
      hasPassword: base.authType === 'local',
      hasGoogle: base.authType === 'firebase',
      googleEmail: base.authType === 'firebase' ? base.email : undefined,
      authType: base.authType,
    };
  }

  try {
    await ensurePostgresSchema();
    const db = getDb();

    const userRows =
      base.authType === 'firebase'
        ? await db
            .select()
            .from(qhubUsers)
            .where(or(eq(qhubUsers.uid, base.rawUid), eq(qhubUsers.googleUid, base.rawUid)))
        : await db.select().from(qhubUsers).where(eq(qhubUsers.uid, base.rawUid));

    const matchedUser = userRows[0];
    const effectiveUid = matchedUser ? matchedUser.uid : base.rawUid;

    const localRows = await db
      .select({ username: qhubLocalAccounts.username, displayName: qhubLocalAccounts.displayName })
      .from(qhubLocalAccounts)
      .where(eq(qhubLocalAccounts.uid, effectiveUid));

    const linkedLocal = localRows[0];
    const hasGoogle =
      base.authType === 'firebase' ||
      Boolean(matchedUser?.googleUid) ||
      Boolean(matchedUser && !matchedUser.uid.startsWith('local-') && matchedUser.email && !matchedUser.email.endsWith('@qhub.local'));

    const googleEmail =
      matchedUser?.googleEmail ||
      (base.authType === 'firebase' ? base.email : undefined) ||
      (hasGoogle && matchedUser?.email && !matchedUser.email.endsWith('@qhub.local') ? matchedUser.email : undefined);

    return {
      uid: effectiveUid,
      email: matchedUser?.email || base.email,
      name: matchedUser?.displayName || linkedLocal?.displayName || base.name,
      username: linkedLocal?.username || base.username,
      googleEmail,
      hasPassword: Boolean(linkedLocal) || base.authType === 'local',
      hasGoogle,
      authType: base.authType,
    };
  } catch (err) {
    console.error('Failed to resolve unified user:', err instanceof Error ? err.message : err);
    return {
      uid: base.rawUid,
      email: base.email,
      name: base.name,
      username: base.username,
      hasPassword: base.authType === 'local',
      hasGoogle: base.authType === 'firebase',
      googleEmail: base.authType === 'firebase' ? base.email : undefined,
      authType: base.authType,
    };
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  const localPayload = verifyLocalSessionToken(token);
  if (localPayload) {
    req.user = await resolveUnifiedUser({
      rawUid: localPayload.sub,
      email: `${localPayload.username}@qhub.local`,
      name: localPayload.name,
      username: localPayload.username,
      authType: 'local',
    });
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = await resolveUnifiedUser({
      rawUid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      authType: 'firebase',
    });
    return next();
  } catch (error) {
    console.error('Error verifying auth token:', error instanceof Error ? error.message : 'Invalid token');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
