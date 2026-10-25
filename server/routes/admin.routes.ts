import { Router, Request, Response } from 'express';
import { getDb, queryOne, queryAll, execute, runInTransaction } from '../db.ts';
import { requireAdmin } from '../middleware.ts';
import { logAdminAction, getAuditLogs } from '../audit.ts';

export const adminRouter = Router();

// Apply requireAdmin to all routes in this router
adminRouter.use(requireAdmin);

// GET /api/admin/overview
adminRouter.get('/overview', async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const usersCount = queryOne<{ count: number }>(db, 'SELECT COUNT(*) as count FROM users')!.count;
    const surveysCount = queryOne<{ count: number }>(db, 'SELECT COUNT(*) as count FROM surveys')!.count;
    const publishedCount = queryOne<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM surveys WHERE status = 'published'"
    )!.count;
    const responsesCount = queryOne<{ count: number }>(db, 'SELECT COUNT(*) as count FROM responses')!.count;

    // Recent 5 surveys with creator names
    const recentSurveys = queryAll<{
      id: number;
      title: string;
      public_id: string;
      status: string;
      created_at: string;
      creator_name: string;
      response_count: number;
    }>(
      db,
      `SELECT s.id, s.title, s.public_id, s.status, s.created_at, u.name as creator_name,
              (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) as response_count
       FROM surveys s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC
       LIMIT 5`
    );

    // Recent audit actions
    const recentAudit = queryAll(
      db,
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5`
    );

    // Daily responses trend (last 14 days)
    const dailyResponses = queryAll<{ date: string; count: number }>(
      db,
      `SELECT substr(submitted_at, 1, 10) as date, COUNT(*) as count
       FROM responses
       GROUP BY substr(submitted_at, 1, 10)
       ORDER BY date DESC
       LIMIT 14`
    );

    res.json({
      metrics: {
        totalUsers: usersCount,
        totalSurveys: surveysCount,
        publishedSurveys: publishedCount,
        totalResponses: responsesCount,
      },
      recentSurveys,
      recentAudit,
      dailyResponses: dailyResponses.reverse(),
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

// GET /api/admin/users - User management with search and filters
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const query = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';
    const role = req.query.role ? String(req.query.role).trim() : '';

    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.account_status, u.created_at, u.updated_at,
             (SELECT COUNT(*) FROM surveys s WHERE s.user_id = u.id) as survey_count
      FROM users u
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (query) {
      sql += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`);
    }

    if (status && ['active', 'disabled'].includes(status)) {
      sql += ` AND u.account_status = ?`;
      params.push(status);
    }

    if (role && ['admin', 'user'].includes(role)) {
      sql += ` AND u.role = ?`;
      params.push(role);
    }

    sql += ` ORDER BY u.created_at DESC`;

    const users = queryAll(db, sql, params);
    res.json({ users });
  } catch (err) {
    console.error('Admin fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users list.' });
  }
});

// PATCH /api/admin/users/:id/status - Activate or Deactivate account
adminRouter.patch('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['active', 'disabled'].includes(status)) {
      res.status(400).json({ error: 'Status must be active or disabled.' });
      return;
    }

    // Prevent self-deactivation
    if (targetUserId === req.user!.id) {
      res.status(400).json({ error: 'Security constraint: You cannot deactivate your own administrative account.' });
      return;
    }

    const db = await getDb();
    const targetUser = queryOne<{ id: number; name: string; email: string; account_status: string }>(
      db,
      'SELECT id, name, email, account_status FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const now = new Date().toISOString();
    execute(db, 'UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?', [status, now, targetUserId]);

    // If disabled, kill active sessions for security
    if (status === 'disabled') {
      execute(db, 'DELETE FROM sessions WHERE user_id = ?', [targetUserId]);
    }

    await logAdminAction(
      req.user!.id,
      req.user!.name,
      'USER_STATUS_CHANGE',
      'USER',
      String(targetUserId),
      `Account status for "${targetUser.name}" (${targetUser.email}) changed to ${status}`
    );

    res.json({ message: `User account is now ${status}.` });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

// PATCH /api/admin/users/:id/role - Change user role
adminRouter.patch('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ error: 'Role must be admin or user.' });
      return;
    }

    if (targetUserId === req.user!.id && role === 'user') {
      res.status(400).json({ error: 'Security constraint: You cannot demote your own administrator account.' });
      return;
    }

    const db = await getDb();
    const targetUser = queryOne<{ id: number; name: string; email: string; role: string }>(
      db,
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [targetUserId]
    );

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const now = new Date().toISOString();
    execute(db, 'UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [role, now, targetUserId]);

    await logAdminAction(
      req.user!.id,
      req.user!.name,
      'USER_ROLE_CHANGE',
      'USER',
      String(targetUserId),
      `User role for "${targetUser.name}" (${targetUser.email}) changed from ${targetUser.role} to ${role}`
    );

    res.json({ message: `User role has been updated to ${role}.` });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// GET /api/admin/users/:id/surveys - Fetch surveys created by a specific user
adminRouter.get('/users/:id/surveys', async (req: Request, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const db = await getDb();

    const surveys = queryAll(
      db,
      `SELECT s.*, 
              (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) as response_count,
              (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) as question_count
       FROM surveys s
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [targetUserId]
    );

    res.json({ surveys });
  } catch (err) {
    console.error('Fetch user surveys error:', err);
    res.status(500).json({ error: 'Failed to fetch user surveys.' });
  }
});

// GET /api/admin/surveys - View all surveys in system
adminRouter.get('/surveys', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const query = req.query.q ? String(req.query.q).trim().toLowerCase() : '';
    const status = req.query.status ? String(req.query.status).trim() : '';

    let sql = `
      SELECT s.id, s.title, s.description, s.public_id, s.status, s.require_auth, s.created_at, s.updated_at,
             u.id as user_id, u.name as creator_name, u.email as creator_email,
             (SELECT COUNT(*) FROM responses r WHERE r.survey_id = s.id) as response_count,
             (SELECT COUNT(*) FROM questions q WHERE q.survey_id = s.id) as question_count
      FROM surveys s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (query) {
      sql += ` AND (LOWER(s.title) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      sql += ` AND s.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY s.created_at DESC`;

    const surveys = queryAll(db, sql, params);
    res.json({ surveys });
  } catch (err) {
    console.error('Admin fetch surveys error:', err);
    res.status(500).json({ error: 'Failed to fetch surveys list.' });
  }
});

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10), 500);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
    const actionFilter = req.query.action ? String(req.query.action) : undefined;

    const { logs, total } = await getAuditLogs(limit, offset, actionFilter);
    res.json({ logs, total, limit, offset });
  } catch (err) {
    console.error('Admin fetch audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
});
