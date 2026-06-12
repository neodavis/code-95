import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'system_edriver' })
export class EDriver {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  surname: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'middle_name', length: 100, default: '' })
  middleName: string;

  @Column({ name: 'tax_number', length: 20, unique: true })
  taxNumber: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ length: 100, nullable: true })
  email: string | null;

  @Column({ name: 'status_id', nullable: true })
  statusId: number | null;

  @Column({ name: 'id_espk', nullable: true })
  idEspk: number | null;

  @Column({ name: 'id_card', nullable: true })
  idCard: number | null;

  @Column({ name: 'tc_id' })
  tcId: number;

  @Column({ name: 'country_of_birth_id', nullable: true })
  countryOfBirthId: number | null;

  @Column({ name: 'addr_town', length: 50, nullable: true })
  addrTown: string | null;

  @Column({ name: 'addr_street', length: 50, nullable: true })
  addrStreet: string | null;

  @Column({ name: 'addr_house', length: 8, nullable: true })
  addrHouse: string | null;

  @Column({ name: 'addr_flat', length: 5, nullable: true })
  addrFlat: string | null;

  @Column({ name: 'post_code', length: 5, nullable: true })
  postCode: string | null;

  @Column({ name: 'photo_img', length: 500, nullable: true })
  photoImg: string | null;

  @Column({ name: 'sign_img', length: 500, nullable: true })
  signImg: string | null;

  @Column({ name: 'driver_license_no', length: 50, nullable: true })
  driverLicenseNo: string | null;

  @Column({ name: 'driver_license_categories', length: 100, nullable: true })
  driverLicenseCategories: string | null;

  @Column({ name: 'driver_license_issue_date', type: 'date', nullable: true })
  driverLicenseIssueDate: string | null;

  @Column({ name: 'driver_license_expiry_date', type: 'date', nullable: true })
  driverLicenseExpiryDate: string | null;

  @Column({
    name: 'driver_license_updated_at',
    type: 'timestamp',
    nullable: true,
  })
  driverLicenseUpdatedAt: Date | null;

  @Column({ name: 'c_category_issue_date', type: 'date', nullable: true })
  cCategoryIssueDate: string | null;

  @Column({ name: 'd_category_issue_date', type: 'date', nullable: true })
  dCategoryIssueDate: string | null;

  @Column({ name: 'intends_urban_suburban_route', default: false })
  intendsUrbanSuburbanRoute: boolean;

  @Column({ name: 'surname_trans', length: 50, nullable: true })
  surnameTrans: string | null;

  @Column({ name: 'first_name_trans', length: 50, nullable: true })
  firstNameTrans: string | null;

  @Column({ name: 'categories_list', length: 30, nullable: true })
  categoriesList: string | null;

  @Column({ name: 'last_user', nullable: true })
  lastUser: number | null;

  @Column({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date | null;
}
