import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps to the existing Django training_center_employee table.
 * synchronize: false ensures TypeORM never modifies the schema.
 * No ORM relations — service uses raw JOINs for enriched queries.
 */
@Entity({ name: 'training_center_employee' })
export class TrainingCenterEmployee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active' })
  isActive: boolean;

  @Column({ name: 'training_center_id' })
  trainingCenterId: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;
}
