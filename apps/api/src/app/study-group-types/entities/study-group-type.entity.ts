import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'study_group_type' })
export class StudyGroupType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;
}
