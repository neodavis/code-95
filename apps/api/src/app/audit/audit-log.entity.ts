import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
  // Auth
  LOGIN = 'login',
  LOGIN_FAILED = 'login_failed',
  PASSWORD_CHANGE = 'password_change',
  // Users
  USER_CREATE = 'user_create',
  USER_UPDATE = 'user_update',
  USER_DEACTIVATE = 'user_deactivate',
  // Study groups
  GROUP_CREATE = 'group_create',
  GROUP_UPDATE = 'group_update',
  GROUP_STATUS_CHANGE = 'group_status_change',
  GROUP_SPLIT = 'group_split',
  // Students
  STUDENT_ADD = 'student_add',
  STUDENT_REMOVE = 'student_remove',
  // Drivers
  DRIVER_CREATE = 'driver_create',
  DRIVER_UPDATE = 'driver_update',
  // SPK / ESPK
  SPK_CREATE = 'spk_create',
  // ECard
  ECARD_CREATE = 'ecard_create',
  // Training centers
  TC_CREATE = 'tc_create',
  TC_UPDATE = 'tc_update',
  TC_DELETE = 'tc_delete',
  // Employees
  EMPLOYEE_CREATE = 'employee_create',
  EMPLOYEE_UPDATE = 'employee_update',
  EMPLOYEE_DELETE = 'employee_delete',
  // Articles
  ARTICLE_CREATE = 'article_create',
  ARTICLE_UPDATE = 'article_update',
  ARTICLE_DELETE = 'article_delete',
  // FAQ
  FAQ_CREATE = 'faq_create',
  FAQ_UPDATE = 'faq_update',
  FAQ_DELETE = 'faq_delete',
}

@Entity({ name: 'audit_log' })
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'action', type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ name: 'entity', length: 100, nullable: true })
  entity: string | null;

  @Column({ name: 'entity_id', length: 100, nullable: true })
  entityId: string | null;

  @Column({ name: 'changes', type: 'jsonb', nullable: true })
  changes: Record<string, unknown> | null;
}
