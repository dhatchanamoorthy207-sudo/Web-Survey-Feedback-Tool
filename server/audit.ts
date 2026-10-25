import { getDb, execute, queryAll } from './db.ts';

export interface AuditLogEntry {
  id: number;
  admin_user_id: number | null;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
}

export async function logAdminAction(
  adminUserId: number | null,
  adminName: string | null,
  action: string,
  targetType: string,
  targetId: string | null,
  details: string | null
): Promise<void> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  execute(
    db,
    `INSERT INTO audit_logs (admin_user_id, admin_name, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminUserId, adminName, action, targetType, targetId, details, createdAt]
  );
}

export async function getAuditLogs(limit = 100, offset = 0, actionFilter?: string): Promise<{ logs: AuditLogEntry[]; total: number }> {
  const db = await getDb();
  let sql = 'SELECT * FROM audit_logs';
  let countSql = 'SELECT COUNT(*) as count FROM audit_logs';
  const params: unknown[] = [];

  if (actionFilter) {
    sql += ' WHERE action = ?';
    countSql += ' WHERE action = ?';
    params.push(actionFilter);
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const queryParams = [...params, limit, offset];

  const logs = queryAll<AuditLogEntry>(db, sql, queryParams);
  const totalRow = queryAll<{ count: number }>(db, countSql, params)[0];

  return {
    logs,
    total: totalRow?.count || 0,
  };
}
