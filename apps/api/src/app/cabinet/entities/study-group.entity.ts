import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { CourseType } from '@code95/shared-types';

@Entity({ name: 'study_group' })
export class StudyGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'date_start', type: 'date', nullable: true })
  dateStart: string | null;

  @Column({ name: 'date_finish', type: 'date', nullable: true })
  dateFinish: string | null;

  @Column({ default: 1 })
  status: number;

  @Column({ name: 'training_center_id' })
  trainingCenterId: string;

  @Column({ name: 'carry_type_id', nullable: true })
  carryTypeId: number | null;

  @Column({ name: 'group_type_id', nullable: true })
  groupTypeId: string | null;

  @Column({
    name: 'course_type',
    type: 'enum',
    enum: CourseType,
    nullable: true,
  })
  courseType: CourseType | null;

  @Column({ name: 'is_reduced_program', default: false })
  isReducedProgram: boolean;
}
