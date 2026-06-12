export type AuditAction =
  | 'login'
  | 'password_change'
  | 'user_create'
  | 'user_update'
  | 'group_create'
  | 'group_status_change'
  | 'group_split'
  | 'student_add'
  | 'student_remove'
  | 'driver_create'
  | 'driver_update'
  | 'spk_create'
  | 'ecard_create';

export interface AuditLogItem {
  id: string;
  createdAt: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  action: AuditAction;
  entity: string | null;
  entityId: string | null;
  changes: Record<string, unknown> | null;
}
