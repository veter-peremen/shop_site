import { query } from "@/lib/db";

export type AuditLogEntry = {
  id: string;
  adminEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  payload: unknown;
  createdAt: string;
};

type AuditLogRow = {
  id: string;
  admin_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  payload: unknown;
  created_at: string;
};

function mapRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    adminEmail: row.admin_email,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    payload: row.payload,
    createdAt: row.created_at,
  };
}

export async function getRecentAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  const rows = await query<AuditLogRow>(
    `select a.id, u.email as admin_email, a.action, a.entity, a.entity_id, a.payload, a.created_at
     from audit_logs a
     left join users u on u.id = a.admin_id
     order by a.created_at desc
     limit $1`,
    [limit],
  );
  return rows.map(mapRow);
}
