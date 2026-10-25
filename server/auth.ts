import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Database } from 'sql.js';
import { queryOne, execute, getDb, saveDb } from './db.ts';

export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  account_status: 'active' | 'disabled';
  created_at: string;
}

export const SESSION_COOKIE_NAME = 'surveypulse_session';

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(
  userId: number,
  rememberMe: boolean = false
): Promise<{ token: string; expiresAt: number }> {
  const db = await getDb();
  const token = generateToken();
  const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 1 day
  const expiresAt = Date.now() + durationMs;
  const createdAt = new Date().toISOString();

  // Clean up any expired sessions for hygiene
  execute(db, 'DELETE FROM sessions WHERE expires_at < ?', [Date.now()]);

  // Insert session
  execute(
    db,
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
    [token, userId, expiresAt, createdAt]
  );

  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<UserSession | null> {
  if (!token) return null;
  const db = await getDb();

  const session = queryOne<{
    id: string;
    user_id: number;
    expires_at: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    account_status: 'active' | 'disabled';
    created_at: string;
  }>(
    db,
    `SELECT s.id, s.user_id, s.expires_at, u.name, u.email, u.role, u.account_status, u.created_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.id = ?`,
    [token]
  );

  if (!session) return null;

  // Check expiration
  if (session.expires_at < Date.now()) {
    execute(db, 'DELETE FROM sessions WHERE id = ?', [token]);
    return null;
  }

  // Reject disabled accounts
  if (session.account_status !== 'active') {
    return null;
  }

  return {
    id: session.user_id,
    name: session.name,
    email: session.email,
    role: session.role,
    account_status: session.account_status,
    created_at: session.created_at,
  };
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  const db = await getDb();
  execute(db, 'DELETE FROM sessions WHERE id = ?', [token]);
}

export async function regenerateSession(
  oldToken: string | undefined,
  userId: number,
  rememberMe: boolean = false
): Promise<{ token: string; expiresAt: number }> {
  const db = await getDb();
  if (oldToken) {
    execute(db, 'DELETE FROM sessions WHERE id = ?', [oldToken]);
  }
  return createSession(userId, rememberMe);
}
