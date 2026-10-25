import { Router, Request, Response } from 'express';
import { getDb, queryOne, queryAll, execute, runInTransaction } from '../db.ts';
import {
  hashPassword,
  comparePassword,
  createSession,
  destroySession,
  regenerateSession,
  SESSION_COOKIE_NAME,
  generateToken,
} from '../auth.ts';
import { requireAuth, createRateLimiter } from '../middleware.ts';

export const authRouter = Router();

// Rate limiters
const loginLimiter = createRateLimiter(60, 60 * 1000, 'Too many login attempts. Please wait a minute before trying again.');
const forgotPasswordLimiter = createRateLimiter(20, 60 * 1000, 'Too many reset requests. Please wait a minute.');

// Cookie helper - uses sameSite: none and secure: true so cookies work inside preview iframes
function setSessionCookie(res: Response, token: string, rememberMe = false): void {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge,
    path: '/',
  });
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, agreeTerms } = req.body;

    if (!agreeTerms) {
      res.status(400).json({ error: 'You must agree to the Terms and Conditions to register.' });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid full name (at least 2 characters).' });
      return;
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const db = await getDb();

    // Check duplicate email
    const existing = queryOne<{ id: number }>(db, 'SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();

    // Users always register as role 'user'. Admins can never be self-assigned.
    const result = execute(
      db,
      `INSERT INTO users (name, email, password_hash, role, account_status, created_at, updated_at)
       VALUES (?, ?, ?, 'user', 'active', ?, ?)`,
      [cleanName, cleanEmail, passwordHash, now, now]
    );

    const newUserId = result.lastInsertRowId;
    const { token } = await createSession(newUserId, false);
    setSessionCookie(res, token, false);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: newUserId,
        name: cleanName,
        email: cleanEmail,
        role: 'user',
        account_status: 'active',
        created_at: now,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = await getDb();

    const user = queryOne<{
      id: number;
      name: string;
      email: string;
      password_hash: string;
      role: 'admin' | 'user';
      account_status: 'active' | 'disabled';
      created_at: string;
    }>(db, 'SELECT * FROM users WHERE email = ?', [cleanEmail]);

    // Generic error message for security (prevents user enumeration)
    if (!user || !comparePassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Check if account is disabled
    if (user.account_status !== 'active') {
      res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
      return;
    }

    // Regenerate session identifier
    const oldToken = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
    const { token } = await regenerateSession(oldToken, user.id, !!rememberMe);
    setSessionCookie(res, token, !!rememberMe);

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await destroySession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/', sameSite: 'none', secure: true });
  res.json({ message: 'Logged out successfully.' });
});

// GET /api/auth/me
authRouter.get('/me', (req: Request, res: Response) => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  res.json({ user: req.user, token });
});

// PUT /api/auth/profile
authRouter.put('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    const currentUserId = req.user!.id;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters.' });
      return;
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const db = await getDb();

    // Check if email is already used by another user
    const existing = queryOne<{ id: number }>(db, 'SELECT id FROM users WHERE email = ? AND id != ?', [
      cleanEmail,
      currentUserId,
    ]);
    if (existing) {
      res.status(409).json({ error: 'That email address is already in use by another account.' });
      return;
    }

    const now = new Date().toISOString();
    execute(db, 'UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?', [
      cleanName,
      cleanEmail,
      now,
      currentUserId,
    ]);

    res.json({
      message: 'Profile updated successfully.',
      user: {
        ...req.user,
        name: cleanName,
        email: cleanEmail,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/change-password
authRouter.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const currentUserId = req.user!.id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ error: 'New passwords do not match.' });
      return;
    }

    const db = await getDb();
    const user = queryOne<{ password_hash: string }>(db, 'SELECT password_hash FROM users WHERE id = ?', [
      currentUserId,
    ]);
    if (!user || !comparePassword(currentPassword, user.password_hash)) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    const now = new Date().toISOString();
    execute(db, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, now, currentUserId]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const db = await getDb();
    const user = queryOne<{ id: number; name: string }>(db, 'SELECT id, name FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      // Do not reveal whether user exists for security, return positive confirmation
      res.json({
        message: 'If an account exists with this email, password reset instructions have been generated.',
      });
      return;
    }

    const token = generateToken();
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    const now = new Date().toISOString();

    execute(
      db,
      'INSERT INTO password_resets (email, token, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)',
      [cleanEmail, token, expiresAt, now]
    );

    // In a local/demo development application, return the reset token so the user can test the workflow directly
    res.json({
      message: 'Password reset request generated successfully.',
      resetToken: token,
      resetLink: `/reset-password?token=${token}`,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password recovery request.' });
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmNewPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Reset token and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      res.status(400).json({ error: 'New passwords do not match.' });
      return;
    }

    const db = await getDb();
    const resetRecord = queryOne<{ id: number; email: string; expires_at: number; used: number }>(
      db,
      'SELECT id, email, expires_at, used FROM password_resets WHERE token = ?',
      [token]
    );

    if (!resetRecord) {
      res.status(400).json({ error: 'Invalid or expired recovery token.' });
      return;
    }

    if (resetRecord.used === 1 || resetRecord.expires_at < Date.now()) {
      res.status(400).json({ error: 'This recovery token has expired or has already been used.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    const now = new Date().toISOString();

    runInTransaction(db, () => {
      execute(db, 'UPDATE users SET password_hash = ?, updated_at = ? WHERE email = ?', [
        newHash,
        now,
        resetRecord.email,
      ]);
      execute(db, 'UPDATE password_resets SET used = 1 WHERE id = ?', [resetRecord.id]);
    });

    res.json({ message: 'Password has been successfully reset. You may now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});
