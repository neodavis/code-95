import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps to the existing Django training_center table.
 * synchronize: false ensures TypeORM never modifies the schema.
 */
@Entity({ name: 'training_center' })
export class TrainingCenter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'father_tc', length: 4, default: '' })
  fatherTc: string;

  @Column({ name: 'ati_code', length: 4, default: '' })
  atiCode: string;

  @Column({ length: 20, default: '' })
  division: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'name_short', length: 60, default: '' })
  nameShort: string;

  @Column({ length: 10 })
  edrpou: string;

  @Column({ name: 'cert_no', length: 9, default: '' })
  certNo: string;

  @Column({ length: 50, default: '' })
  city: string;

  @Column({ name: 'addr_street', length: 50, default: '' })
  addrStreet: string;

  @Column({ name: 'addr_house', length: 7, default: '' })
  addrHouse: string;

  @Column({ name: 'cert_date', type: 'date', nullable: true })
  certDate: string | null;

  @Column({ length: 100, nullable: true })
  email: string | null;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ length: 50, nullable: true })
  region: string | null;

  @Column({ length: 200, nullable: true })
  website: string | null;

  @Column({ name: 'post_code', length: 5, nullable: true })
  postCode: string | null;

  @Column({ name: 'chief_pip', length: 50, default: '' })
  chiefPip: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'old_id', nullable: true })
  oldId: number | null;
}
