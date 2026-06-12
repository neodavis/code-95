import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Maps to the existing Django users_user table.
 * synchronize: false ensures TypeORM never modifies the schema.
 */
@Entity({ name: 'users_user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unique_code', length: 256, unique: true })
  uniqueCode: string;

  @Column({ length: 128 })
  password: string;

  @Column({ length: 30, default: '' })
  username: string;

  @Column({ length: 254, default: '' })
  email: string;

  @Column({ name: 'first_name', length: 30, default: '' })
  firstName: string;

  @Column({ name: 'last_name', length: 30, default: '' })
  lastName: string;

  @Column({ name: 'middle_name', length: 64, default: '' })
  middleName: string;

  @Column({ length: 64, default: '' })
  phone: string;

  @Column({ type: 'date', nullable: true })
  birthday: string | null;

  @Column({ length: 64, default: '' })
  passport: string;

  @Column({ name: 'identification_code', length: 100, default: '0' })
  identificationCode: string;

  @Column({ name: 'is_staff', default: false })
  isStaff: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_superuser', default: false })
  isSuperuser: boolean;

  @Column({ length: 256, default: '', nullable: true })
  region: string;

  @Column({ name: 'verification_type', length: 64, nullable: true })
  verificationType: string;

  @Column({ name: 'date_joined', type: 'timestamptz' })
  dateJoined: Date;

  @Column({ name: 'last_login', type: 'timestamptz', nullable: true })
  lastLogin: Date | null;
}
