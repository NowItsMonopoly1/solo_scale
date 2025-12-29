import { query } from '../../db/client.js';

export interface AuditLogEntry {
  account_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
}

export interface AuditLog extends AuditLogEntry {
  id: string;
  created_at: Date;
}

/**
 * Audit logging service for compliance and tracking
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (account_id, user_id, action, resource_type, resource_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.account_id,
        entry.user_id || null,
        entry.action,
        entry.resource_type,
        entry.resource_id || null,
        JSON.stringify(entry.metadata || {}),
        entry.ip_address || null,
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't throw - audit failures shouldn't break business logic
  }
}

/**
 * Query audit logs for an account
 */
export async function getAuditLogs(
  accountId: string,
  filters?: {
    user_id?: string;
    resource_type?: string;
    resource_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: AuditLog[]; total: number }> {
  let whereClause = 'WHERE account_id = $1';
  const params: any[] = [accountId];
  let paramIndex = 2;

  if (filters?.user_id) {
    whereClause += ` AND user_id = $${paramIndex}`;
    params.push(filters.user_id);
    paramIndex++;
  }

  if (filters?.resource_type) {
    whereClause += ` AND resource_type = $${paramIndex}`;
    params.push(filters.resource_type);
    paramIndex++;
  }

  if (filters?.resource_id) {
    whereClause += ` AND resource_id = $${paramIndex}`;
    params.push(filters.resource_id);
    paramIndex++;
  }

  if (filters?.action) {
    whereClause += ` AND action = $${paramIndex}`;
    params.push(filters.action);
    paramIndex++;
  }

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Get logs
  const limit = filters?.limit || 100;
  const offset = filters?.offset || 0;

  const result = await query(
    `SELECT * FROM audit_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const logs: AuditLog[] = result.rows.map((row) => ({
    id: row.id,
    account_id: row.account_id,
    user_id: row.user_id,
    action: row.action,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    metadata: row.metadata,
    ip_address: row.ip_address,
    created_at: row.created_at,
  }));

  return { logs, total };
}
