import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'system_ecard' })
export class ECard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column({ length: 100, default: '' })
  surname: string;

  @Column({ name: 'first_name', length: 100, default: '' })
  firstName: string;

  @Column({ name: 'surname_trans', length: 100, default: '' })
  surnameTrans: string;

  @Column({ name: 'first_name_trans', length: 100, default: '' })
  firstNameTrans: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'date_of_issue', type: 'date', nullable: true })
  dateOfIssue: string | null;

  @Column({ name: 'date_of_expiry', type: 'date', nullable: true })
  dateOfExpiry: string | null;

  @Column({ name: 'issued_by', length: 200, nullable: true })
  issuedBy: string | null;

  @Column({ name: 'registration_number', length: 50, nullable: true })
  registrationNumber: string | null;

  @Column({ name: 'licence_no', length: 50, nullable: true })
  licenceNo: string | null;

  @Column({ name: 'serial_no', length: 50, nullable: true })
  serialNo: string | null;

  @Column({ name: 'categories_list', length: 200, nullable: true })
  categoriesList: string | null;

  @Column({ name: 'union_code95', length: 50, nullable: true })
  unionCode95: string | null;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'last_user', nullable: true })
  lastUser: number | null;

  @Column({ name: 'photo_img', length: 500, nullable: true })
  photoImg: string | null;

  @Column({ name: 'sign_img', length: 500, nullable: true })
  signImg: string | null;

  @Column({ name: 'qr_img', type: 'text', nullable: true })
  qrImg: string | null;
}
