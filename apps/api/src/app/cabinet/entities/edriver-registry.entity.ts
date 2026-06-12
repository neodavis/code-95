import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'system_edriverregistry' })
export class EDriverRegistry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'driver_id', unique: true })
  driverId: number;

  @Column({ name: 'driver_pip', length: 200, default: '' })
  driverPip: string;

  @Column({ name: 'date_of_expiry', type: 'date', nullable: true })
  dateOfExpiry: string | null;

  @Column({ name: 'categories_list', length: 200, nullable: true })
  categoriesList: string | null;

  @Column({ name: 'carry_type', length: 200, nullable: true })
  carryType: string | null;

  @Column({ name: 'ati_code', length: 10, default: '' })
  atiCode: string;

  @Column({ name: 'last_user', nullable: true })
  lastUser: number | null;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
