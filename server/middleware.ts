import { Request, Response, NextFunction } from 'express';
import { validateSession, SESSION_COOKIE_NAME, UserSession } from './auth.ts';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

export async function attachUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const user = await validateSession(token);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      console.error('Session validation error:', err);
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  if (req.user.account_status !== 'active') {
    res.status(403).json({ error: 'Your account is deactivated. Contact an administrator.' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
    return;
  }
  next();
}

// In-memory rate limiter per IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function createRateLimiter(limit: number, windowMs: number, message = 'Too many requests. Please try again later.') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';

    const key = `${req.path}:${clientIp}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);
    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= limit) {
      const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({ error: message, retryAfter: retryAfterSec });
      return;
    }

    record.count++;
    next();
  };
}

// CSV formula injection sanitizer
export function sanitizeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '';
  let str = String(field);
  // Neutralize formula injection risk if starts with =, +, -, @, \t, \r
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
