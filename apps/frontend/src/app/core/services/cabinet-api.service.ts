import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { type Observable } from 'rxjs';
import { type PaginatedResponse } from '@code95/shared-types';
import { environment } from '../../../environments/environment';
import { buildListParams } from './list-params.util';

export interface CabinetDashboard {
  trainingCenter: {
    id: string;
    name: string;
    nameShort: string;
    edrpou: string;
    certNo: string;
    certDate: string | null;
    region: string | null;
    city: string;
    addrStreet: string;
    addrHouse: string;
    postCode: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    chiefPip: string;
  };
  stats: {
    inEnrollment: number;
    inProcess: number;
    completed: number;
    canceled: number;
  };
  recentGroups: {
    id: string;
    name: string;
    dateStart: string | null;
    dateFinish: string | null;
    status: number;
  }[];
}

export interface CountryItem {
  id: number;
  nameUkr: string;
  nameEng: string;
}

export type DriverStatusCode =
  | 'certified'
  | 'needs_recert'
  | 'in_training'
  | 'not_certified';

export interface CabinetDriver {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  taxNumber: string;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  status: number | null;
  idEspk: number | null;
  idCard: number | null;
  photoImg: string | null;
  signImg: string | null;
  categoriesList: string | null;
  countryOfBirthId: number | null;
  driverLicenseNo: string | null;
  driverLicenseCategories: string | null;
  driverLicenseIssueDate: string | null;
  driverLicenseExpiryDate: string | null;
  driverLicenseUpdatedAt: string | null;
  cCategoryIssueDate: string | null;
  dCategoryIssueDate: string | null;
  intendsUrbanSuburbanRoute: boolean;
  addrTown: string | null;
  addrStreet: string | null;
  addrHouse: string | null;
  addrFlat: string | null;
  postCode: string | null;
  statusId: number | null;
  statusCode: DriverStatusCode;
}

export interface UpdateDriverLicensePayload {
  driverLicenseNo?: string | null;
  driverLicenseCategories?: DriverLicenseCategory[];
  driverLicenseIssueDate?: string | null;
  driverLicenseExpiryDate?: string | null;
  cCategoryIssueDate?: string | null;
  dCategoryIssueDate?: string | null;
  intendsUrbanSuburbanRoute?: boolean;
}

export interface CabinetGraduate extends CabinetDriver {
  groupId: string | null;
  groupName: string;
  groupDateFinish: string | null;
}

/**
 * Course types per Наказ 789, Розділ II, п.9-10.
 * - INITIAL           — початкові навчальні курси (280 год)
 * - INITIAL_SHORTENED — початково-скорочені (140 год)
 * - PERIODIC          — періодичні (35 год)
 */
export enum CourseType {
  INITIAL = 'initial',
  INITIAL_SHORTENED = 'initial_shortened',
  PERIODIC = 'periodic',
}

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

export interface CabinetStudyGroup {
  id: string;
  name: string;
  dateStart: string | null;
  dateFinish: string | null;
  status: number;
  carryTypeId: number | null;
  groupTypeId: string | null;
  courseType: CourseType | null;
  isReducedProgram: boolean;
}

export enum EligibilityFailReason {
  NO_LICENSE_DATA = 'no_license_data',
  CATEGORIES_NOT_MATCHING = 'categories_not_matching',
  EXPERIENCE_INSUFFICIENT = 'experience_insufficient',
  PROGRAM_MISMATCH = 'program_mismatch',
}

export interface DriverEligibilityIssue {
  driverId: number;
  driverName: string;
  reason: EligibilityFailReason;
  detail?: string;
}

export interface CourseEligibilityResult {
  blockedDriverIds: number[];
  blockedDriverNames: string[];
  issues: DriverEligibilityIssue[];
  allEligible: boolean;
}

/** @deprecated Use {@link CourseEligibilityResult}. */
export type ShortCourseEligibilityResult = CourseEligibilityResult;

export interface SplitGroupResult {
  primaryGroupId: string;
  secondaryGroupId: string;
}

export interface CabinetStudyGroupStudent {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  taxNumber: string;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  idEspk: number | null;
  idCard: number | null;
}

export interface CabinetStudyGroupDetail extends CabinetStudyGroup {
  tcName: string;
  tcCertNo: string;
  tcChiefPip: string;
  carryTypeName: string | null;
  groupTypeName: string | null;
  students: CabinetStudyGroupStudent[];
}

export interface GroupTypeItem {
  id: string;
  name: string;
}

export interface AvailableDriver {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  taxNumber: string;
  dateOfBirth: string | null;
}

export interface CarryTypeItem {
  id: number;
  name: string;
  nameSpk: string;
}

export interface MinistryConstants {
  dateOfMiniinfra: string;
  miniinfraNo: string;
  dateOfMinjust: string;
  minjustNo: string;
}

export interface SpkBulkResult {
  driverId: number;
  driverPip: string;
  spkId: number;
  spkNo: string;
  error?: string;
}

export interface SpkDataItem {
  driverId: number;
  surname: string;
  firstName: string;
  middleName: string;
  phone: string | null;
  email: string | null;
  spkId: number | null;
  spkNo: string | null;
  spkExpiry: string | null;
  carryTypeTxt: string | null;
  cardId: number | null;
}

export interface ECardResult {
  id: number;
  serialNo: string;
  dateOfIssue: string;
  dateOfExpiry: string;
}

export interface SpkDetail {
  id: number;
  driverId: number;
  spkNo: string;
  tcCertNo: string;
  tcName: string;
  driverPip: string;
  driverPipFull: string | null;
  dateOfBirth: string | null;
  countryOfBirth: string | null;
  dateOfTest: string | null;
  carryTypeTxt: string | null;
  dateOfMiniinfra: string | null;
  miniinfraNo: string | null;
  dateOfMinjust: string | null;
  minjustNo: string | null;
  testProtocolNo: string | null;
  dateOfTestProtocol: string | null;
  dateOfExpiry: string | null;
  position: string | null;
  chiefPip: string | null;
  createdAt: string | null;
}

// Read-only SPK fields (ministry data, carry type, TC info, derived expiry)
// are fixed at creation time and not part of the update payload.
export interface UpdateSpkPayload {
  driverPip?: string;
  dateOfTest?: string | null;
  testProtocolNo?: string | null;
  dateOfTestProtocol?: string | null;
  position?: string | null;
  chiefPip?: string | null;
}

export interface ECardDetail {
  id: number;
  driverId: number;
  surname: string;
  firstName: string;
  surnameTranslit: string;
  firstNameTranslit: string;
  dateOfBirth: string | null;
  dateOfIssue: string | null;
  dateOfExpiry: string | null;
  issuedBy: string | null;
  registrationNumber: string | null;
  licenceNo: string | null;
  serialNo: string | null;
  categoriesList: string | null;
  unionCode95: string | null;
  photoImg: string | null;
  signImg: string | null;
  qrImg: string | null;
  createdAt: string | null;
}

// serialNo, dateOfExpiry and issuedBy are read-only after creation and not
// part of the update payload.
export interface UpdateECardPayload {
  surname?: string;
  firstName?: string;
  surnameTranslit?: string;
  firstNameTranslit?: string;
  dateOfIssue?: string | null;
  registrationNumber?: string | null;
  licenceNo?: string | null;
  unionCode95?: string | null;
  photoImg?: string | null;
  signImg?: string | null;
  categoriesList?: string | null;
}

export interface RegistrySpk {
  id: number;
  tcCertNo: string;
  tcName: string;
  dateOfTest: string | null;
  carryTypeName: string | null;
  dateOfMiniinfra: string | null;
  miniinfraNo: string | null;
  dateOfMinjust: string | null;
  minjustNo: string | null;
  dateOfTestProtocol: string | null;
  testProtocolNo: string | null;
  dateOfExpiry: string | null;
  position: string | null;
  chiefPip: string | null;
}

export interface RegistryEntryDetail {
  driverPip: string;
  carryType: string | null;
  atiCode: string;
  categoriesList: string | null;
  unionCode95: string | null;
  espks: RegistrySpk[];
}

export interface ExcelImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface CabinetDriverDetail extends CabinetDriver {
  lastEcardCreatedAt: string | null;
  surnameTranslit: string | null;
  firstNameTranslit: string | null;
}

export interface UpdateDriverPayload {
  surname?: string;
  firstName?: string;
  middleName?: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  categoriesList?: string | null;
  countryOfBirthId?: number | null;
  countryOfBirthName?: string | null;
  surnameTranslit?: string;
  firstNameTranslit?: string;
  addrTown?: string | null;
  addrStreet?: string | null;
  addrHouse?: string | null;
  addrFlat?: string | null;
  postCode?: string | null;
  statusId?: number | null;
}

export interface CreateStudyGroupPayload {
  name: string;
  carryTypeId?: number | null;
  groupTypeId?: string | null;
  dateStart?: string | null;
  dateFinish?: string | null;
  courseType?: CourseType | null;
}

export type UpdateStudyGroupPayload = Partial<CreateStudyGroupPayload>;

export interface CreateSpkBulkPayload {
  driverIds: number[];
  carryTypeId?: number | null;
  dateOfTest: string;
  dateOfTestProtocol: string;
  testProtocolNo: string;
  /** @deprecated Server derives expiry as dateOfTest + 5 years (Наказ 789, п.27). */
  dateOfExpiry?: string;
  position?: string;
  chiefPip?: string;
}

export interface DriverEcardPrefill {
  driverId: number;
  surname: string;
  firstName: string;
  dateOfBirth: string | null;
  spkSerialNo: string | null;
  spkDateOfExpiry: string | null;
  spkDateOfTestProtocol: string | null;
  spkCarryTypeId: number | null;
  unionCode95: string | null;
  issuedBy: string;
  driverLicenseNo: string | null;
  driverLicenseCategories: string | null;
  photoImg: string | null;
  signImg: string | null;
}

export interface CreateECardPayload {
  surnameTranslit: string;
  firstNameTranslit: string;
  registrationNumber?: string;
  licenceNo: string;
  dateOfIssue?: string;
  issuedBy?: string;
  unionCode95?: string;
  photoImg?: string;
  signImg?: string;
  categoriesList?: string;
}

export interface DriverHistorySpkItem {
  id: number;
  spkNo: string;
  tcName: string;
  tcCertNo: string;
  carryTypeTxt: string | null;
  courseType: string | null;
  dateOfTest: string | null;
  dateOfExpiry: string | null;
  createdAt: string | null;
}

export interface DriverHistoryResult {
  driverId: number;
  spkHistory: DriverHistorySpkItem[];
}

@Injectable({ providedIn: 'root' })
export class CabinetApiService {
  private readonly api = `${environment.apiUrl}/cabinet`;

  private readonly http = inject(HttpClient);

  getDashboard(): Observable<CabinetDashboard | null> {
    return this.http.get<CabinetDashboard | null>(`${this.api}/me`);
  }

  getCountries(): Observable<CountryItem[]> {
    return this.http.get<CountryItem[]>(`${this.api}/countries`);
  }

  getCarryTypes(): Observable<CarryTypeItem[]> {
    return this.http.get<CarryTypeItem[]>(`${this.api}/carry-types`);
  }

  getGroupTypes(): Observable<GroupTypeItem[]> {
    return this.http.get<GroupTypeItem[]>(`${this.api}/group-types`);
  }

  getConstants(): Observable<MinistryConstants | null> {
    return this.http.get<MinistryConstants | null>(`${this.api}/constants`);
  }

  checkEligibility(data: {
    driverLicenseCategories?: string[];
    driverLicenseIssueDate?: string | null;
    driverLicenseExpiryDate?: string | null;
    cCategoryIssueDate?: string | null;
    dCategoryIssueDate?: string | null;
    intendsUrbanSuburbanRoute?: boolean;
  }): Observable<{
    canEnrollInitial: boolean;
    canEnrollShortened: boolean;
    canEnrollPeriodic: boolean;
    reasons: { initial?: string; shortened?: string; periodic?: string };
  }> {
    return this.http.post<{
      canEnrollInitial: boolean;
      canEnrollShortened: boolean;
      canEnrollPeriodic: boolean;
      reasons: { initial?: string; shortened?: string; periodic?: string };
    }>(`${this.api}/drivers/check-eligibility`, data);
  }

  createDriver(data: {
    surname: string;
    firstName: string;
    middleName: string;
    taxNumber: string;
    dateOfBirth?: string | null;
    phone?: string | null;
    email?: string | null;
    surnameTranslit?: string | null;
    firstNameTranslit?: string | null;
    countryOfBirthId?: number | null;
    countryOfBirthName?: string | null;
    addrTown?: string | null;
    addrStreet?: string | null;
    addrHouse?: string | null;
    addrFlat?: string | null;
    postCode?: string | null;
    statusId?: number | null;
    categoriesList?: string[];
    driverLicenseNo?: string | null;
    driverLicenseCategories?: string[];
    driverLicenseIssueDate?: string | null;
    driverLicenseExpiryDate?: string | null;
    cCategoryIssueDate?: string | null;
    dCategoryIssueDate?: string | null;
    intendsUrbanSuburbanRoute?: boolean;
  }): Observable<CabinetDriver> {
    return this.http.post<CabinetDriver>(`${this.api}/drivers`, data);
  }

  getDriver(id: number): Observable<CabinetDriverDetail> {
    return this.http.get<CabinetDriverDetail>(`${this.api}/drivers/${id}`);
  }

  updateDriver(
    id: number,
    payload: UpdateDriverPayload,
  ): Observable<CabinetDriverDetail> {
    return this.http.patch<CabinetDriverDetail>(
      `${this.api}/drivers/${id}`,
      payload,
    );
  }

  updateDriverLicense(
    id: number,
    payload: UpdateDriverLicensePayload,
  ): Observable<CabinetDriver> {
    return this.http.patch<CabinetDriver>(
      `${this.api}/drivers/${id}/license`,
      payload,
    );
  }

  validateCourseEligibility(
    groupId: string,
  ): Observable<CourseEligibilityResult> {
    return this.http.get<CourseEligibilityResult>(
      `${this.api}/study-groups/${groupId}/eligibility`,
    );
  }

  getDrivers(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<CabinetDriver>> {
    return this.http.get<PaginatedResponse<CabinetDriver>>(
      `${this.api}/drivers`,
      {
        params: buildListParams({ page, pageSize, sort, order, search }),
      },
    );
  }

  getGraduates(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<CabinetGraduate>> {
    return this.http.get<PaginatedResponse<CabinetGraduate>>(
      `${this.api}/graduates`,
      {
        params: buildListParams({ page, pageSize, sort, order, search }),
      },
    );
  }

  getStudyGroups(
    page = 1,
    pageSize = 10,
    sort?: string,
    order?: string,
    search?: string,
  ): Observable<PaginatedResponse<CabinetStudyGroup>> {
    return this.http.get<PaginatedResponse<CabinetStudyGroup>>(
      `${this.api}/study-groups`,
      {
        params: buildListParams({ page, pageSize, sort, order, search }),
      },
    );
  }

  getStudyGroup(id: string): Observable<CabinetStudyGroupDetail> {
    return this.http.get<CabinetStudyGroupDetail>(
      `${this.api}/study-groups/${id}`,
    );
  }

  createStudyGroup(
    payload: CreateStudyGroupPayload,
  ): Observable<CabinetStudyGroup> {
    return this.http.post<CabinetStudyGroup>(
      `${this.api}/study-groups`,
      payload,
    );
  }

  updateStudyGroup(
    id: string,
    payload: UpdateStudyGroupPayload,
  ): Observable<CabinetStudyGroup> {
    return this.http.patch<CabinetStudyGroup>(
      `${this.api}/study-groups/${id}`,
      payload,
    );
  }

  deleteStudyGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/study-groups/${id}`);
  }

  changeStudyGroupStatus(
    id: string,
    status: number,
  ): Observable<CabinetStudyGroup> {
    return this.http.patch<CabinetStudyGroup>(
      `${this.api}/study-groups/${id}/status`,
      { status },
    );
  }

  validateShortCourseEligibility(
    groupId: string,
  ): Observable<ShortCourseEligibilityResult> {
    return this.http.get<ShortCourseEligibilityResult>(
      `${this.api}/study-groups/${groupId}/eligibility`,
    );
  }

  splitGroup(
    groupId: string,
    blockedDriverIds: number[],
  ): Observable<SplitGroupResult> {
    return this.http.post<SplitGroupResult>(
      `${this.api}/study-groups/${groupId}/split`,
      { blockedDriverIds },
    );
  }

  splitStudyGroup(
    groupId: string,
    dto: { blockedDriverIds: number[] },
  ): Observable<SplitGroupResult> {
    return this.http.post<SplitGroupResult>(
      `${this.api}/study-groups/${groupId}/split`,
      dto,
    );
  }

  setStudyGroupCourseType(
    groupId: string,
    courseType: CourseType,
  ): Observable<CabinetStudyGroup> {
    return this.http.patch<CabinetStudyGroup>(
      `${this.api}/study-groups/${groupId}/course-type`,
      { courseType },
    );
  }

  searchAvailableDrivers(
    groupId: string,
    q: string,
  ): Observable<AvailableDriver[]> {
    return this.http.get<AvailableDriver[]>(
      `${this.api}/study-groups/${groupId}/available-drivers`,
      { params: { q } },
    );
  }

  addStudent(groupId: string, driverId: number): Observable<void> {
    return this.http.post<void>(
      `${this.api}/study-groups/${groupId}/students`,
      { driverId },
    );
  }

  removeStudent(groupId: string, driverId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/study-groups/${groupId}/students/${driverId}`,
    );
  }

  createAndAddDriver(
    groupId: string,
    data: {
      surname: string;
      firstName: string;
      middleName: string;
      taxNumber: string;
      dateOfBirth?: string | null;
      phone?: string | null;
      email?: string | null;
      surnameTranslit?: string | null;
      firstNameTranslit?: string | null;
      countryOfBirthId?: number | null;
      countryOfBirthName?: string | null;
      addrTown?: string | null;
      addrStreet?: string | null;
      addrHouse?: string | null;
      addrFlat?: string | null;
      postCode?: string | null;
      statusId?: number | null;
      categoriesList?: string[];
      driverLicenseNo?: string | null;
      driverLicenseCategories?: string[];
      driverLicenseIssueDate?: string | null;
      driverLicenseExpiryDate?: string | null;
      cCategoryIssueDate?: string | null;
      dCategoryIssueDate?: string | null;
      intendsUrbanSuburbanRoute?: boolean;
    },
  ): Observable<CabinetDriver> {
    return this.http.post<CabinetDriver>(
      `${this.api}/study-groups/${groupId}/drivers`,
      data,
    );
  }

  downloadSpkArchive(groupId: string): Observable<Blob> {
    return this.http.get(`${this.api}/study-groups/${groupId}/archive-spk`, {
      responseType: 'blob',
    });
  }

  downloadPersonalizationArchive(groupId: string): Observable<Blob> {
    return this.http.get(
      `${this.api}/study-groups/${groupId}/archive-personalization`,
      { responseType: 'blob' },
    );
  }

  getStudyGroupSpkData(groupId: string): Observable<SpkDataItem[]> {
    return this.http.get<SpkDataItem[]>(
      `${this.api}/study-groups/${groupId}/spk-data`,
    );
  }

  createSpkBulk(
    groupId: string,
    payload: CreateSpkBulkPayload,
  ): Observable<SpkBulkResult[]> {
    return this.http.post<SpkBulkResult[]>(
      `${this.api}/study-groups/${groupId}/spk`,
      payload,
    );
  }

  getDriverEcardPrefill(driverId: number): Observable<DriverEcardPrefill> {
    return this.http.get<DriverEcardPrefill>(
      `${this.api}/drivers/${driverId}/ecard-prefill`,
    );
  }

  createECard(
    driverId: number,
    payload: CreateECardPayload,
  ): Observable<ECardResult> {
    return this.http.post<ECardResult>(
      `${this.api}/drivers/${driverId}/ecard`,
      payload,
    );
  }

  importDriversFromExcel(
    groupId: string,
    file: File,
  ): Observable<ExcelImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExcelImportResult>(
      `${this.api}/study-groups/${groupId}/import-excel`,
      formData,
    );
  }

  getSpk(id: number): Observable<SpkDetail> {
    return this.http.get<SpkDetail>(`${this.api}/espk/${id}`);
  }

  updateSpk(id: number, payload: UpdateSpkPayload): Observable<SpkDetail> {
    return this.http.patch<SpkDetail>(`${this.api}/espk/${id}`, payload);
  }

  downloadSpkPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.api}/espk/${id}/pdf`, {
      responseType: 'blob',
    });
  }

  getECard(id: number): Observable<ECardDetail> {
    return this.http.get<ECardDetail>(`${this.api}/ecards/${id}`);
  }

  updateECard(
    id: number,
    payload: UpdateECardPayload,
  ): Observable<ECardDetail> {
    return this.http.patch<ECardDetail>(`${this.api}/ecards/${id}`, payload);
  }

  uploadDriverFile(
    driverId: number,
    field: 'photo' | 'signature',
    file: File,
  ): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.api}/drivers/${driverId}/upload/${field}`,
      formData,
    );
  }

  uploadEcardFile(
    ecardId: number,
    field: 'photo' | 'signature',
    file: File,
  ): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${this.api}/ecards/${ecardId}/upload/${field}`,
      formData,
    );
  }

  getRegistryEntry(driverId: number): Observable<RegistryEntryDetail> {
    return this.http.get<RegistryEntryDetail>(
      `${environment.apiUrl}/registry/${driverId}`,
    );
  }

  getDriverHistory(driverId: number): Observable<DriverHistoryResult> {
    return this.http.get<DriverHistoryResult>(
      `${this.api}/drivers/${driverId}/history`,
    );
  }
}
