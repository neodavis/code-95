import { Column, Entity, Generated, PrimaryGeneratedColumn } from 'typeorm';
import { CourseType } from '@code95/shared-types';

@Entity({ name: 'system_espk' })
export class ESPK {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  uuid: string;

  @Column({ name: 'tc_id' })
  tcId: number;

  @Column({ name: 'tc_name', length: 200, default: '' })
  tcName: string;

  @Column({ name: 'tc_cert_no', length: 20, default: '' })
  tcCertNo: string;

  @Column({ name: 'spk_no', length: 20, default: '' })
  spkNo: string;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column({ name: 'driver_pip', length: 200, default: '' })
  driverPip: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ name: 'country_of_birth', length: 100, nullable: true })
  countryOfBirth: string | null;

  @Column({ name: 'carry_type_id', nullable: true })
  carryTypeId: number | null;

  @Column({ name: 'carry_type_txt', length: 200, nullable: true })
  carryTypeTxt: string | null;

  @Column({ name: 'date_of_miniinfra', type: 'date', nullable: true })
  dateOfMiniinfra: string | null;

  @Column({ name: 'miniinfra_no', length: 20, nullable: true })
  miniinfraNo: string | null;

  @Column({ name: 'date_of_minjust', type: 'date', nullable: true })
  dateOfMinjust: string | null;

  @Column({ name: 'minjust_no', length: 20, nullable: true })
  minjustNo: string | null;

  @Column({ name: 'date_of_test', type: 'date', nullable: true })
  dateOfTest: string | null;

  @Column({ name: 'test_protocol_no', length: 50, nullable: true })
  testProtocolNo: string | null;

  @Column({ name: 'date_of_test_protocol', type: 'date', nullable: true })
  dateOfTestProtocol: string | null;

  @Column({ name: 'date_of_expiry', type: 'date', nullable: true })
  dateOfExpiry: string | null;

  @Column({ length: 100, nullable: true })
  position: string | null;

  @Column({ name: 'chief_pip', length: 100, nullable: true })
  chiefPip: string | null;

  @Column({
    name: 'course_type',
    type: 'enum',
    enum: CourseType,
    nullable: true,
  })
  courseType: CourseType | null;

  @Column({ name: 'last_user', nullable: true })
  lastUser: number | null;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
