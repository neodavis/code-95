import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'study_group_students' })
export class StudyGroupStudent {
  @PrimaryColumn({ name: 'studygroup_id' })
  studygroupId: string;

  @PrimaryColumn({ name: 'edriver_id' })
  edriverId: number;
}
