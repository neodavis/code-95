/**
 * Driver license categories per Наказ 789, Розділ II, п.11.
 * Used for course eligibility validation.
 */
export enum DriverLicenseCategory {
  C = 'C',
  CE = 'CE',
  C1 = 'C1',
  C1E = 'C1E',
  D = 'D',
  DE = 'DE',
  D1 = 'D1',
  D1E = 'D1E',
}

export const DRIVER_LICENSE_CATEGORIES: readonly DriverLicenseCategory[] = [
  DriverLicenseCategory.C,
  DriverLicenseCategory.CE,
  DriverLicenseCategory.C1,
  DriverLicenseCategory.C1E,
  DriverLicenseCategory.D,
  DriverLicenseCategory.DE,
  DriverLicenseCategory.D1,
  DriverLicenseCategory.D1E,
];

export interface EDriverStatus {
  id: number;
  name: string;
}

export interface EDriver {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  taxNumber: string;
  phone: string;
  email: string;
  dateOfBirth: string; // ISO date
  countryOfBirth: number | null;
  addrTown: string;
  addrStreet: string;
  addrHouse: string;
  addrFlat: string;
  postCode: string;
  surnameTranslit: string;
  firstNameTranslit: string;
  licenceNo: string;
  categoriesList: string;
  idEspk: number | null;
  idCard: number | null;
  tc: number | null;
  status: number | null;
  createdAt: string;
  updatedAt: string;
  lastUser: number | null;
  /** Driver license number (Posvidchennia vodiia). */
  driverLicenseNo: string | null;
  /** CSV of {@link DriverLicenseCategory}. */
  driverLicenseCategories: string | null;
  driverLicenseIssueDate: string | null;
  driverLicenseExpiryDate: string | null;
  /** Last time the license fields were modified — used to gate re-edits. */
  driverLicenseUpdatedAt: string | null;
  /** D/DE drivers declaring intent to work an urban or suburban route (п.11.2). */
  intendsUrbanSuburbanRoute: boolean;
}

export interface EDriverRegistry {
  driver: number;
  driverPip: string;
  dateOfExpiry: string;
  categoriesList: string;
  carryType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverPayload {
  surname: string;
  firstName: string;
  middleName: string;
  taxNumber: string;
  dateOfBirth: string;
  phone?: string;
  email?: string;
}

export interface DriverListParams {
  page?: number;
  limit?: number;
  search?: string;
  statusId?: number;
  tcId?: number;
}
