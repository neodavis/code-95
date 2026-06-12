import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'study_group_log' })
export class StudyGroupLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'study_group_id', type: 'uuid', nullable: true })
  studyGroupId: string | null;

  @Column({ type: 'int', default: 1 })
  type: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @Column({ name: 'action', length: 64, nullable: true })
  action: string | null;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({ type: 'int', nullable: true })
  count: number | null;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;
}
