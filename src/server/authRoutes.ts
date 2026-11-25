import crypto from 'node:crypto';
import { Router } from 'express';
import { eq, or } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../db/index.ts';
import { ensurePostgresSchema } from '../db/bootstrap.ts';
import { qhubLocalAccounts, qhubPreferences, qhubUsers } from '../db/schema.ts';
import {
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  signLocalSessionToken,
  verifyPassword,
} from './localAuth.ts';
import { adminAuth } from './firebase-admin.ts';
import { requireAuth, resolveUnifiedUser, type AuthRequest } from './auth.ts';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'Database PostgreSQL belum dikonfigurasi di server. Gunakan login Google CloudSync atau atur DATABASE_URL terlebih dahulu.',
    });
  }

  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;
  const rawDisplayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';
  const displayName = (rawDisplayName || username).slice(0, 120);

  if (!isValidUsername(username)) {
    return res.status(400).json({
      error: 'INVALID_USERNAME',
      message: 'Username harus 3–32 karakter (hanya huruf kecil, angka, titik, garis bawah, atau tanda hubung).',
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: 'INVALID_PASSWORD',
      message: 'Password minimal 6 karakter dan maksimal 128 karakter.',
    });
  }

  try {
    await ensurePostgresSchema();
    const db = getDb();

    const existing = await db
      .select({ username: qhubLocalAccounts.username })
      .from(qhubLocalAccounts)
      .where(eq(qhubLocalAccounts.username, username));

    if (existing.length > 0) {
      return res.status(409).json({
        error: 'USERNAME_TAKEN',
        message: 'Username sudah terdaftar. Silakan gunakan username lain atau langsung masuk.',
      });
    }

    const uid = `local-${crypto.randomUUID()}`;
    const passwordHash = hashPassword(password);
    const email = `${username}@qhub.local`;

    await db.transaction(async (tx) => {
      await tx.insert(qhubUsers).values({
        uid,
        email,
        displayName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tx.insert(qhubLocalAccounts).values({
        username,
        uid,
        displayName,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const token = signLocalSessionToken({ uid, username, name: displayName });

    return res.status(201).json({
      token,
      user: {
        uid,
        username,
        email,
        displayName,
        hasPassword: true,
        hasGoogle: false,
        authType: 'local',
      },
    });
  } catch (err) {
    console.error('Register failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: 'REGISTER_FAILED',
      message: 'Gagal mendaftarkan akun. Silakan coba lagi.',
    });
  }
});

authRouter.post('/login', async (req, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'Database PostgreSQL belum dikonfigurasi di server. Gunakan login Google CloudSync atau atur DATABASE_URL terlebih dahulu.',
    });
  }

  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;

  if (!isValidUsername(username) || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      error: 'INVALID_CREDENTIALS',
      message: 'Masukkan username dan password yang valid.',
    });
  }

  try {
    await ensurePostgresSchema();
    const db = getDb();

    const rows = await db
      .select()
      .from(qhubLocalAccounts)
      .where(eq(qhubLocalAccounts.username, username));

    const account = rows[0];
    if (!account || !verifyPassword(password, account.passwordHash)) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Username atau password salah.',
      });
    }

    const unified = await resolveUnifiedUser({
      rawUid: account.uid,
      email: `${account.username}@qhub.local`,
      name: account.displayName,
      username: account.username,
      authType: 'local',
    });

    const token = signLocalSessionToken({
      uid: unified.uid,
      username: account.username,
      name: unified.name || account.displayName,
    });

    return res.json({
      token,
      user: {
        uid: unified.uid,
        username: account.username,
        email: unified.email || `${account.username}@qhub.local`,
        displayName: unified.name || account.displayName,
        googleEmail: unified.googleEmail,
        hasPassword: true,
        hasGoogle: Boolean(unified.hasGoogle),
        authType: 'local',
      },
    });
  } catch (err) {
    console.error('Login failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: 'LOGIN_FAILED',
      message: 'Gagal memproses login. Silakan coba lagi.',
    });
  }
});

// Link or update Username + Password on the currently signed-in account (works for Google accounts too!)
authRouter.post('/link-credentials', requireAuth, async (req: AuthRequest, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'Database PostgreSQL belum dikonfigurasi di server.',
    });
  }

  const uid = req.user!.uid;
  const username = normalizeUsername(req.body?.username);
  const password = req.body?.password;
  const currentPassword = req.body?.currentPassword;

  if (!isValidUsername(username)) {
    return res.status(400).json({
      error: 'INVALID_USERNAME',
      message: 'Username harus 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau tanda hubung).',
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      error: 'INVALID_PASSWORD',
      message: 'Password minimal 6 karakter dan maksimal 128 karakter.',
    });
  }

  try {
    await ensurePostgresSchema();
    const db = getDb();

    // Ensure qhubUsers parent row exists
    await db
      .insert(qhubUsers)
      .values({
        uid,
        email: req.user?.email || `${username}@qhub.local`,
        displayName: req.user?.name || username,
        googleUid: req.user?.authType === 'firebase' ? uid : null,
        googleEmail: req.user?.authType === 'firebase' ? (req.user?.email || null) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing({ target: qhubUsers.uid });

    // Check if current account already has local credentials
    const myExistingLocal = await db
      .select()
      .from(qhubLocalAccounts)
      .where(eq(qhubLocalAccounts.uid, uid));

    if (myExistingLocal[0]) {
      if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword, myExistingLocal[0].passwordHash)) {
        return res.status(401).json({
          error: 'INVALID_CURRENT_PASSWORD',
          message: 'Password lama tidak sesuai.',
        });
      }
    }

    // Check if requested username is claimed by a different uid
    const existingByName = await db
      .select()
      .from(qhubLocalAccounts)
      .where(eq(qhubLocalAccounts.username, username));

    if (existingByName[0] && existingByName[0].uid !== uid) {
      return res.status(409).json({
        error: 'USERNAME_TAKEN',
        message: 'Username sudah dipakai oleh akun lain. Pilih username yang berbeda.',
      });
    }

    const passwordHash = hashPassword(password);
    const displayName = (req.user?.name || username).slice(0, 120);

    await db.transaction(async (tx) => {
      if (myExistingLocal[0]) {
        await tx
          .delete(qhubLocalAccounts)
          .where(eq(qhubLocalAccounts.uid, uid));
      }
      await tx.insert(qhubLocalAccounts).values({
        username,
        uid,
        displayName,
        passwordHash,
        createdAt: myExistingLocal[0]?.createdAt || new Date(),
        updatedAt: new Date(),
      });
    });

    const refreshed = await resolveUnifiedUser({
      rawUid: uid,
      email: req.user?.email,
      name: displayName,
      username,
      authType: req.user!.authType,
    });

    const newLocalToken =
      req.user!.authType === 'local'
        ? signLocalSessionToken({ uid, username, name: displayName })
        : undefined;

    return res.json({
      success: true,
      token: newLocalToken,
      user: {
        uid: refreshed.uid,
        email: refreshed.email,
        displayName: refreshed.name || displayName,
        username: refreshed.username || username,
        googleEmail: refreshed.googleEmail,
        hasPassword: true,
        hasGoogle: Boolean(refreshed.hasGoogle),
        authType: req.user!.authType === 'firebase' ? 'google' : 'local',
      },
    });
  } catch (err) {
    console.error('Link credentials failed:', err instanceof Error ? err.message : err);
    return res.status(500).json({
      error: 'LINK_CREDENTIALS_FAILED',
      message: 'Gagal menyimpan username dan password akun.',
    });
  }
});

// Link a Google Account (verified Firebase ID token) to the currently signed-in account
authRouter.post('/link-google', requireAuth, async (req: AuthRequest, res) => {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: 'DATABASE_NOT_CONFIGURED',
      message: 'Database PostgreSQL belum dikonfigurasi di server.',
    });
  }

  const uid = req.user!.uid;
  const googleIdToken = typeof req.body?.googleIdToken === 'string' ? req.body.googleIdToken.trim() : '';
  if (!googleIdToken) {
    return res.status(400).json({
      error: 'MISSING_GOOGLE_TOKEN',
      message: 'Token verifikasi Google tidak ditemukan.',
    });
  }

  try {
    const decodedGoogle = await adminAuth.verifyIdToken(googleIdToken);
    const googleUid = decodedGoogle.uid;
    const googleEmail = decodedGoogle.email || null;

    await ensurePostgresSchema();
    const db = getDb();

    // Check if another user row already owns or links this googleUid
    const conflictingUsers = await db
      .select()
      .from(qhubUsers)
      .where(or(eq(qhubUsers.uid, googleUid), eq(qhubUsers.googleUid, googleUid)));

    const otherUser = conflictingUsers.find((u) => u.uid !== uid);
    if (otherUser) {
      const otherPrefs = await db
        .select({ initialized: qhubPreferences.initialized })
        .from(qhubPreferences)
        .where(eq(qhubPreferences.userId, otherUser.uid));

      if (otherPrefs[0]?.initialized) {
        return res.status(409).json({
          error: 'GOOGLE_ACCOUNT_IN_USE',
          message: 'Akun Google tersebut sudah terdaftar dan memiliki data terpisah. Masuk lewat Google lalu atur Username & Password di akun tersebut.',
        });
      }
    }

    await db.transaction(async (tx) => {
      // Clean up uninitialized empty Google shell row if any
      if (otherUser && otherUser.uid === googleUid) {
        await tx.delete(qhubUsers).where(eq(qhubUsers.uid, otherUser.uid));
      }

      await tx
        .insert(qhubUsers)
        .values({
          uid,
          email: req.user?.email || googleEmail || `${uid}@qhub.local`,
          displayName: req.user?.name || decodedGoogle.name || 'Pengguna QHub',
          googleUid,
          googleEmail,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: qhubUsers.uid,
          set: {
            googleUid,
            googleEmail,
            updatedAt: new Date(),
          },
        });
    });

    const refreshed = await resolveUnifiedUser({
      rawUid: uid,
      email: req.user?.email,
      name: req.user?.name,
      username: req.user?.username,
      authType: req.user!.authType,
    });

    return res.json({
      success: true,
      user: {
        uid: refreshed.uid,
        email: refreshed.email,
        displayName: refreshed.name || req.user?.name || 'Pengguna QHub',
        username: refreshed.username,
        googleEmail: refreshed.googleEmail || googleEmail || undefined,
        hasPassword: Boolean(refreshed.hasPassword),
        hasGoogle: true,
        authType: req.user!.authType === 'firebase' ? 'google' : 'local',
      },
    });
  } catch (err) {
    console.error('Link Google failed:', err instanceof Error ? err.message : err);
    return res.status(401).json({
      error: 'LINK_GOOGLE_FAILED',
      message: 'Gagal memverifikasi atau menautkan akun Google.',
    });
  }
});

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  return res.json({
    user: {
      uid: req.user!.uid,
      email: req.user!.email,
      displayName: req.user!.name || req.user!.username || 'Pengguna QHub',
      username: req.user!.username,
      googleEmail: req.user!.googleEmail,
      hasPassword: Boolean(req.user!.hasPassword),
      hasGoogle: Boolean(req.user!.hasGoogle),
      authType: req.user!.authType === 'firebase' ? 'google' : 'local',
    },
  });
});
