import crypto from 'node:crypto';
import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../db/index.ts';
import { ensurePostgresSchema } from '../db/bootstrap.ts';
import { qhubLocalAccounts, qhubUsers } from '../db/schema.ts';
import {
  hashPassword,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
  signLocalSessionToken,
  verifyPassword,
} from './localAuth.ts';
import { requireAuth, type AuthRequest } from './auth.ts';

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

    const token = signLocalSessionToken({
      uid: account.uid,
      username: account.username,
      name: account.displayName,
    });

    return res.json({
      token,
      user: {
        uid: account.uid,
        username: account.username,
        email: `${account.username}@qhub.local`,
        displayName: account.displayName,
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

authRouter.get('/me', requireAuth, (req: AuthRequest, res) => {
  return res.json({
    user: {
      uid: req.user!.uid,
      email: req.user!.email,
      displayName: req.user!.name || req.user!.username || 'Pengguna QHub',
      username: req.user!.username,
      authType: req.user!.authType,
    },
  });
});
