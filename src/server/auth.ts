import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from './firebase-admin.ts';
import { verifyLocalSessionToken } from './localAuth.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  username?: string;
  authType: 'firebase' | 'local';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
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
    req.user = {
      uid: localPayload.sub,
      email: `${localPayload.username}@qhub.local`,
      name: localPayload.name,
      username: localPayload.username,
      authType: 'local',
    };
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      authType: 'firebase',
    };
    return next();
  } catch (error) {
    console.error('Error verifying auth token:', error instanceof Error ? error.message : 'Invalid token');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
