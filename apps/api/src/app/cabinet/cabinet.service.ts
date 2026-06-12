import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository, MoreThanOrEqual } from 'typeorm';
import {
  buildResult,
  type PaginatedResult,
  type SortParam,
  paginateWithSearch,
} from '../common/paginate';
import * as XLSX from 'xlsx';
import * as puppeteer from 'puppeteer';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import archiver = require('archiver');

import { TrainingCenter } from '../training-centers/entities/training-center.entity';
import { TrainingCenterEmployee } from '../training-centers/entities/training-center-employee.entity';
import { StudyGroupType } from '../study-group-types/entities/study-group-type.entity';
import { StudyGroup } from './entities/study-group.entity';
import { StudyGroupStudent } from './entities/study-group-student.entity';
import { StudyGroupLog } from './entities/study-group-log.entity';
import { EDriver } from './entities/edriver.entity';
import { ESPK } from './entities/espk.entity';
import { ECard } from './entities/ecard.entity';
import { EDriverRegistry } from './entities/edriver-registry.entity';
import { ECarryType } from './entities/ecarry-type.entity';
import { EConstant } from './entities/econstant.entity';
import { ECountry } from './entities/ecountry.entity';
import {
  CourseType,
  DriverLicenseCategory,
  EligibilityFailReason,
  NAME_EDIT_WINDOW_MS,
  SPK_VALIDITY_YEARS,
  StudyGroupStatus,
} from '@code95/shared-types';
import {
  qualifiesForReducedProgram,
  validateDriverEligibility,
  type DriverLicenseSnapshot,
} from './eligibility.util';
import { transliterate } from './transliterate.util';
import {
  ALLOWED_STATUS_TRANSITIONS,
  DASHBOARD_RECENT_GROUPS_LIMIT,
  DRIVER_SEARCH_LIMIT,
  MAX_GROUP_SIZE,
} from './cabinet.constants';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-log.entity';
import { type UpdateSpkDto } from './dto/update-spk.dto';
import { type UpdateECardDto } from './dto/update-ecard.dto';
import { type UpdateDriverDto } from './dto/update-driver.dto';
import { type CreateDriverDto } from './dto/create-driver.dto';
import { type UpdateDriverLicenseDto } from './dto/update-driver-license.dto';

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

/**
 * Driver certification status — derived on read (never stored). The numeric
 * `status_id` column is legacy and no longer drives the displayed status.
 * - certified     — has an SPK whose date_of_expiry is today or later
 * - needs_recert  — has an SPK but its latest date_of_expiry is in the past
 * - in_training   — no SPK yet, but enrolled in an active study group
 * - not_certified — no SPK and not enrolled in any active group
 */
export const DRIVER_STATUS_CODES = {
  CERTIFIED: 'certified',
  NEEDS_RECERT: 'needs_recert',
  IN_TRAINING: 'in_training',
  NOT_CERTIFIED: 'not_certified',
} as const;
export type DriverStatusCode =
  (typeof DRIVER_STATUS_CODES)[keyof typeof DRIVER_STATUS_CODES];

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
  surnameTranslit: string | null;
  firstNameTranslit: string | null;
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

export interface CabinetGraduate extends CabinetDriver {
  groupName: string;
  groupDateFinish: string | null;
}

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

export interface SplitGroupResult {
  /** Original group, retains the eligible drivers. */
  primaryGroupId: string;
  /** Newly created group, holds the previously blocked drivers. */
  secondaryGroupId: string;
}

export interface CabinetStudyGroupDetail extends CabinetStudyGroup {
  tcName: string;
  tcCertNo: string;
  tcChiefPip: string;
  carryTypeName: string | null;
  groupTypeName: string | null;
  students: {
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
  }[];
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

export interface CreateCabinetDriverPayload {
  surname: string;
  firstName: string;
  middleName?: string;
  taxNumber: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  countryOfBirthId?: number | null;
  addrTown?: string | null;
  addrStreet?: string | null;
  addrHouse?: string | null;
  addrFlat?: string | null;
  postCode?: string | null;
}

export interface CreateSpkBulkPayload {
  carryTypeId?: number | null;
  dateOfTest: string;
  dateOfTestProtocol: string;
  testProtocolNo: string;
  /** @deprecated Server derives expiry as dateOfTest + 5 years (Наказ 789, п.27). */
  dateOfExpiry?: string;
  position?: string;
  chiefPip?: string;
}

export interface SpkBulkResult {
  driverId: number;
  driverPip: string;
  spkId: number;
  spkNo: string;
  error?: string;
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
  licenceNo?: string;
  dateOfIssue?: string;
  dateOfExpiry?: string;
  issuedBy?: string;
  unionCode95?: string;
  photoImg?: string;
  signImg?: string;
  categoriesList?: string;
}

export interface ECardResult {
  id: number;
  serialNo: string;
  dateOfIssue: string;
  dateOfExpiry: string;
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

export interface SpkDetail {
  id: number;
  uuid: string;
  driverId: number;
  spkNo: string;
  tcCertNo: string;
  tcName: string;
  createdAt: string | null;
  tcAddress: string | null;
  driverPip: string;
  driverPipFull: string | null;
  driverPiTrans: string | null;
  dateOfBirth: string | null;
  countryOfBirth: string | null;
  categoriesList: string | null;
  dateOfTest: string | null;
  carryTypeTxt: string | null;
  carryTypeNameSpk: string | null;
  dateOfMiniinfra: string | null;
  miniinfraNo: string | null;
  dateOfMinjust: string | null;
  minjustNo: string | null;
  testProtocolNo: string | null;
  dateOfTestProtocol: string | null;
  dateOfExpiry: string | null;
  position: string | null;
  chiefPip: string | null;
}

export interface ECardDetail {
  id: number;
  driverId: number;
  surname: string;
  firstName: string;
  surnameTranslit: string;
  firstNameTranslit: string;
  dateOfBirth: string | null;
  countryOfBirth: string | null;
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

export interface ExcelImportResult {
  imported: number;
  skipped: number;
  errors: string[];
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

// Allowed columns for search — maps entity property names
const DRIVERS_SEARCH_COLUMNS = [
  'surname',
  'firstName',
  'middleName',
  'taxNumber',
  'dateOfBirth',
  'phone',
] as const;

const GROUPS_SEARCH_COLUMNS = [
  'name',
  'status',
  'dateStart',
  'dateFinish',
] as const;

@Injectable()
export class CabinetService {
  static readonly DRIVERS_ALLOWED = [
    ...DRIVERS_SEARCH_COLUMNS,
  ] as readonly string[];
  static readonly GROUPS_ALLOWED = [
    ...GROUPS_SEARCH_COLUMNS,
  ] as readonly string[];
  static readonly GRADUATES_ALLOWED = [
    'surname',
    'firstName',
    'taxNumber',
  ] as readonly string[];

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TrainingCenterEmployee)
    private readonly tceRepo: Repository<TrainingCenterEmployee>,
    @InjectRepository(TrainingCenter)
    private readonly tcRepo: Repository<TrainingCenter>,
    @InjectRepository(StudyGroup)
    private readonly sgRepo: Repository<StudyGroup>,
    @InjectRepository(StudyGroupStudent)
    private readonly sgsRepo: Repository<StudyGroupStudent>,
    @InjectRepository(StudyGroupLog)
    private readonly sgLogRepo: Repository<StudyGroupLog>,
    @InjectRepository(EDriver)
    private readonly driverRepo: Repository<EDriver>,
    @InjectRepository(ESPK)
    private readonly spkRepo: Repository<ESPK>,
    @InjectRepository(ECard)
    private readonly cardRepo: Repository<ECard>,
    @InjectRepository(EDriverRegistry)
    private readonly registryRepo: Repository<EDriverRegistry>,
    @InjectRepository(ECarryType)
    private readonly carryTypeRepo: Repository<ECarryType>,
    @InjectRepository(EConstant)
    private readonly constantRepo: Repository<EConstant>,
    @InjectRepository(ECountry)
    private readonly countryRepo: Repository<ECountry>,
    @InjectRepository(StudyGroupType)
    private readonly sgtRepo: Repository<StudyGroupType>,
    private readonly storageService: StorageService,
    private readonly audit: AuditService,
  ) {}

  private async getTcId(userId: string): Promise<string | null> {
    const employee = await this.tceRepo.findOne({
      where: { userId, isActive: true },
      select: ['trainingCenterId'],
    });
    return employee ? employee.trainingCenterId : null;
  }

  private async getTcOldId(userId: string): Promise<number | null> {
    const tcId = await this.getTcId(userId);
    if (!tcId) return null;
    const tc = await this.tcRepo.findOne({
      where: { id: tcId },
      select: ['id', 'oldId'],
    });
    if (!tc) return null;
    if (tc.oldId != null) return tc.oldId;
    const row = await this.tcRepo
      .createQueryBuilder('tc')
      .select('COALESCE(MAX(tc.old_id), 0) + 1', 'next')
      .getRawOne<{ next: number | string }>();
    const next = Number(row?.next ?? 1);
    await this.tcRepo.update({ id: tcId }, { oldId: next });
    return next;
  }

  private mapDate(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
    return str;
  }

  /**
   * Returns an ISO `YYYY-MM-DD` date `years` after the supplied ISO date.
   * Anchors the SPK 5-year validity per Наказ 789, Розділ II, п.27.
   * Handles Feb-29 by clamping to the last day of February in non-leap years.
   */
  private addYearsIso(isoDate: string, years: number): string {
    const [y, m, d] = isoDate.substring(0, 10).split('-').map(Number);
    const target = new Date(Date.UTC(y + years, m - 1, d));
    if (target.getUTCMonth() !== m - 1) {
      target.setUTCDate(0); // roll back to last day of previous month
    }
    const yy = target.getUTCFullYear();
    const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(target.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  private transliterateUkr(text: string): string {
    const MAP: Record<string, string> = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'h',
      ґ: 'g',
      д: 'd',
      е: 'e',
      є: 'ie',
      ж: 'zh',
      з: 'z',
      и: 'y',
      і: 'i',
      ї: 'i',
      й: 'i',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ф: 'f',
      х: 'kh',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'shch',
      ь: '',
      ю: 'iu',
      я: 'ia',
      А: 'A',
      Б: 'B',
      В: 'V',
      Г: 'H',
      Ґ: 'G',
      Д: 'D',
      Е: 'E',
      Є: 'Ie',
      Ж: 'Zh',
      З: 'Z',
      И: 'Y',
      І: 'I',
      Ї: 'I',
      Й: 'I',
      К: 'K',
      Л: 'L',
      М: 'M',
      Н: 'N',
      О: 'O',
      П: 'P',
      Р: 'R',
      С: 'S',
      Т: 'T',
      У: 'U',
      Ф: 'F',
      Х: 'Kh',
      Ц: 'Ts',
      Ч: 'Ch',
      Ш: 'Sh',
      Щ: 'Shch',
      Ь: '',
      Ю: 'Iu',
      Я: 'Ia',
    };
    return text
      .split('')
      .map((ch) => MAP[ch] ?? ch)
      .join('');
  }

  private buildDriverPip(
    surname: string,
    firstName: string,
    middleName: string,
  ): string {
    if (firstName && middleName) {
      return `${surname} ${firstName.charAt(0).toUpperCase()}. ${middleName.charAt(0).toUpperCase()}.`;
    }
    if (firstName) {
      return `${surname} ${firstName}`;
    }
    return surname;
  }

  async getDashboard(userId: string): Promise<CabinetDashboard | null> {
    const tcId = await this.getTcId(userId);
    if (!tcId) return null;

    const tc = await this.tcRepo.findOne({ where: { id: tcId } });
    if (!tc) return null;

    const statsRows: { status: number; cnt: string }[] = await this.sgRepo
      .createQueryBuilder('sg')
      .select('sg.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('sg.trainingCenterId = :tcId', { tcId })
      .groupBy('sg.status')
      .getRawMany();

    const stats = { inEnrollment: 0, inProcess: 0, completed: 0, canceled: 0 };
    for (const s of statsRows) {
      const cnt = Number(s.cnt);
      const status = Number(s.status);
      if (status === 1 || status === 2) stats.inEnrollment += cnt;
      else if (status === 3) stats.inProcess = cnt;
      else if (status === 4) stats.completed = cnt;
      else if (status === 5) stats.canceled = cnt;
    }

    const recentGroups = await this.sgRepo.find({
      where: { trainingCenterId: tcId },
      order: { id: 'DESC' },
      take: DASHBOARD_RECENT_GROUPS_LIMIT,
    });

    return {
      trainingCenter: {
        id: tc.id,
        name: tc.name,
        nameShort: tc.nameShort,
        edrpou: tc.edrpou,
        certNo: tc.certNo,
        certDate: tc.certDate,
        region: tc.region,
        city: tc.city,
        addrStreet: tc.addrStreet,
        addrHouse: tc.addrHouse,
        postCode: tc.postCode,
        phone: tc.phone,
        email: tc.email,
        website: tc.website,
        chiefPip: tc.chiefPip,
      },
      stats,
      recentGroups: recentGroups.map((g) => ({
        id: g.id,
        name: g.name,
        dateStart: g.dateStart,
        dateFinish: g.dateFinish,
        status: g.status,
      })),
    };
  }

  async getDrivers(
    userId: string,
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<CabinetDriver>> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) return buildResult([], 0, page, pageSize);

    const result = await paginateWithSearch(
      this.driverRepo,
      { where: { tcId: tcOldId } },
      page,
      pageSize,
      sort,
      search,
      CabinetService.DRIVERS_ALLOWED,
    );

    const statusMap = await this.computeStatusForDrivers(
      result.results.map((d) => d.id),
    );

    return {
      ...result,
      results: result.results.map((d) => ({
        ...this.mapDriverEntity(d),
        statusCode: statusMap.get(d.id) ?? DRIVER_STATUS_CODES.NOT_CERTIFIED,
      })),
    };
  }

  async getDriver(
    userId: string,
    driverId: number,
  ): Promise<CabinetDriver & { lastEcardCreatedAt: string | null }> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const driver = await this.driverRepo.findOne({
      where: { id: driverId, tcId: tcOldId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const lastEcard = await this.cardRepo.findOne({
      where: { driverId },
      order: { createdAt: 'DESC' },
    });

    const statusCode = await this.computeStatusForDriver(driverId);

    return {
      ...this.mapDriverEntity(driver),
      statusCode,
      lastEcardCreatedAt: lastEcard?.createdAt
        ? lastEcard.createdAt.toISOString()
        : null,
      surnameTranslit: lastEcard?.surnameTrans ?? driver.surnameTrans ?? null,
      firstNameTranslit:
        lastEcard?.firstNameTrans ?? driver.firstNameTrans ?? null,
      categoriesList:
        lastEcard?.categoriesList ?? driver.categoriesList ?? null,
    };
  }

  checkEligibility(data: {
    driverLicenseCategories?: string[];
    driverLicenseIssueDate?: string | null;
    driverLicenseExpiryDate?: string | null;
    cCategoryIssueDate?: string | null;
    dCategoryIssueDate?: string | null;
    intendsUrbanSuburbanRoute?: boolean;
  }): {
    canEnrollInitial: boolean;
    canEnrollShortened: boolean;
    canEnrollPeriodic: boolean;
    reasons: { initial?: string; shortened?: string; periodic?: string };
  } {
    const snapshot: DriverLicenseSnapshot = {
      driverLicenseCategories: data.driverLicenseCategories?.length
        ? data.driverLicenseCategories.join(',')
        : null,
      driverLicenseIssueDate: data.driverLicenseIssueDate ?? null,
      driverLicenseExpiryDate: data.driverLicenseExpiryDate ?? null,
      cCategoryIssueDate: data.cCategoryIssueDate ?? null,
      dCategoryIssueDate: data.dCategoryIssueDate ?? null,
      intendsUrbanSuburbanRoute: data.intendsUrbanSuburbanRoute ?? false,
      hasPriorSpk: false,
    };
    const initial = validateDriverEligibility(snapshot, CourseType.INITIAL);
    const shortened = validateDriverEligibility(
      snapshot,
      CourseType.INITIAL_SHORTENED,
    );
    const periodic = validateDriverEligibility(snapshot, CourseType.PERIODIC);
    return {
      canEnrollInitial: initial.ok,
      canEnrollShortened: shortened.ok,
      canEnrollPeriodic: periodic.ok,
      reasons: {
        initial: initial.ok ? undefined : initial.detail,
        shortened: shortened.ok ? undefined : shortened.detail,
        periodic: periodic.ok ? undefined : periodic.detail,
      },
    };
  }

  async createDriver(
    userId: string,
    data: CreateDriverDto,
  ): Promise<CabinetDriver> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    let countryOfBirthId = data.countryOfBirthId ?? null;
    if (data.countryOfBirthName && data.countryOfBirthName.trim()) {
      const trimmed = data.countryOfBirthName.trim();
      const existing = await this.countryRepo
        .createQueryBuilder('c')
        .where('LOWER(c.nameUkr) = LOWER(:n)', { n: trimmed })
        .getOne();
      if (existing) {
        countryOfBirthId = existing.id;
      } else {
        const created = await this.countryRepo.save(
          this.countryRepo.create({
            nameUkr: trimmed,
            nameEng: trimmed,
          }),
        );
        countryOfBirthId = created.id;
      }
    }

    const now = new Date();
    const hasLicenseData =
      (data.driverLicenseNo != null && data.driverLicenseNo !== '') ||
      (data.driverLicenseCategories &&
        data.driverLicenseCategories.length > 0) ||
      data.driverLicenseIssueDate != null ||
      data.driverLicenseExpiryDate != null;
    const surnameTrans =
      data.surnameTranslit && data.surnameTranslit.trim()
        ? data.surnameTranslit.trim()
        : transliterate(data.surname);
    const firstNameTrans =
      data.firstNameTranslit && data.firstNameTranslit.trim()
        ? data.firstNameTranslit.trim()
        : transliterate(data.firstName);

    const driverEntity = this.driverRepo.create({
      surname: data.surname,
      firstName: data.firstName,
      middleName: data.middleName,
      taxNumber: data.taxNumber,
      dateOfBirth: data.dateOfBirth ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      addrTown: data.addrTown ?? null,
      addrStreet: data.addrStreet ?? null,
      addrHouse: data.addrHouse ?? null,
      addrFlat: data.addrFlat ?? null,
      postCode: data.postCode ?? null,
      countryOfBirthId: countryOfBirthId ?? 1,
      statusId: data.statusId ?? 1,
      tcId: tcOldId ?? 0,
      lastUser: null,
      createdAt: now,
      updatedAt: now,
      surnameTrans,
      firstNameTrans,
      categoriesList: data.categoriesList?.length
        ? data.categoriesList.join(',')
        : null,
      driverLicenseNo: data.driverLicenseNo ?? null,
      driverLicenseCategories: data.driverLicenseCategories?.length
        ? data.driverLicenseCategories.join(',')
        : null,
      driverLicenseIssueDate: data.driverLicenseIssueDate ?? null,
      driverLicenseExpiryDate: data.driverLicenseExpiryDate ?? null,
      driverLicenseUpdatedAt: hasLicenseData ? now : null,
      cCategoryIssueDate: data.cCategoryIssueDate ?? null,
      dCategoryIssueDate: data.dCategoryIssueDate ?? null,
      intendsUrbanSuburbanRoute: data.intendsUrbanSuburbanRoute ?? false,
    });

    const existing = await this.driverRepo.findOne({
      where: { taxNumber: data.taxNumber },
      select: ['id'],
    });
    if (existing) {
      throw new ConflictException(
        `Водій з податковим номером ${data.taxNumber} вже існує`,
      );
    }

    const saved = await this.driverRepo.save(driverEntity);
    await this.audit.log(
      AuditAction.DRIVER_CREATE,
      'edriver',
      String(saved.id),
      { taxNumber: saved.taxNumber },
      { userId },
    );
    return this.mapDriverEntity(saved);
  }

  async updateDriver(
    userId: string,
    driverId: number,
    data: UpdateDriverDto,
  ): Promise<CabinetDriver & { lastEcardCreatedAt: string | null }> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const driver = await this.driverRepo.findOne({
      where: { id: driverId, tcId: tcOldId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const lastEcard = await this.cardRepo.findOne({
      where: { driverId },
      order: { createdAt: 'DESC' },
    });

    const patch: Partial<EDriver> = {};

    // Name fields: only within 48h of last ecard
    if (
      data.surname !== undefined ||
      data.firstName !== undefined ||
      data.middleName !== undefined
    ) {
      const canEditName =
        lastEcard?.createdAt != null &&
        Date.now() - new Date(lastEcard.createdAt).getTime() <
          NAME_EDIT_WINDOW_MS;

      if (!canEditName) {
        throw new BadRequestException(
          'Name can only be changed within 48 hours of the last card issuance',
        );
      }
      if (data.surname !== undefined) patch.surname = data.surname;
      if (data.firstName !== undefined) patch.firstName = data.firstName;
      if (data.middleName !== undefined) patch.middleName = data.middleName;
    }

    if (data.dateOfBirth !== undefined)
      patch.dateOfBirth = data.dateOfBirth ?? null;
    if (data.phone !== undefined) patch.phone = data.phone ?? null;
    if (data.email !== undefined) patch.email = data.email ?? null;
    if (data.countryOfBirthName != null && data.countryOfBirthName.trim()) {
      const trimmed = data.countryOfBirthName.trim();
      const existing = await this.countryRepo
        .createQueryBuilder('c')
        .where('LOWER(c.nameUkr) = LOWER(:n)', { n: trimmed })
        .getOne();
      if (existing) {
        patch.countryOfBirthId = existing.id;
      } else {
        const created = await this.countryRepo.save(
          this.countryRepo.create({ nameUkr: trimmed, nameEng: trimmed }),
        );
        patch.countryOfBirthId = created.id;
      }
    } else if (data.countryOfBirthId !== undefined) {
      patch.countryOfBirthId = data.countryOfBirthId ?? null;
    }
    if (data.addrTown !== undefined) patch.addrTown = data.addrTown ?? null;
    if (data.addrStreet !== undefined)
      patch.addrStreet = data.addrStreet ?? null;
    if (data.addrHouse !== undefined) patch.addrHouse = data.addrHouse ?? null;
    if (data.addrFlat !== undefined) patch.addrFlat = data.addrFlat ?? null;
    if (data.postCode !== undefined) patch.postCode = data.postCode ?? null;
    if (data.statusId !== undefined) patch.statusId = data.statusId ?? null;
    if (Object.keys(patch).length > 0) {
      patch.updatedAt = new Date();
      await this.driverRepo.update(driverId, patch);
    }

    // Transliteration & Categories: update last eCard within the same 48h window
    if (lastEcard) {
      let needsUpdate = false;

      // Transliteration: only within 48h window
      if (
        (data.surnameTranslit !== undefined ||
          data.firstNameTranslit !== undefined) &&
        lastEcard.createdAt != null &&
        Date.now() - new Date(lastEcard.createdAt).getTime() <
          NAME_EDIT_WINDOW_MS
      ) {
        if (data.surnameTranslit !== undefined)
          lastEcard.surnameTrans = data.surnameTranslit;
        if (data.firstNameTranslit !== undefined)
          lastEcard.firstNameTrans = data.firstNameTranslit;
        needsUpdate = true;
      } else if (
        (data.surnameTranslit !== undefined ||
          data.firstNameTranslit !== undefined) &&
        !(
          lastEcard.createdAt != null &&
          Date.now() - new Date(lastEcard.createdAt).getTime() <
            NAME_EDIT_WINDOW_MS
        )
      ) {
        throw new BadRequestException(
          'Transliteration can only be changed within 48 hours of the last card issuance',
        );
      }

      // Categories: can be updated anytime
      if (data.categoriesList !== undefined) {
        lastEcard.categoriesList = data.categoriesList ?? null;
        needsUpdate = true;
      }

      if (needsUpdate) {
        lastEcard.updatedAt = new Date();
        await this.cardRepo.save(lastEcard);
      }
    }

    const updated = await this.driverRepo.findOneOrFail({
      where: { id: driverId },
    });
    if (Object.keys(patch).length > 0) {
      await this.audit.log(
        AuditAction.DRIVER_UPDATE,
        'edriver',
        String(driverId),
        patch as Record<string, unknown>,
        { userId },
      );
    }
    const refreshedEcard = await this.cardRepo.findOne({
      where: { driverId },
      order: { createdAt: 'DESC' },
    });
    return {
      ...this.mapDriverEntity(updated),
      lastEcardCreatedAt: refreshedEcard?.createdAt
        ? refreshedEcard.createdAt.toISOString()
        : null,
      surnameTranslit: refreshedEcard?.surnameTrans ?? null,
      firstNameTranslit: refreshedEcard?.firstNameTrans ?? null,
      categoriesList: refreshedEcard?.categoriesList ?? null,
    };
  }

  /**
   * Updates the driver-license fields used by the eligibility validator.
   * Stamps {@link EDriver.driverLicenseUpdatedAt} so callers can detect a recent
   * change before allowing follow-on actions (e.g. re-running eligibility checks).
   */
  async updateDriverLicense(
    userId: string,
    driverId: number,
    data: UpdateDriverLicenseDto,
  ): Promise<CabinetDriver> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const driver = await this.driverRepo.findOne({
      where: { id: driverId, tcId: tcOldId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const patch: Partial<EDriver> = {};
    if (data.driverLicenseNo !== undefined) {
      patch.driverLicenseNo = data.driverLicenseNo ?? null;
    }
    if (data.driverLicenseCategories !== undefined) {
      patch.driverLicenseCategories = data.driverLicenseCategories.length
        ? data.driverLicenseCategories.join(',')
        : null;
    }
    if (data.driverLicenseIssueDate !== undefined) {
      patch.driverLicenseIssueDate = data.driverLicenseIssueDate ?? null;
    }
    if (data.driverLicenseExpiryDate !== undefined) {
      patch.driverLicenseExpiryDate = data.driverLicenseExpiryDate ?? null;
    }
    if (data.cCategoryIssueDate !== undefined) {
      patch.cCategoryIssueDate = data.cCategoryIssueDate ?? null;
    }
    if (data.dCategoryIssueDate !== undefined) {
      patch.dCategoryIssueDate = data.dCategoryIssueDate ?? null;
    }
    if (data.intendsUrbanSuburbanRoute !== undefined) {
      patch.intendsUrbanSuburbanRoute = data.intendsUrbanSuburbanRoute;
    }

    if (Object.keys(patch).length === 0) {
      return this.mapDriverEntity(driver);
    }

    const now = new Date();
    patch.driverLicenseUpdatedAt = now;
    patch.updatedAt = now;
    await this.driverRepo.update(driverId, patch);

    await this.audit.log(
      AuditAction.DRIVER_UPDATE,
      'edriver',
      String(driverId),
      patch as Record<string, unknown>,
      { userId },
    );

    const updated = await this.driverRepo.findOneOrFail({
      where: { id: driverId },
    });
    return this.mapDriverEntity(updated);
  }

  async getGraduates(
    userId: string,
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<CabinetGraduate>> {
    const tcId = await this.getTcId(userId);
    if (!tcId) return buildResult([], 0, page, pageSize);

    const qb = this.driverRepo
      .createQueryBuilder('d')
      .distinctOn(['d.id'])
      .innerJoin(StudyGroupStudent, 'tss', 'tss.edriverId = d.id')
      .innerJoin(StudyGroup, 'sg', 'sg.id = tss.studygroupId')
      .addSelect('sg.id', 'groupId')
      .addSelect('sg.name', 'groupName')
      .addSelect('sg.dateFinish', 'groupDateFinish')
      .where('sg.trainingCenterId = :tcId', { tcId })
      .andWhere('sg.status = :status', { status: 4 });

    if (search) {
      qb.andWhere(
        '(CAST(d.surname AS TEXT) ILIKE :search OR CAST(d.firstName AS TEXT) ILIKE :search OR CAST(d.taxNumber AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // DISTINCT ON requires d.id to be the first ORDER BY expression
    if (sort) {
      const sortCol = CabinetService.GRADUATES_ALLOWED.includes(sort.column)
        ? `d.${sort.column}`
        : 'd.surname';
      qb.orderBy('d.id', 'ASC').addOrderBy(sortCol, sort.order);
    } else {
      qb.orderBy('d.id', 'ASC')
        .addOrderBy('d.surname', 'ASC')
        .addOrderBy('d.firstName', 'ASC');
    }

    const countQb = this.driverRepo
      .createQueryBuilder('d')
      .select('COUNT(DISTINCT d.id)', 'cnt')
      .innerJoin(StudyGroupStudent, 'tss', 'tss.edriverId = d.id')
      .innerJoin(StudyGroup, 'sg', 'sg.id = tss.studygroupId')
      .where('sg.trainingCenterId = :tcId', { tcId })
      .andWhere('sg.status = :status', { status: 4 });

    if (search) {
      countQb.andWhere(
        '(CAST(d.surname AS TEXT) ILIKE :search OR CAST(d.firstName AS TEXT) ILIKE :search OR CAST(d.taxNumber AS TEXT) ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const countResult = await countQb.getRawOne<{ cnt: string }>();
    const count = parseInt(countResult?.cnt ?? '0', 10);

    const offset = (page - 1) * pageSize;
    const rawRows = await qb.offset(offset).limit(pageSize).getRawAndEntities();

    const results: CabinetGraduate[] = rawRows.entities.map((d, idx) => ({
      ...this.mapDriverEntity(d),
      groupId: (rawRows.raw[idx]?.groupId ??
        rawRows.raw[idx]?.sg_id ??
        null) as string | null,
      groupName: (rawRows.raw[idx]?.groupName ??
        rawRows.raw[idx]?.sg_name ??
        '') as string,
      groupDateFinish: (rawRows.raw[idx]?.groupDateFinish ??
        rawRows.raw[idx]?.sg_date_finish ??
        null) as string | null,
    }));

    return buildResult(results, count, page, pageSize);
  }

  async getStudyGroups(
    userId: string,
    page: number,
    pageSize: number,
    sort: SortParam | null = null,
    search = '',
  ): Promise<PaginatedResult<CabinetStudyGroup>> {
    const tcId = await this.getTcId(userId);
    if (!tcId) return buildResult([], 0, page, pageSize);

    const result = await paginateWithSearch(
      this.sgRepo,
      { where: { trainingCenterId: tcId }, order: { id: 'DESC' } },
      page,
      pageSize,
      sort,
      search,
      CabinetService.GROUPS_ALLOWED,
    );

    return {
      ...result,
      results: result.results.map((g) => this.mapGroupEntity(g)),
    };
  }

  async getStudyGroup(
    userId: string,
    groupId: string,
  ): Promise<CabinetStudyGroupDetail> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const row = await this.sgRepo
      .createQueryBuilder('sg')
      .leftJoin(TrainingCenter, 'tc', 'tc.id = sg.trainingCenterId')
      .leftJoin(ECarryType, 'ct', 'ct.id = sg.carryTypeId')
      .leftJoin(StudyGroupType, 'gt', 'gt.id = sg.groupTypeId')
      .addSelect('tc.name', 'tcName')
      .addSelect('tc.certNo', 'tcCertNo')
      .addSelect('tc.chiefPip', 'tcChiefPip')
      .addSelect('ct.name', 'carryTypeName')
      .addSelect('gt.name', 'groupTypeName')
      .where('sg.id = :groupId', { groupId })
      .andWhere('sg.trainingCenterId = :tcId', { tcId })
      .getRawAndEntities();

    if (!row.entities.length) throw new NotFoundException();
    const sg = row.entities[0];
    const raw = row.raw[0];

    const studentRows = await this.driverRepo
      .createQueryBuilder('d')
      .innerJoin(StudyGroupStudent, 'tss', 'tss.edriverId = d.id')
      .where('tss.studygroupId = :groupId', { groupId })
      .orderBy('d.surname', 'ASC')
      .addOrderBy('d.firstName', 'ASC')
      .getMany();

    return {
      ...this.mapGroupEntity(sg),
      tcName: (raw.tcName ?? raw.tc_name ?? '') as string,
      tcCertNo: (raw.tcCertNo ?? raw.tc_cert_no ?? '') as string,
      tcChiefPip: (raw.tcChiefPip ?? raw.tc_chief_pip ?? '') as string,
      carryTypeName: (raw.carryTypeName ??
        raw.carry_type_name ??
        raw.ct_name ??
        null) as string | null,
      groupTypeName: (raw.groupTypeName ??
        raw.group_type_name ??
        raw.gt_name ??
        null) as string | null,
      students: studentRows.map((s) => ({
        id: s.id,
        surname: s.surname,
        firstName: s.firstName,
        middleName: s.middleName,
        taxNumber: s.taxNumber,
        dateOfBirth: this.mapDate(s.dateOfBirth),
        phone: s.phone,
        email: s.email,
        idEspk: s.idEspk,
        idCard: s.idCard,
      })),
    };
  }

  async createStudyGroup(
    userId: string,
    data: {
      name: string;
      carryTypeId?: number | null;
      groupTypeId?: string | null;
      dateStart?: string | null;
      dateFinish?: string | null;
      courseType?: CourseType | null;
    },
  ): Promise<CabinetStudyGroup> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const entity = this.sgRepo.create({
      name: data.name,
      trainingCenterId: tcId,
      carryTypeId: data.carryTypeId ?? null,
      groupTypeId: data.groupTypeId ?? null,
      dateStart: data.dateStart ?? null,
      dateFinish: data.dateFinish ?? null,
      courseType: data.courseType ?? null,
      status: 1,
    });
    const saved = await this.sgRepo.save(entity);
    await this.audit.log(
      AuditAction.GROUP_CREATE,
      'study_group',
      saved.id,
      { name: saved.name, courseType: saved.courseType },
      { userId },
    );
    return this.mapGroupEntity(saved);
  }

  async updateStudyGroup(
    userId: string,
    groupId: string,
    data: {
      name?: string;
      carryTypeId?: number | null;
      groupTypeId?: string | null;
      dateStart?: string | null;
      dateFinish?: string | null;
      courseType?: CourseType | null;
    },
  ): Promise<CabinetStudyGroup> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const existing = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!existing) throw new NotFoundException();

    const patch: Partial<StudyGroup> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.carryTypeId !== undefined) patch.carryTypeId = data.carryTypeId;
    if (data.groupTypeId !== undefined) patch.groupTypeId = data.groupTypeId;
    if (data.dateStart !== undefined) patch.dateStart = data.dateStart;
    if (data.dateFinish !== undefined) patch.dateFinish = data.dateFinish;
    if (
      data.courseType !== undefined &&
      data.courseType !== existing.courseType
    ) {
      throw new BadRequestException(
        'Тип курсу неможливо змінити після створення групи',
      );
    }

    if (Object.keys(patch).length > 0) {
      await this.sgRepo.update(groupId, patch);
    }

    const updated = await this.sgRepo.findOneOrFail({ where: { id: groupId } });
    return this.mapGroupEntity(updated);
  }

  async deleteStudyGroup(userId: string, groupId: string): Promise<void> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const existing = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!existing) throw new NotFoundException();

    await this.sgsRepo.delete({ studygroupId: groupId });
    await this.sgRepo.delete(groupId);
  }

  async changeStudyGroupStatus(
    userId: string,
    groupId: string,
    status: number,
  ): Promise<CabinetStudyGroup> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const existing = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!existing) throw new NotFoundException();

    if (!ALLOWED_STATUS_TRANSITIONS[existing.status]?.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${existing.status} → ${status}`,
      );
    }

    // When transitioning to IN_PROCESS, validate eligibility for the assigned course type.
    if (status === 3 && existing.courseType != null) {
      const eligibility = await this.validateCourseEligibility(userId, groupId);
      if (!eligibility.allEligible) {
        throw new BadRequestException({
          message: 'Some drivers are not eligible for the selected course type',
          blockedDriverIds: eligibility.blockedDriverIds,
          blockedDriverNames: eligibility.blockedDriverNames,
          issues: eligibility.issues,
        });
      }
    }

    await this.sgRepo.update(groupId, { status });
    await this.audit.log(
      AuditAction.GROUP_STATUS_CHANGE,
      'study_group',
      groupId,
      { from: existing.status, to: status },
      { userId },
    );
    const updated = await this.sgRepo.findOneOrFail({ where: { id: groupId } });
    return this.mapGroupEntity(updated);
  }

  /**
   * Validates every student of a group against the group's course type using
   * the rules of Наказ 789, Розділ II, п.11.
   *
   * Returns a list of blocked drivers with reasons. The caller decides whether
   * to throw — see {@link changeStudyGroupStatus}.
   */
  async validateCourseEligibility(
    userId: string,
    groupId: string,
  ): Promise<CourseEligibilityResult> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    const courseType = group.courseType;
    if (courseType === null) {
      return {
        blockedDriverIds: [],
        blockedDriverNames: [],
        issues: [],
        allEligible: true,
      };
    }

    const studentRows = await this.sgsRepo.find({
      where: { studygroupId: groupId },
    });

    const blockedDriverIds: number[] = [];
    const blockedDriverNames: string[] = [];
    const issues: DriverEligibilityIssue[] = [];
    const today = new Date();

    for (const { edriverId: driverId } of studentRows) {
      const driver = await this.driverRepo.findOne({ where: { id: driverId } });
      if (!driver) continue;

      const hasPriorSpk = await this.driverHasValidPriorSpk(driverId);
      const snapshot: DriverLicenseSnapshot = {
        driverLicenseCategories: driver.driverLicenseCategories,
        driverLicenseIssueDate: driver.driverLicenseIssueDate,
        driverLicenseExpiryDate: driver.driverLicenseExpiryDate,
        cCategoryIssueDate: driver.cCategoryIssueDate ?? null,
        dCategoryIssueDate: driver.dCategoryIssueDate ?? null,
        intendsUrbanSuburbanRoute: driver.intendsUrbanSuburbanRoute ?? false,
        hasPriorSpk,
      };

      const result = validateDriverEligibility(snapshot, courseType, today);
      if (!result.ok) {
        const driverName =
          `${driver.surname} ${driver.firstName} ${driver.middleName}`.trim();
        blockedDriverIds.push(driverId);
        blockedDriverNames.push(driverName);
        issues.push({
          driverId,
          driverName,
          reason: result.reason ?? EligibilityFailReason.PROGRAM_MISMATCH,
          detail: result.detail,
        });
      }
    }

    return {
      blockedDriverIds,
      blockedDriverNames,
      issues,
      allEligible: blockedDriverIds.length === 0,
    };
  }

  /**
   * @deprecated Kept as a thin alias for transitional clients/tests.
   * Use {@link validateCourseEligibility}.
   */
  validateShortCourseEligibility(
    userId: string,
    groupId: string,
  ): Promise<CourseEligibilityResult> {
    return this.validateCourseEligibility(userId, groupId);
  }

  /**
   * Returns true if the driver holds at least one valid (not expired) SPK
   * regardless of carry type. Used by both eligibility validation (PERIODIC
   * course) and reduced-program detection (Порядок (проєкт), п.16).
   */
  private async driverHasValidPriorSpk(driverId: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const spk = await this.spkRepo
      .createQueryBuilder('spk')
      .where('spk.driver_id = :driverId', { driverId })
      .andWhere('spk.date_of_expiry >= :today', { today })
      .getOne();
    return spk !== null;
  }

  /**
   * Returns true if the driver has a valid SPK on a carry type *different*
   * from the one supplied — qualifies them for the reduced-program variant
   * of the initial / initial_shortened course.
   */
  private async driverHasValidPriorSpkOnOtherCarryType(
    driverId: number,
    carryTypeId: number | null,
  ): Promise<boolean> {
    if (carryTypeId === null) return false;
    const today = new Date().toISOString().split('T')[0];
    const spk = await this.spkRepo
      .createQueryBuilder('spk')
      .where('spk.driver_id = :driverId', { driverId })
      .andWhere('spk.carry_type_id != :carryTypeId', { carryTypeId })
      .andWhere('spk.date_of_expiry >= :today', { today })
      .getOne();
    return spk !== null;
  }

  /**
   * Splits a study group: removes the blocked drivers from the original group
   * and moves them to a freshly-created INITIAL group (the safe default for
   * any drivers who failed eligibility for the original program).
   */
  async setCourseType(
    userId: string,
    groupId: string,
    courseType: CourseType,
  ): Promise<CabinetStudyGroup> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    if (group.courseType != null && group.courseType !== courseType) {
      throw new BadRequestException(
        'Тип курсу неможливо змінити після створення групи',
      );
    }

    group.courseType = courseType;
    const saved = await this.sgRepo.save(group);

    await this.audit.log(
      AuditAction.GROUP_UPDATE,
      'study_group',
      groupId,
      { courseType },
      { userId },
    );

    return {
      id: saved.id,
      name: saved.name,
      dateStart: this.mapDate(saved.dateStart),
      dateFinish: this.mapDate(saved.dateFinish),
      status: saved.status,
      carryTypeId: saved.carryTypeId,
      groupTypeId: saved.groupTypeId,
      courseType: saved.courseType,
      isReducedProgram: saved.isReducedProgram,
    };
  }

  async splitGroup(
    userId: string,
    groupId: string,
    blockedDriverIds: number[],
  ): Promise<SplitGroupResult> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    // Remove blocked drivers from the original (primary) group.
    for (const driverId of blockedDriverIds) {
      await this.sgsRepo.delete({ studygroupId: groupId, edriverId: driverId });
    }

    // Create a fallback INITIAL group for the blocked drivers.
    const secondaryGroup = this.sgRepo.create({
      name: `${group.name} (початковий курс)`,
      trainingCenterId: tcId,
      carryTypeId: group.carryTypeId,
      groupTypeId: group.groupTypeId,
      dateStart: group.dateStart,
      dateFinish: group.dateFinish,
      courseType: CourseType.INITIAL,
      isReducedProgram: false,
      status: group.status,
    });
    const savedSecondaryGroup = await this.sgRepo.save(secondaryGroup);

    for (const driverId of blockedDriverIds) {
      await this.sgsRepo
        .createQueryBuilder()
        .insert()
        .into(StudyGroupStudent)
        .values({ studygroupId: savedSecondaryGroup.id, edriverId: driverId })
        .orIgnore()
        .execute();
    }

    await this.audit.log(
      AuditAction.GROUP_SPLIT,
      'study_group',
      groupId,
      {
        primaryGroupId: groupId,
        secondaryGroupId: savedSecondaryGroup.id,
        blockedDriverIds,
      },
      { userId },
    );

    return {
      primaryGroupId: groupId,
      secondaryGroupId: savedSecondaryGroup.id,
    };
  }

  async addStudent(
    userId: string,
    groupId: string,
    driverId: number,
  ): Promise<void> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');
    this.enforceEnrollmentOpen(group);

    const driver = await this.driverRepo.findOne({
      where: { id: driverId, tcId: tcOldId ?? -1 },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    await this.enforceMaxGroupSize(groupId, driverId);
    await this.enforceCourseEligibility(group, driver);
    await this.enforceProgramHomogeneity(group, driver);

    await this.sgsRepo
      .createQueryBuilder()
      .insert()
      .into(StudyGroupStudent)
      .values({ studygroupId: groupId, edriverId: driverId })
      .orIgnore()
      .execute();

    await this.audit.log(
      AuditAction.STUDENT_ADD,
      'study_group_student',
      groupId,
      { driverId },
      { userId },
    );
  }

  /**
   * Enforces that all members of a group share the same program variant
   * (Порядок (проєкт), п.16): if the group is empty, the new student decides
   * whether the group runs the reduced program; otherwise the candidate must
   * match the program already in effect.
   *
   * Only applies to INITIAL and INITIAL_SHORTENED groups — periodic courses
   * have no reduced variant.
   */
  private async enforceProgramHomogeneity(
    group: StudyGroup,
    driver: EDriver,
  ): Promise<void> {
    if (
      group.courseType !== CourseType.INITIAL &&
      group.courseType !== CourseType.INITIAL_SHORTENED
    ) {
      return;
    }

    const driverQualifies = await this.driverHasValidPriorSpkOnOtherCarryType(
      driver.id,
      group.carryTypeId,
    );

    const isFirstStudent =
      (await this.sgsRepo.count({ where: { studygroupId: group.id } })) === 0;

    if (isFirstStudent) {
      const desiredReduced = qualifiesForReducedProgram(
        driverQualifies,
        group.courseType,
      );
      if (group.isReducedProgram !== desiredReduced) {
        await this.sgRepo.update(group.id, {
          isReducedProgram: desiredReduced,
        });
        group.isReducedProgram = desiredReduced;
      }
      return;
    }

    if (group.isReducedProgram && !driverQualifies) {
      throw new BadRequestException(
        'Group is configured for the reduced program; the candidate driver lacks a valid prior SPK on another carry type and cannot join.',
      );
    }

    if (!group.isReducedProgram && driverQualifies) {
      throw new BadRequestException(
        'Group runs the full program; the candidate driver qualifies for the reduced program and must be enrolled in a separate group.',
      );
    }
  }

  /**
   * Enforces the maximum group size of 25 students.
   * Наказ 789, Розділ II, п.5: «Кількість суб'єктів звернення у групі не повинна перевищувати 25 осіб.»
   *
   * Counts before insert; idempotent in the orIgnore path because the candidate
   * driver is excluded from the count when already present.
   */
  /**
   * Students can join or leave a group only while enrollment is open
   * (ТЗ: lifecycle — add/remove allowed in ENROLLMENT_START only).
   */
  private enforceEnrollmentOpen(group: StudyGroup): void {
    if (group.status !== StudyGroupStatus.ENROLLMENT_START) {
      throw new BadRequestException(
        'Students can only be added or removed while enrollment is open',
      );
    }
  }

  private async enforceMaxGroupSize(
    groupId: string,
    candidateDriverId: number,
  ): Promise<void> {
    const alreadyMember = await this.sgsRepo.findOne({
      where: { studygroupId: groupId, edriverId: candidateDriverId },
    });
    if (alreadyMember) return;

    const count = await this.sgsRepo.count({
      where: { studygroupId: groupId },
    });
    if (count >= MAX_GROUP_SIZE) {
      throw new BadRequestException(
        `Group already has the maximum of ${MAX_GROUP_SIZE} students`,
      );
    }
  }

  async removeStudent(
    userId: string,
    groupId: string,
    driverId: number,
  ): Promise<void> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');
    this.enforceEnrollmentOpen(group);

    await this.sgsRepo.delete({ studygroupId: groupId, edriverId: driverId });

    await this.audit.log(
      AuditAction.STUDENT_REMOVE,
      'study_group_student',
      groupId,
      { driverId },
      { userId },
    );
  }

  async searchAvailableDrivers(
    userId: string,
    groupId: string,
    q: string,
  ): Promise<AvailableDriver[]> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    const pattern = `%${q.toLowerCase()}%`;

    const rows = await this.driverRepo
      .createQueryBuilder('d')
      .where('d.tcId = :tcOldId', { tcOldId })
      .andWhere(
        `d.id NOT IN (
          SELECT sgs.edriver_id FROM study_group_students sgs WHERE sgs.studygroup_id = :groupId
        )`,
        { groupId },
      )
      .andWhere(
        '(LOWER(d.surname) LIKE :pattern OR LOWER(d.firstName) LIKE :pattern OR d.taxNumber LIKE :pattern)',
        { pattern },
      )
      .orderBy('d.surname', 'ASC')
      .addOrderBy('d.firstName', 'ASC')
      .take(DRIVER_SEARCH_LIMIT)
      .getMany();

    const eligible = group.courseType
      ? await this.filterDriversByCourseEligibility(rows, group.courseType)
      : rows;

    return eligible.map((r) => ({
      id: r.id,
      surname: r.surname,
      firstName: r.firstName,
      middleName: r.middleName,
      taxNumber: r.taxNumber,
      dateOfBirth: this.mapDate(r.dateOfBirth),
    }));
  }

  private async filterDriversByCourseEligibility(
    drivers: EDriver[],
    courseType: CourseType,
  ): Promise<EDriver[]> {
    const today = new Date();
    const out: EDriver[] = [];
    for (const d of drivers) {
      const hasPriorSpk = await this.driverHasValidPriorSpk(d.id);
      const snapshot: DriverLicenseSnapshot = {
        driverLicenseCategories: d.driverLicenseCategories,
        driverLicenseIssueDate: d.driverLicenseIssueDate,
        driverLicenseExpiryDate: d.driverLicenseExpiryDate,
        cCategoryIssueDate: d.cCategoryIssueDate ?? null,
        dCategoryIssueDate: d.dCategoryIssueDate ?? null,
        intendsUrbanSuburbanRoute: d.intendsUrbanSuburbanRoute ?? false,
        hasPriorSpk,
      };
      const result = validateDriverEligibility(snapshot, courseType, today);
      if (result.ok) out.push(d);
    }
    return out;
  }

  private async enforceCourseEligibility(
    group: StudyGroup,
    driver: EDriver,
  ): Promise<void> {
    if (!group.courseType) return;
    const hasPriorSpk = await this.driverHasValidPriorSpk(driver.id);
    const snapshot: DriverLicenseSnapshot = {
      driverLicenseCategories: driver.driverLicenseCategories,
      driverLicenseIssueDate: driver.driverLicenseIssueDate,
      driverLicenseExpiryDate: driver.driverLicenseExpiryDate,
      cCategoryIssueDate: driver.cCategoryIssueDate ?? null,
      dCategoryIssueDate: driver.dCategoryIssueDate ?? null,
      intendsUrbanSuburbanRoute: driver.intendsUrbanSuburbanRoute ?? false,
      hasPriorSpk,
    };
    const result = validateDriverEligibility(snapshot, group.courseType);
    if (!result.ok) {
      throw new BadRequestException(
        result.detail ??
          'Driver does not meet preconditions for this course type',
      );
    }
  }

  async createAndAddDriver(
    userId: string,
    groupId: string,
    data: CreateDriverDto,
  ): Promise<CabinetDriver> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');
    this.enforceEnrollmentOpen(group);

    let countryOfBirthId = data.countryOfBirthId ?? null;
    if (data.countryOfBirthName && data.countryOfBirthName.trim()) {
      const trimmed = data.countryOfBirthName.trim();
      const existing = await this.countryRepo
        .createQueryBuilder('c')
        .where('LOWER(c.nameUkr) = LOWER(:n)', { n: trimmed })
        .getOne();
      if (existing) {
        countryOfBirthId = existing.id;
      } else {
        const created = await this.countryRepo.save(
          this.countryRepo.create({
            nameUkr: trimmed,
            nameEng: trimmed,
          }),
        );
        countryOfBirthId = created.id;
      }
    }

    // Upsert driver: insert or update on taxNumber conflict
    const now = new Date();
    const hasLicenseData =
      (data.driverLicenseNo != null && data.driverLicenseNo !== '') ||
      (data.driverLicenseCategories &&
        data.driverLicenseCategories.length > 0) ||
      data.driverLicenseIssueDate != null ||
      data.driverLicenseExpiryDate != null;
    const surnameTrans =
      data.surnameTranslit && data.surnameTranslit.trim()
        ? data.surnameTranslit.trim()
        : transliterate(data.surname);
    const firstNameTrans =
      data.firstNameTranslit && data.firstNameTranslit.trim()
        ? data.firstNameTranslit.trim()
        : transliterate(data.firstName);

    const driverEntity = this.driverRepo.create({
      surname: data.surname,
      firstName: data.firstName,
      middleName: data.middleName ?? '',
      surnameTrans,
      firstNameTrans,
      taxNumber: data.taxNumber,
      dateOfBirth: data.dateOfBirth ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      addrTown: data.addrTown ?? null,
      addrStreet: data.addrStreet ?? null,
      addrHouse: data.addrHouse ?? null,
      addrFlat: data.addrFlat ?? null,
      postCode: data.postCode ?? null,
      countryOfBirthId: countryOfBirthId ?? 1,
      statusId: data.statusId ?? 1,
      tcId: tcOldId ?? 0,
      lastUser: null,
      createdAt: now,
      updatedAt: now,
      categoriesList: data.categoriesList?.length
        ? data.categoriesList.join(',')
        : null,
      driverLicenseNo: data.driverLicenseNo ?? null,
      driverLicenseCategories: data.driverLicenseCategories?.length
        ? data.driverLicenseCategories.join(',')
        : null,
      driverLicenseIssueDate: data.driverLicenseIssueDate ?? null,
      driverLicenseExpiryDate: data.driverLicenseExpiryDate ?? null,
      driverLicenseUpdatedAt: hasLicenseData ? now : null,
      cCategoryIssueDate: data.cCategoryIssueDate ?? null,
      dCategoryIssueDate: data.dCategoryIssueDate ?? null,
      intendsUrbanSuburbanRoute: data.intendsUrbanSuburbanRoute ?? false,
    });

    await this.driverRepo.upsert(driverEntity, {
      conflictPaths: ['taxNumber'],
      skipUpdateIfNoValuesChanged: true,
    });

    // Re-fetch the driver after upsert
    const newDriver = await this.driverRepo.findOneOrFail({
      where: { taxNumber: data.taxNumber },
    });

    await this.enforceMaxGroupSize(groupId, newDriver.id);
    await this.enforceCourseEligibility(group, newDriver);
    await this.enforceProgramHomogeneity(group, newDriver);

    // Add to study group (ignore if already present)
    await this.sgsRepo
      .createQueryBuilder()
      .insert()
      .into(StudyGroupStudent)
      .values({ studygroupId: groupId, edriverId: newDriver.id })
      .orIgnore()
      .execute();

    return this.mapDriverEntity(newDriver);
  }

  async getCarryTypes(): Promise<CarryTypeItem[]> {
    const rows = await this.carryTypeRepo.find({ order: { id: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      nameSpk: r.nameSpk,
    }));
  }

  async getGroupTypes(): Promise<GroupTypeItem[]> {
    const rows = await this.sgtRepo.find({ order: { id: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
    }));
  }

  async getCountries(): Promise<ECountry[]> {
    return this.countryRepo.find({ order: { nameUkr: 'ASC' } });
  }

  async getConstants(): Promise<MinistryConstants | null> {
    const row = await this.constantRepo.findOne({ where: {} });
    if (!row) return null;

    return {
      dateOfMiniinfra: this.mapDate(row.dateOfMiniinfra),
      miniinfraNo: row.miniinfraNo,
      dateOfMinjust: this.mapDate(row.dateOfMinjust),
      minjustNo: row.minjustNo,
    };
  }

  async createSpkBulk(
    userId: string,
    groupId: string,
    driverIds: number[],
    data: CreateSpkBulkPayload,
  ): Promise<SpkBulkResult[]> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    const resolvedCarryTypeId = data.carryTypeId ?? group.carryTypeId;

    const tc = await this.tcRepo.findOne({ where: { id: tcId } });
    if (!tc) throw new NotFoundException('Training center not found');

    // Ministry order/registration fields are mandatory on every СППК — refuse
    // to mint certificates with blank ministry data instead of saving NULLs.
    const constants = await this.getConstants();
    if (!constants) {
      throw new BadRequestException(
        'Ministry constants are not configured; SPK cannot be issued',
      );
    }

    let carryTypeTxt: string | null = null;
    if (resolvedCarryTypeId !== null) {
      const ct = await this.carryTypeRepo.findOne({
        where: { id: resolvedCarryTypeId },
      });
      if (ct) {
        carryTypeTxt = ct.nameSpk;
      }
    }

    const results: SpkBulkResult[] = [];

    for (const driverId of driverIds) {
      const driver = await this.driverRepo.findOne({
        where: { id: driverId, tcId: tc.oldId ?? -1 },
      });

      if (!driver) {
        results.push({
          driverId,
          driverPip: '',
          spkId: 0,
          spkNo: '',
          error: 'Driver not found',
        });
        continue;
      }

      // The СППК itself carries the full legal name (Django parity:
      // driver_pip_full); the abbreviated form is used only in the public
      // registry.
      const driverPip = [driver.surname, driver.firstName, driver.middleName]
        .filter(Boolean)
        .join(' ');

      if (resolvedCarryTypeId !== null) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const existingSpk = await this.spkRepo.findOne({
          where: {
            driverId,
            carryTypeId: resolvedCarryTypeId,
            createdAt: MoreThanOrEqual(ninetyDaysAgo),
          },
        });

        if (existingSpk) {
          results.push({
            driverId,
            driverPip,
            spkId: 0,
            spkNo: '',
            error:
              'Driver already has SPK with same carry type created within 90 days',
          });
          continue;
        }
      }

      // Resolve driver's actual country of birth (Django parity: SPK 1.7).
      let countryOfBirth: string | null = null;
      if (driver.countryOfBirthId) {
        const country = await this.countryRepo.findOne({
          where: { id: driver.countryOfBirthId },
        });
        countryOfBirth = country?.nameUkr ?? null;
      }

      // All writes for one driver are atomic; the TC row is locked so that
      // concurrent bulk requests cannot mint the same SPK number.
      const savedSpk = await this.dataSource.transaction(async (em) => {
        await em.findOne(TrainingCenter, {
          where: { id: tcId },
          lock: { mode: 'pessimistic_write' },
        });

        const existingSpkCount = await em.count(ESPK, {
          where: { tcId: tc.oldId ?? -1 },
        });
        const currentCounter = existingSpkCount + 1;
        const spkNo = `${tc.certNo}-${String(currentCounter).padStart(6, '0')}`;

        const spkEntity = em.create(ESPK, {
          tcId: tc.oldId ?? 0,
          tcName: tc.name,
          tcCertNo: tc.certNo,
          spkNo,
          driverId,
          driverPip,
          dateOfBirth: this.mapDate(driver.dateOfBirth),
          countryOfBirth,
          carryTypeId: resolvedCarryTypeId,
          carryTypeTxt,
          courseType: group.courseType ?? null,
          dateOfMiniinfra: constants?.dateOfMiniinfra ?? null,
          miniinfraNo: constants?.miniinfraNo ?? null,
          dateOfMinjust: constants?.dateOfMinjust ?? null,
          minjustNo: constants?.minjustNo ?? null,
          dateOfTest: data.dateOfTest,
          testProtocolNo: data.testProtocolNo,
          dateOfTestProtocol: data.dateOfTestProtocol,
          // Always derive expiry from the test date — Наказ 789, п.27 mandates a
          // fixed 5-year validity period; client-supplied values are ignored.
          dateOfExpiry: this.addYearsIso(data.dateOfTest, SPK_VALIDITY_YEARS),
          position: data.position ?? 'Директор',
          chiefPip: data.chiefPip ?? tc.chiefPip,
          lastUser: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const spk = await em.save(spkEntity);

        // A fresh СППК supersedes the previously issued card: clear the card
        // link and drop the public registry entry until a new card is created
        // (ТЗ, driver flow п.6 — автоматичні дії при створенні СППК).
        await em.update(EDriver, driverId, {
          idEspk: spk.id,
          idCard: null,
          statusId: 3,
        });
        await em.delete(EDriverRegistry, { driverId });

        return spk;
      });

      const spkNo = savedSpk.spkNo;

      await this.audit.log(
        AuditAction.SPK_CREATE,
        'espk',
        String(savedSpk.id),
        { driverId, spkNo, groupId },
        { userId },
      );

      results.push({
        driverId,
        driverPip,
        spkId: savedSpk.id,
        spkNo,
      });
    }

    return results;
  }

  async getDriverEcardPrefill(
    userId: string,
    driverId: number,
  ): Promise<DriverEcardPrefill> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    const row = await this.driverRepo
      .createQueryBuilder('d')
      .leftJoin(ESPK, 'e', 'e.id = d.idEspk')
      .leftJoin(TrainingCenter, 'tc', 'tc.id = :tcId', { tcId })
      .addSelect('e.spkNo', 'spkNo')
      .addSelect('e.dateOfExpiry', 'dateOfExpiry')
      .addSelect('e.dateOfTestProtocol', 'dateOfTestProtocol')
      .addSelect('e.carryTypeId', 'spkCarryTypeId')
      .addSelect('tc.nameShort', 'tcNameShort')
      .where('d.id = :driverId', { driverId })
      .andWhere('d.tcId = :tcOldId', { tcOldId })
      .getRawAndEntities();

    if (!row.entities.length) throw new NotFoundException('Driver not found');
    const d = row.entities[0];
    const raw = row.raw[0];

    const dateOfExpiry = this.mapDate(
      raw.dateOfExpiry ?? raw.e_date_of_expiry ?? null,
    );
    const expiryParts = dateOfExpiry ? dateOfExpiry.split('-') : [];
    const expiryFormatted =
      expiryParts.length === 3
        ? `${expiryParts[2]}.${expiryParts[1]}.${expiryParts[0]}`
        : dateOfExpiry;
    const unionCode95 = expiryFormatted ? `95.${expiryFormatted}` : null;

    return {
      driverId: d.id,
      surname: d.surname,
      firstName: d.firstName,
      dateOfBirth: this.mapDate(d.dateOfBirth),
      spkSerialNo: (raw.spkNo ?? raw.spk_no ?? null) as string | null,
      spkDateOfExpiry: dateOfExpiry,
      spkDateOfTestProtocol: this.mapDate(
        raw.dateOfTestProtocol ?? raw.e_date_of_test_protocol ?? null,
      ),
      spkCarryTypeId: (raw.spkCarryTypeId ?? raw.e_carry_type_id ?? null) as
        | number
        | null,
      unionCode95,
      issuedBy: (raw.tcNameShort ?? raw.tc_name_short ?? '') as string,
      driverLicenseNo: d.driverLicenseNo ?? null,
      driverLicenseCategories: d.driverLicenseCategories ?? null,
      photoImg: d.photoImg ?? null,
      signImg: d.signImg ?? null,
    };
  }

  async createECard(
    userId: string,
    driverId: number,
    data: CreateECardPayload,
  ): Promise<ECardResult> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    // Fetch driver with SPK
    const driverRow = await this.driverRepo
      .createQueryBuilder('d')
      .leftJoin(ESPK, 'e', 'e.id = d.idEspk')
      .addSelect('e.spkNo', 'spkNo')
      .addSelect('e.dateOfExpiry', 'eDateOfExpiry')
      .addSelect('e.carryTypeId', 'eCarryTypeId')
      .addSelect('e.carryTypeTxt', 'eCarryTypeTxt')
      .where('d.id = :driverId', { driverId })
      .andWhere('d.tcId = :tcOldId', { tcOldId })
      .getRawAndEntities();

    if (!driverRow.entities.length)
      throw new NotFoundException('Driver not found');

    const driver = driverRow.entities[0];
    const raw = driverRow.raw[0];
    const idEspk = driver.idEspk;
    if (!idEspk)
      throw new BadRequestException('Driver does not have an associated SPK');

    const tc = await this.tcRepo.findOne({
      where: { id: tcId },
      select: ['nameShort', 'atiCode'],
    });
    if (!tc) throw new NotFoundException('Training center not found');

    // Both images are mandatory on the driver card (ТЗ, картка водія п.7).
    if (!data.photoImg || !data.signImg) {
      throw new BadRequestException(
        'Photo and signature are required for the driver card',
      );
    }

    const tcNameShort = tc.nameShort;
    const spkNo = (raw.spkNo ?? raw.spk_no ?? '') as string;

    // Resolve driver's most-recent SPK to anchor the +5y rule (Наказ 789, п.27).
    const latestSpk = await this.spkRepo.findOne({
      where: { driverId },
      order: { createdAt: 'DESC' },
    });
    if (!latestSpk?.dateOfTest)
      throw new BadRequestException(
        'Driver SPK is missing dateOfTest; cannot derive ECard validity',
      );

    const expectedExpiry = this.addYearsIso(
      latestSpk.dateOfTest,
      SPK_VALIDITY_YEARS,
    );

    if (data.dateOfExpiry != null && data.dateOfExpiry !== expectedExpiry) {
      throw new BadRequestException(
        `ECard dateOfExpiry must equal SPK dateOfTest + ${SPK_VALIDITY_YEARS} years (${expectedExpiry})`,
      );
    }
    const dateOfExpiry = expectedExpiry;

    // Date of issue anchors on the SPK test-protocol date (ТЗ, картка водія:
    // date_of_issue = дата протоколу іспиту), falling back to the test date.
    const dateOfIssue =
      data.dateOfIssue ?? latestSpk.dateOfTestProtocol ?? latestSpk.dateOfTest;
    const issuedBy = data.issuedBy ?? tcNameShort;

    // Duplicate-by-serial guard (Django ECardCreate.form_valid).
    const dupSerial = await this.cardRepo.findOne({
      where: { serialNo: spkNo, licenceNo: data.licenceNo ?? null },
    });
    if (dupSerial) {
      throw new ConflictException(
        'ECard with this serial+licence already exists',
      );
    }

    const expiryParts = dateOfExpiry ? dateOfExpiry.split('-') : [];
    const expiryFormatted =
      expiryParts.length === 3
        ? `${expiryParts[2]}.${expiryParts[1]}.${expiryParts[0]}`
        : dateOfExpiry;
    const unionCode95 = data.unionCode95 ?? `95.${expiryFormatted}`;

    // Resolve SPK UUID for stable QR registry URL (mirrors Naказ 789 + Django QR).
    const spkUuid = latestSpk.uuid ?? null;
    const siteUrl =
      process.env['SITE_URL'] ??
      process.env['FRONTEND_URL'] ??
      'http://localhost';
    const registryUrl = spkUuid
      ? `${siteUrl}/registry/${spkUuid}`
      : `${siteUrl}/registry/${driverId}`;
    const qrImg = await QRCode.toDataURL(registryUrl);

    const categoriesListPersist = data.categoriesList ?? null;

    const now = new Date();
    const cardEntity = this.cardRepo.create({
      driverId,
      surname: driver.surname,
      firstName: driver.firstName,
      surnameTrans: data.surnameTranslit,
      firstNameTrans: data.firstNameTranslit,
      dateOfBirth: this.mapDate(driver.dateOfBirth),
      dateOfIssue: dateOfIssue,
      dateOfExpiry: dateOfExpiry,
      issuedBy,
      registrationNumber: data.registrationNumber ?? null,
      licenceNo: data.licenceNo ?? null,
      serialNo: spkNo,
      categoriesList: categoriesListPersist,
      unionCode95,
      photoImg: data.photoImg ?? null,
      signImg: data.signImg ?? null,
      qrImg,
      createdAt: now,
      updatedAt: now,
      lastUser: null,
    });

    const driverPip = this.buildDriverPip(
      driver.surname,
      driver.firstName,
      driver.middleName,
    );

    // Card insert, driver link and public-registry entry are atomic.
    const savedCard = await this.dataSource.transaction(async (em) => {
      const card = await em.save(cardEntity);

      // Update driver: link card and set status
      await em.update(EDriver, driverId, {
        idCard: card.id,
        statusId: 2,
      });

      const registryEntity = em.create(EDriverRegistry, {
        driverId,
        driverPip,
        dateOfExpiry,
        categoriesList: categoriesListPersist,
        carryType: (raw.eCarryTypeTxt ?? raw.e_carry_type_txt ?? null) as
          | string
          | null,
        atiCode: tc.atiCode ?? '',
        lastUser: null,
        createdAt: now,
        updatedAt: now,
      });

      await em.upsert(EDriverRegistry, registryEntity, {
        conflictPaths: ['driverId'],
      });

      return card;
    });

    await this.audit.log(
      AuditAction.ECARD_CREATE,
      'ecard',
      String(savedCard.id),
      { driverId, serialNo: savedCard.serialNo },
      { userId },
    );

    return {
      id: savedCard.id,
      serialNo: savedCard.serialNo ?? '',
      dateOfIssue: this.mapDate(savedCard.dateOfIssue),
      dateOfExpiry: this.mapDate(savedCard.dateOfExpiry),
    };
  }

  async getStudyGroupSpkData(
    userId: string,
    groupId: string,
  ): Promise<SpkDataItem[]> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    const rows = await this.driverRepo
      .createQueryBuilder('d')
      .innerJoin(StudyGroupStudent, 'tss', 'tss.edriverId = d.id')
      .leftJoin(ESPK, 'e', 'e.driverId = d.id')
      .leftJoin(ECard, 'c', 'c.driverId = d.id')
      .addSelect('e.id', 'spkId')
      .addSelect('e.spkNo', 'spkNo')
      .addSelect('e.dateOfExpiry', 'spkExpiry')
      .addSelect('e.carryTypeTxt', 'carryTypeTxt')
      .addSelect('c.id', 'cardId')
      .where('tss.studygroupId = :groupId', { groupId })
      .orderBy('d.surname', 'ASC')
      .addOrderBy('d.firstName', 'ASC')
      .getRawAndEntities();

    return rows.entities.map((d, idx) => ({
      driverId: d.id,
      surname: d.surname,
      firstName: d.firstName,
      middleName: d.middleName,
      phone: d.phone,
      email: d.email,
      spkId: (rows.raw[idx]?.spkId ?? rows.raw[idx]?.e_id ?? null) as
        | number
        | null,
      spkNo: (rows.raw[idx]?.spkNo ?? rows.raw[idx]?.e_spk_no ?? null) as
        | string
        | null,
      spkExpiry: this.mapDate(
        rows.raw[idx]?.spkExpiry ?? rows.raw[idx]?.e_date_of_expiry ?? null,
      ),
      carryTypeTxt: (rows.raw[idx]?.carryTypeTxt ??
        rows.raw[idx]?.e_carry_type_txt ??
        null) as string | null,
      cardId: (rows.raw[idx]?.cardId ?? rows.raw[idx]?.c_id ?? null) as
        | number
        | null,
    }));
  }

  private mapDriverEntity(d: EDriver): CabinetDriver {
    return {
      id: d.id,
      surname: d.surname,
      firstName: d.firstName,
      middleName: d.middleName,
      taxNumber: d.taxNumber,
      dateOfBirth: d.dateOfBirth,
      phone: d.phone,
      email: d.email,
      status: d.statusId,
      idEspk: d.idEspk,
      idCard: d.idCard,
      photoImg: d.photoImg ?? null,
      signImg: d.signImg ?? null,
      categoriesList: d.categoriesList ?? null,
      countryOfBirthId: d.countryOfBirthId,
      surnameTranslit: d.surnameTrans ?? null,
      firstNameTranslit: d.firstNameTrans ?? null,
      driverLicenseNo: d.driverLicenseNo,
      driverLicenseCategories: d.driverLicenseCategories,
      driverLicenseIssueDate: d.driverLicenseIssueDate,
      driverLicenseExpiryDate: d.driverLicenseExpiryDate,
      driverLicenseUpdatedAt: d.driverLicenseUpdatedAt
        ? d.driverLicenseUpdatedAt.toISOString()
        : null,
      cCategoryIssueDate: d.cCategoryIssueDate ?? null,
      dCategoryIssueDate: d.dCategoryIssueDate ?? null,
      intendsUrbanSuburbanRoute: d.intendsUrbanSuburbanRoute ?? false,
      addrTown: d.addrTown ?? null,
      addrStreet: d.addrStreet ?? null,
      addrHouse: d.addrHouse ?? null,
      addrFlat: d.addrFlat ?? null,
      postCode: d.postCode ?? null,
      statusId: d.statusId ?? null,
      statusCode: DRIVER_STATUS_CODES.NOT_CERTIFIED,
    };
  }

  /** Derive the certification status from SPK validity + active enrolment. */
  private deriveDriverStatus(
    hasSpk: boolean,
    latestSpkExpiry: string | null,
    enrolledActive: boolean,
  ): DriverStatusCode {
    if (hasSpk) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (latestSpkExpiry && new Date(latestSpkExpiry) >= today) {
        return DRIVER_STATUS_CODES.CERTIFIED;
      }
      return DRIVER_STATUS_CODES.NEEDS_RECERT;
    }
    return enrolledActive
      ? DRIVER_STATUS_CODES.IN_TRAINING
      : DRIVER_STATUS_CODES.NOT_CERTIFIED;
  }

  /** Compute the derived status for a single driver. */
  private async computeStatusForDriver(
    driverId: number,
  ): Promise<DriverStatusCode> {
    const spkAgg = await this.spkRepo
      .createQueryBuilder('s')
      .select('COUNT(s.id)', 'cnt')
      .addSelect('MAX(s.dateOfExpiry)', 'maxExp')
      .where('s.driverId = :driverId', { driverId })
      .getRawOne<{ cnt: string; maxExp: string | null }>();
    const hasSpk = Number(spkAgg?.cnt ?? 0) > 0;

    const enrolledActive = await this.sgsRepo
      .createQueryBuilder('sgs')
      .innerJoin(StudyGroup, 'sg', 'sg.id = sgs.studygroupId')
      .where('sgs.edriverId = :driverId', { driverId })
      .andWhere('sg.status < 4')
      .getExists();

    return this.deriveDriverStatus(
      hasSpk,
      spkAgg?.maxExp ?? null,
      enrolledActive,
    );
  }

  /** Compute derived statuses for many drivers in two batched queries. */
  private async computeStatusForDrivers(
    ids: number[],
  ): Promise<Map<number, DriverStatusCode>> {
    const map = new Map<number, DriverStatusCode>();
    if (!ids.length) return map;

    const spkRows = await this.spkRepo
      .createQueryBuilder('s')
      .select('s.driverId', 'driverId')
      .addSelect('MAX(s.dateOfExpiry)', 'maxExp')
      .where('s.driverId IN (:...ids)', { ids })
      .groupBy('s.driverId')
      .getRawMany<{ driverId: number; maxExp: string | null }>();
    const spkMap = new Map(spkRows.map((r) => [Number(r.driverId), r.maxExp]));

    const enrRows = await this.sgsRepo
      .createQueryBuilder('sgs')
      .select('DISTINCT sgs.edriverId', 'edriverId')
      .innerJoin(StudyGroup, 'sg', 'sg.id = sgs.studygroupId')
      .where('sgs.edriverId IN (:...ids)', { ids })
      .andWhere('sg.status < 4')
      .getRawMany<{ edriverId: number }>();
    const enrolledSet = new Set(enrRows.map((r) => Number(r.edriverId)));

    for (const id of ids) {
      map.set(
        id,
        this.deriveDriverStatus(
          spkMap.has(id),
          spkMap.get(id) ?? null,
          enrolledSet.has(id),
        ),
      );
    }
    return map;
  }

  async getDriverHistory(
    userId: string,
    driverId: number,
  ): Promise<DriverHistoryResult> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const driver = await this.driverRepo.findOne({
      where: { id: driverId, tcId: tcOldId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const spkHistory = await this.spkRepo.find({
      where: { driverId },
      order: { createdAt: 'DESC' },
    });

    return {
      driverId,
      spkHistory: spkHistory.map((e) => ({
        id: e.id,
        spkNo: e.spkNo,
        tcName: e.tcName,
        tcCertNo: e.tcCertNo,
        carryTypeTxt: e.carryTypeTxt,
        courseType: e.courseType,
        dateOfTest: this.mapDate(e.dateOfTest),
        dateOfExpiry: this.mapDate(e.dateOfExpiry),
        createdAt: e.createdAt ? e.createdAt.toISOString() : null,
      })),
    };
  }

  private mapGroupEntity(g: StudyGroup): CabinetStudyGroup {
    return {
      id: g.id,
      name: g.name,
      dateStart: g.dateStart,
      dateFinish: g.dateFinish,
      status: g.status,
      carryTypeId: g.carryTypeId,
      groupTypeId: g.groupTypeId,
      courseType: g.courseType ?? null,
      isReducedProgram: g.isReducedProgram ?? false,
    };
  }

  async importDriversFromExcel(
    userId: string,
    groupId: string,
    buffer: Buffer,
  ): Promise<ExcelImportResult> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();
    const tcOldId = await this.getTcOldId(userId);

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');
    this.enforceEnrollmentOpen(group);

    // Legacy month-name → number map (Django uses lowercase month names).
    const MONTH_MAP: Record<string, string> = {
      січня: '01',
      лютого: '02',
      березня: '03',
      квітня: '04',
      травня: '05',
      червня: '06',
      липня: '07',
      серпня: '08',
      вересня: '09',
      жовтня: '10',
      листопада: '11',
      грудня: '12',
    };

    // Header-name parsing (mirrors Django StudyGroupExcelUpload._EXCEL_HEADING_COLS).
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: (string | number | null)[][] = XLSX.utils.sheet_to_json(
      sheet,
      { header: 1, defval: null },
    );

    if (rawRows.length === 0) {
      throw new BadRequestException('Excel file is empty');
    }

    const headerRow = (rawRows[0] ?? []).map((c) =>
      c == null ? '' : String(c).trim(),
    );
    const headerIndex: Record<string, number> = {};
    for (let i = 0; i < headerRow.length; i++) {
      headerIndex[headerRow[i]] = i;
    }
    const cell = (row: (string | number | null)[], header: string): string => {
      const idx = headerIndex[header];
      if (idx === undefined) return '';
      const v = row[idx];
      return v == null ? '' : String(v).trim();
    };

    const dataRows = rawRows.slice(1);
    const EXCEL_ROWS_MIN = 1;
    const EXCEL_ROWS_MAX = 50;
    if (dataRows.length < EXCEL_ROWS_MIN || dataRows.length > EXCEL_ROWS_MAX) {
      throw new BadRequestException(
        `Number of rows must be between ${EXCEL_ROWS_MIN} and ${EXCEL_ROWS_MAX} (header excluded)`,
      );
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as (string | number | null)[];
      const rowIdx = i + 2; // 1-based, plus header

      const taxNumber = cell(row, 'РНОКПП');
      const surname = cell(row, 'Прізвище');
      const firstName = cell(row, "Ім'я");
      const middleName = cell(row, 'По батькові');
      const phone = cell(row, 'Контактний номер');
      const email = cell(row, 'Email');
      const day = cell(row, 'День народження');
      const monthName = cell(row, 'Місяць народження').toLowerCase();
      const year = cell(row, 'Рік народження');
      const countryOfBirthName = cell(row, 'Країна народження');
      const addrTown = cell(row, 'Населений пункт реєстрації');
      const addrStreet = cell(row, 'Вулиця');
      const addrHouse = cell(row, 'Номер будинку');
      const addrFlat = cell(row, 'Номер квартири');
      const postCode = cell(row, 'Поштовий код');
      const surnameTrans = cell(row, 'Прізвище (трансліт)');
      const firstNameTrans = cell(row, "Ім'я (трансліт)");
      const driverLicenseNo = cell(row, 'Номер посвідчення водія');
      const categoriesListCell = cell(
        row,
        'Категорії, які будуть відкриті  за СПК',
      );
      // Tolerate single-space vs double-space variant
      const categoriesList =
        categoriesListCell ||
        cell(row, 'Категорії, які будуть відкриті за СПК');

      if (!taxNumber || !surname || !firstName) {
        errors.push(`Row ${rowIdx}: missing required fields`);
        continue;
      }

      let dateOfBirth: string | null = null;
      if (day && monthName && year && MONTH_MAP[monthName]) {
        const dayPadded = String(Number(day)).padStart(2, '0');
        dateOfBirth = `${year}-${MONTH_MAP[monthName]}-${dayPadded}`;
      }

      // FK lookups (best-effort: keep defaults when name doesn't match a row)
      let countryOfBirthId = 1;
      if (countryOfBirthName) {
        const c = await this.countryRepo.findOne({
          where: { nameUkr: countryOfBirthName },
        });
        if (c) countryOfBirthId = c.id;
      }

      // Check if driver already in group
      const inGroup = await this.sgsRepo
        .createQueryBuilder('sgs')
        .innerJoin(EDriver, 'd', 'd.id = sgs.edriverId')
        .where('sgs.studygroupId = :groupId', { groupId })
        .andWhere('d.taxNumber = :taxNumber', { taxNumber })
        .getOne();

      if (inGroup) {
        skipped++;
        continue;
      }

      // Find or create driver
      const existing = await this.driverRepo.findOne({
        where: { taxNumber, tcId: tcOldId ?? -1 },
      });

      let driverId: number;
      if (existing) {
        driverId = existing.id;
      } else {
        const now = new Date();
        const newDriver = this.driverRepo.create({
          surname,
          firstName,
          middleName,
          taxNumber,
          dateOfBirth,
          phone: phone || null,
          email: email || null,
          addrTown: addrTown || null,
          addrStreet: addrStreet || null,
          addrHouse: addrHouse || null,
          addrFlat: addrFlat || null,
          postCode: postCode || null,
          countryOfBirthId,
          statusId: 4,
          tcId: tcOldId ?? 0,
          lastUser: null,
          createdAt: now,
          updatedAt: now,
          surnameTrans: surnameTrans || null,
          firstNameTrans: firstNameTrans || null,
          driverLicenseNo: driverLicenseNo || null,
          categoriesList: categoriesList || null,
        });
        const saved = await this.driverRepo.save(newDriver);
        driverId = saved.id;
      }

      try {
        await this.enforceMaxGroupSize(groupId, driverId);
      } catch (e) {
        if (e instanceof BadRequestException) {
          errors.push(
            `Row ${rowIdx}: ${(e.getResponse() as { message?: string }).message ?? 'group is full'}`,
          );
          break;
        }
        throw e;
      }

      await this.sgsRepo.save(
        this.sgsRepo.create({ studygroupId: groupId, edriverId: driverId }),
      );
      imported++;
    }

    // Persist audit log (mirror Django StudyGroupLog row written by _save_rows).
    await this.sgLogRepo.save(
      this.sgLogRepo.create({
        studyGroupId: groupId,
        type: 1,
        action: 'EXCEL_IMPORT',
        actorUserId: userId,
        count: imported,
        description: `Imported: ${imported}, skipped: ${skipped}, errors: ${errors.length}`,
        createdAt: new Date(),
      }),
    );

    return { imported, skipped, errors };
  }

  async getSpk(userId: string, spkId: number): Promise<SpkDetail> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const row = await this.spkRepo
      .createQueryBuilder('e')
      .innerJoin(EDriver, 'd', 'd.id = e.driverId')
      .leftJoin(ECarryType, 'ct', 'ct.id = e.carryTypeId')
      .leftJoin(
        (qb) =>
          qb
            .select('ec.surnameTrans', 'surname_trans')
            .addSelect('ec.firstNameTrans', 'first_name_trans')
            .addSelect('ec.driverId', 'driver_id')
            .from(ECard, 'ec')
            .orderBy('ec.createdAt', 'DESC')
            .limit(1),
        'lat_c',
        'lat_c.driver_id = e.driverId',
      )
      .innerJoin(TrainingCenter, 'tc', 'tc.oldId = e.tcId')
      .addSelect('ct.nameSpk', 'carryTypeNameSpk')
      .addSelect(
        `d.surname || ' ' || d.firstName || CASE WHEN d.middleName IS NOT NULL AND d.middleName <> '' THEN ' ' || d.middleName ELSE '' END`,
        'driverPipFull',
      )
      .addSelect(
        `COALESCE(lat_c.surname_trans || ' ' || lat_c.first_name_trans, '')`,
        'driverPiTrans',
      )
      .addSelect(
        `COALESCE(tc.postCode || ', ', '') || tc.city || ', ' || tc.addrStreet || ', ' || tc.addrHouse || ', код ЄДРПОУ ' || tc.edrpou`,
        'tcAddress',
      )
      .where('e.id = :spkId', { spkId })
      .andWhere('e.tcId = :tcOldId', { tcOldId })
      .getRawAndEntities();

    if (!row.entities.length) throw new NotFoundException('SPK not found');

    const e = row.entities[0];
    const raw = row.raw[0];
    const driver = await this.driverRepo.findOne({ where: { id: e.driverId } });

    // Fetch current country of birth name if countryOfBirthId exists
    let countryOfBirth: string | null = null;
    if (driver?.countryOfBirthId) {
      const country = await this.countryRepo.findOne({
        where: { id: driver.countryOfBirthId },
      });
      countryOfBirth = country?.nameUkr ?? null;
    }

    // Fetch latest ECard for driver to get current categoriesList
    let categoriesList: string | null = null;
    const latestCard = await this.cardRepo.findOne({
      where: { driverId: e.driverId },
      order: { createdAt: 'DESC' },
    });
    if (latestCard) {
      categoriesList = latestCard.categoriesList ?? null;
    }

    return {
      id: e.id,
      uuid: e.uuid,
      driverId: e.driverId,
      spkNo: e.spkNo,
      tcCertNo: e.tcCertNo,
      tcName: e.tcName,
      tcAddress: (raw.tcAddress ?? raw.tc_address ?? null) as string | null,
      driverPip: e.driverPip,
      driverPipFull: (raw.driverPipFull ?? raw.driver_pip_full ?? null) as
        | string
        | null,
      driverPiTrans: (raw.driverPiTrans ?? raw.driver_pi_trans ?? null) as
        | string
        | null,
      dateOfBirth: this.mapDate(driver?.dateOfBirth),
      countryOfBirth,
      categoriesList,
      dateOfTest: this.mapDate(e.dateOfTest),
      carryTypeTxt: e.carryTypeTxt,
      carryTypeNameSpk: (raw.carryTypeNameSpk ??
        raw.carry_type_name_spk ??
        raw.ct_name_spk ??
        null) as string | null,
      dateOfMiniinfra: this.mapDate(e.dateOfMiniinfra),
      miniinfraNo: e.miniinfraNo,
      dateOfMinjust: this.mapDate(e.dateOfMinjust),
      minjustNo: e.minjustNo,
      testProtocolNo: e.testProtocolNo,
      dateOfTestProtocol: this.mapDate(e.dateOfTestProtocol),
      dateOfExpiry: this.mapDate(e.dateOfExpiry),
      position: e.position,
      chiefPip: e.chiefPip,
      createdAt: e.createdAt ? e.createdAt.toISOString() : null,
    };
  }

  async updateSpk(
    userId: string,
    spkId: number,
    dto: UpdateSpkDto,
  ): Promise<SpkDetail> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const spk = await this.spkRepo.findOne({
      where: { id: spkId, tcId: tcOldId },
    });
    if (!spk) throw new NotFoundException('SPK not found');

    if (dto.driverPip !== undefined) {
      const ageMs = Date.now() - (spk.createdAt?.getTime() ?? 0);
      if (ageMs > NAME_EDIT_WINDOW_MS) {
        throw new BadRequestException(
          'Driver name can only be changed within 48 hours of SPK creation',
        );
      }
      spk.driverPip = dto.driverPip;
    }

    if (dto.dateOfTest !== undefined) {
      spk.dateOfTest = dto.dateOfTest;
      // Re-derive expiry whenever the test date changes — keeps the 5-year
      // rule (Наказ 789, п.27) inviolate even on edits.
      if (dto.dateOfTest) {
        spk.dateOfExpiry = this.addYearsIso(dto.dateOfTest, SPK_VALIDITY_YEARS);
      } else {
        spk.dateOfExpiry = null;
      }
    }
    // tcName/tcCertNo, carryTypeTxt and the ministry fields are read-only
    // after creation (Django parity: SPKForm.readonly_fields); dateOfExpiry is
    // always re-derived from dateOfTest above. None of them are accepted here.
    if (dto.testProtocolNo !== undefined)
      spk.testProtocolNo = dto.testProtocolNo;
    if (dto.dateOfTestProtocol !== undefined)
      spk.dateOfTestProtocol = dto.dateOfTestProtocol;
    if (dto.position !== undefined) spk.position = dto.position;
    if (dto.chiefPip !== undefined) spk.chiefPip = dto.chiefPip;

    spk.updatedAt = new Date();
    await this.spkRepo.save(spk);

    return this.getSpk(userId, spkId);
  }

  async getSpkPdf(userId: string, spkId: number): Promise<Buffer> {
    const spk = await this.getSpk(userId, spkId);
    const siteUrl =
      process.env['SITE_URL'] ??
      process.env['FRONTEND_URL'] ??
      'http://localhost';
    const qrDataUrl = await QRCode.toDataURL(`${siteUrl}/registry/${spk.uuid}`);
    const html = this.buildSpkHtml(spk, qrDataUrl);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '22.5mm', right: '22.5mm' },
    });
    await browser.close();

    return Buffer.from(pdfBuffer);
  }

  private buildSpkHtml(spk: SpkDetail, qrDataUrl: string): string {
    const MONTHS_GEN = [
      '',
      'січня',
      'лютого',
      'березня',
      'квітня',
      'травня',
      'червня',
      'липня',
      'серпня',
      'вересня',
      'жовтня',
      'листопада',
      'грудня',
    ];

    // DD.MM.YYYY
    const fmtDMY = (d: string | null): string => {
      if (!d) return '—';
      const [y, m, day] = d.split('-');
      return `${day}.${m}.${y}`;
    };

    // {day} {month_gen} {year} р.
    const fmtDoc = (d: string | null): string => {
      if (!d) return '—';
      const dt = new Date(d);
      return `${dt.getUTCDate()} ${MONTHS_GEN[dt.getUTCMonth() + 1]} ${dt.getUTCFullYear()} р.`;
    };

    // {day} {month_gen} {year} року
    const fmtDocFull = (d: string | null): string => {
      if (!d) return '—';
      const dt = new Date(d);
      return `${dt.getUTCDate()} ${MONTHS_GEN[dt.getUTCMonth() + 1]} ${dt.getUTCFullYear()} року`;
    };

    const gerbPath = path.join(process.cwd(), 'assets', 'gerb.png');
    let gerbDataUrl = '';
    try {
      const gerbBytes = fs.readFileSync(gerbPath);
      gerbDataUrl = `data:image/png;base64,${gerbBytes.toString('base64')}`;
    } catch {
      // gerb not available — leave empty
    }

    const certNoFormatted =
      spk.tcCertNo && spk.tcCertNo.includes('-') && spk.tcCertNo.length > 3
        ? `№UA МІУ ${spk.tcCertNo}`
        : `№ UA ${spk.tcCertNo}`;

    const driverPipFull = spk.driverPipFull ?? spk.driverPip;
    const driverPiTrans =
      spk.driverPiTrans && spk.driverPiTrans.trim()
        ? spk.driverPiTrans
        : this.transliterateUkr(spk.driverPip);
    const carryType = spk.carryTypeNameSpk ?? '';

    return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 14pt;
    color: #000;
  }
  .page {
    width: 165mm;
    margin: 0 auto;
    padding: 0;
  }
  /* QR + GERB row */
  .qr-gerb-row { display: flex; align-items: flex-start; margin-bottom: 6pt; }
  .qr-cell { flex-shrink: 0; }
  .gerb-col { flex: 1; text-align: center; }
  /* Header info table */
  .tc-table { width: 100%; border-collapse: collapse; margin-bottom: 11pt; }
  .tc-table td { vertical-align: middle; padding: 4pt 4pt; font-size: 12pt; }
  .ua-top {
    width: 30mm;
    border-top: 0.5pt solid #000;
    border-left: 0.5pt solid #000;
    border-right: 0.5pt solid #000;
    border-bottom: 0.5pt solid #000;
    text-align: center;
    vertical-align: middle;
    padding-bottom: 2pt;
  }
  .ua-bottom {
    width: 30mm;
    border-top: 0;
    border-left: 0.5pt solid #000;
    border-right: 0.5pt solid #000;
    border-bottom: 0.5pt solid #000;
    text-align: center;
    vertical-align: middle;
    padding-top: 2pt;
  }
  .ua-big { font-size: 18pt; font-weight: bold; line-height: 18pt; }
  .ua-cert { font-size: 12pt; line-height: 14pt; }
  .tc-right {
    border: 0.5pt solid #000;
    text-align: center;
    vertical-align: middle;
    font-size: 12pt;
    line-height: 13pt;
  }
  /* Titles */
  .cert-title { text-align: center; font-size: 12pt; font-weight: bold; line-height: 18pt; }
  /* Big spacer between title and body */
  .spacer-65 { height: 65pt; }
  /* Paragraphs */
  .para-indent { text-align: justify; text-indent: 10mm; margin-bottom: 14pt; line-height: 14pt; }
  .para { text-align: justify; margin-bottom: 14pt; line-height: 14pt; }
  /* Footer table */
  .footer-table { width: 160mm; border-collapse: collapse; margin-top: 50pt; }
  .footer-table td { font-size: 12pt; line-height: 14pt; padding: 0 2pt; }
  .sig-val { border-bottom: 1pt solid #000; }
  .sig-label { font-size: 10pt; text-align: center; }
  .col-pos { width: 35mm; }
  .col-gap1 { width: 10mm; }
  .col-sig { width: 40mm; }
  .col-gap2 { width: 10mm; }
  .col-name { width: 65mm; }
</style>
</head>
<body>
<div class="page">

  <!-- QR + Gerb -->
  <div class="qr-gerb-row">
    <div class="qr-cell">
      <img src="${qrDataUrl}" width="76" height="76"/>
    </div>
    <div class="gerb-col">
      ${gerbDataUrl ? `<img src="${gerbDataUrl}" width="45" height="64" style="display:block; margin:0 auto;"/>` : ''}
      <div style="font-weight:bold; font-size:12pt; margin-top:4pt;">УКРАЇНА</div>
    </div>
  </div>

  <!-- Training Center info table -->
  <table class="tc-table">
    <tr>
      <td class="ua-top">
        <div class="ua-big">UA</div>
      </td>
      <td class="tc-right" rowspan="2">
        <div>${spk.tcName ?? ''}</div>
        <div>${spk.tcAddress ?? ''}</div>
      </td>
    </tr>
    <tr>
      <td class="ua-bottom">
        <div class="ua-cert">${certNoFormatted}</div>
      </td>
    </tr>
  </table>

  <!-- Certificate titles -->
  <div class="cert-title">СВІДОЦТВО ПРО ПІДТВЕРДЖЕННЯ</div>
  <div class="cert-title">ПРОФЕСІЙНОЇ КОМПЕТЕНТНОСТІ № <u>${spk.spkNo}</u></div>

  <div class="spacer-65"></div>

  <!-- Paragraph 1 -->
  <p class="para-indent">
    Цим Свідоцтвом підтверджується, що
    <u><b>${driverPipFull} (${driverPiTrans})</b></u>,
    що народився(-лась) <u>${fmtDMY(spk.dateOfBirth)}</u> року в <u>${spk.countryOfBirth ?? '—'}</u>,
    успішно склав <u>${fmtDMY(spk.dateOfTest)}</u> іспит з підтвердження професійної
    компетентності водія транспортного засобу для надання послуг з <u>${carryType}</u> перевезень
    автомобільним транспортом відповідно до Порядку підтвердження професійної компетентності водіїв
    транспортних засобів для надання послуг з перевезення пасажирів і вантажів, затвердженого
    наказом Міністерства інфраструктури України від ${fmtDocFull(spk.dateOfMiniinfra)} №${spk.miniinfraNo ?? '—'},
    зареєстрованим у Міністерстві юстиції України ${fmtDocFull(spk.dateOfMinjust)} за №${spk.minjustNo ?? '—'}.
  </p>

  <!-- Paragraph 2 -->
  <p class="para-indent">
    Це Свідоцтво засвідчує професійну компетентність водія транспортного засобу надавати послуги
    з перевезення пасажирів та/або вантажів відповідно до Європейської угоди щодо роботи екіпажів
    транспортних засобів, які виконують міжнародні автомобільні перевезення (ЄУТР), Закону України
    &laquo;Про автомобільний транспорт&raquo;, Хартії Якості міжнародних автомобільних вантажних перевезень в
    системі багатосторонньої квоти ЄКМТ, підписаної міністрами транспорту країн - членів Міжнародного
    Транспортного Форуму 28 травня 2015 року в м. Лейпциг.
  </p>

  <!-- Paragraph 3 -->
  <p class="para">
    Підстава: протокол проведення іспиту від <u>${fmtDoc(spk.dateOfTestProtocol)}</u> №<u>${spk.testProtocolNo ?? '—'}</u>.
  </p>

  <!-- Paragraph 4 -->
  <p class="para">Чинне до <u>${fmtDoc(spk.dateOfExpiry)}</u></p>

  <!-- Footer signature table -->
  <table class="footer-table">
    <tr>
      <td class="col-pos sig-val">${spk.position ?? ''}</td>
      <td class="col-gap1"></td>
      <td class="col-sig sig-val"></td>
      <td class="col-gap2"></td>
      <td class="col-name sig-val">${spk.chiefPip ?? ''}</td>
    </tr>
    <tr>
      <td class="col-pos sig-label">посада</td>
      <td class="col-gap1"></td>
      <td class="col-sig sig-label">підпис, печатка</td>
      <td class="col-gap2"></td>
      <td class="col-name sig-label">власне ім'я та ПРІЗВИЩЕ</td>
    </tr>
  </table>

</div>
</body>
</html>`;
  }

  /**
   * Generate ZIP archive with SPK PDFs + QR code PNGs for all students in a study group.
   * Ported from Django ArchiveSPKDownloadView.
   */
  async getSpkArchive(
    userId: string,
    groupId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');

    // Get all students with their SPK records
    const rows = await this.driverRepo
      .createQueryBuilder('d')
      .innerJoin(StudyGroupStudent, 'tss', 'tss.edriverId = d.id')
      .leftJoin(ESPK, 'e', 'e.driverId = d.id')
      .addSelect('e.id', 'spkId')
      .addSelect('e.spkNo', 'spkNo')
      .addSelect(
        `d.surname || ' ' || d.firstName || CASE WHEN d.middleName IS NOT NULL AND d.middleName <> '' THEN ' ' || d.middleName ELSE '' END`,
        'driverPipFull',
      )
      .where('tss.studygroupId = :groupId', { groupId })
      .orderBy('d.surname', 'ASC')
      .addOrderBy('d.firstName', 'ASC')
      .addOrderBy('e.id', 'ASC')
      .getRawMany();

    // Group SPKs by driver
    const driverSpks = new Map<
      number,
      { pip: string; spks: { spkId: number; spkNo: string }[] }
    >();
    for (const r of rows) {
      const driverId = (r.d_id ?? r.id) as number;
      const pip = (r.driverPipFull ?? r.driver_pip_full) as string;
      if (!driverSpks.has(driverId)) {
        driverSpks.set(driverId, { pip, spks: [] });
      }
      const spkId = (r.spkId ?? r.e_id) as number | null;
      const spkNo = (r.spkNo ?? r.e_spk_no) as string | null;
      if (spkId && spkNo) {
        driverSpks.get(driverId).spks.push({ spkId, spkNo });
      }
    }

    // Generate ZIP with SPK PDFs and QR codes using a shared browser
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const collectPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    let driverCount = 0;
    for (const [, archiveData] of driverSpks) {
      driverCount++;
      const hasMultipleSpks = archiveData.spks.length > 1;

      for (let spkIdx = 0; spkIdx < archiveData.spks.length; spkIdx++) {
        const spk = archiveData.spks[spkIdx];
        const prefix = hasMultipleSpks
          ? `${driverCount}.${spkIdx + 1}.`
          : `${driverCount}.`;

        // Generate SPK PDF
        const spkDetail = await this.getSpk(userId, spk.spkId);
        const siteUrl =
          process.env['SITE_URL'] ??
          process.env['FRONTEND_URL'] ??
          'http://localhost';
        const registryUrl = `${siteUrl}/registry/${spkDetail.uuid}`;
        const qrDataUrl = await QRCode.toDataURL(registryUrl);
        const html = this.buildSpkHtml(spkDetail, qrDataUrl);
        const browserPage = await browser.newPage();
        await browserPage.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await browserPage.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '15mm',
            bottom: '15mm',
            left: '22.5mm',
            right: '22.5mm',
          },
        });
        await browserPage.close();

        const spkFilename = `${prefix} ${archiveData.pip} СПК № ${spk.spkNo}.pdf`;
        archive.append(Buffer.from(pdfBuffer), { name: spkFilename });

        // Generate QR code PNG
        const qrPngBuffer = await QRCode.toBuffer(registryUrl, {
          type: 'png',
          width: 300,
        });
        const qrFilename = `${prefix} ${archiveData.pip} QR-код.png`;
        archive.append(qrPngBuffer, { name: qrFilename });
      }
    }

    await browser.close();
    void archive.finalize();
    const archiveBuffer = await collectPromise;

    const safeGroupName = group.name.replace(/ /g, '_');
    const filename = `Реєстр-проф_Пакет-СПК-для-групи_${safeGroupName}.zip`;

    return { buffer: archiveBuffer, filename };
  }

  /**
   * Generate ZIP archive with personalization Excel + photo/signature images.
   * Ported from Django ArchivePersonalisationDownloadView.
   */
  async getPersonalizationArchive(
    userId: string,
    groupId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const tcId = await this.getTcId(userId);
    if (!tcId) throw new ForbiddenException();

    const group = await this.sgRepo.findOne({
      where: { id: groupId, trainingCenterId: tcId },
    });
    if (!group) throw new NotFoundException('Study group not found');
    const safeGroupName = group.name.replace(/ /g, '_');

    // Get all students with ecard + espk data using raw query for complex joins.
    // Driver address columns (addr_town/street/house/flat, post_code) exist in
    // `system_edriver` (Django parity) and are loaded directly via raw SQL,
    // bypassing the TypeORM entity which doesn't map them.
    const rows: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT d.id AS driver_id, d.surname AS d_surname, d.first_name AS d_first_name,
              d.middle_name,
              d.addr_town AS d_addr_town, d.addr_street AS d_addr_street,
              d.addr_house AS d_addr_house, d.addr_flat AS d_addr_flat,
              d.post_code AS d_post_code,
              c.id AS card_id, c.surname AS c_surname, c.first_name AS c_first_name,
              c.surname_trans, c.first_name_trans,
              c.date_of_birth, c.date_of_issue, c.date_of_expiry,
              c.licence_no, c.serial_no, c.categories_list, c.union_code95,
              c.photo_img, c.sign_img,
              e.id AS spk_id, e.spk_no, e.country_of_birth,
              tc.name_short AS tc_name_short, tc.edrpou AS tc_edrpou,
              tc.city AS tc_city, tc.addr_street AS tc_addr_street,
              tc.addr_house AS tc_addr_house, tc.post_code AS tc_post_code
       FROM study_group_students tss
       JOIN system_edriver d ON d.id = tss.edriver_id
       LEFT JOIN system_ecard c ON c.driver_id = d.id
       LEFT JOIN system_espk e ON e.driver_id = d.id
       LEFT JOIN training_center tc ON tc.old_id = e.tc_id
       WHERE tss.studygroup_id = $1
       ORDER BY d.surname, d.first_name`,
      [groupId],
    );

    // Build Excel workbook
    const headers = [
      '№',
      'Прізвище',
      'Surname',
      "Ім'я",
      'First name',
      'Дата і місце народження',
      'Дата видачі',
      'Дата закінчення дії',
      'Назва код установи що видала картку',
      'Код в єдиному демографічному реєстрі',
      'Номер посвідчення водія',
      'Серійний номер картки',
      'Фото водія',
      'Підпис водія',
      'Місце проживання',
      'Категорія C1',
      'Категорія C',
      'Категорія D1',
      'Категорія D',
      'Категорія C1E',
      'Категорія CE',
      'Категорія D1E',
      'Категорія DE',
      'код 95 і дата підвищення кваліфікації',
      'QR код',
      'Зарезервовано',
    ];

    const wsData: (string | number | null)[][] = [headers];

    // Column letters row
    const colLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    wsData.push(colLetters);

    // Deduplicate: one row per driver (take the first/latest ecard)
    const seen = new Set<number>();
    let driverCount = 0;

    // Track per-row date triples and bundled images for post-processing.
    const dateFormulas: {
      rowNum: number;
      issue: { y: number; m: number; d: number } | null;
      expiry: { y: number; m: number; d: number } | null;
    }[] = [];
    const imagesToBundle: {
      driverIdx: number;
      pip: string;
      photoUrl: string | null;
      signUrl: string | null;
    }[] = [];

    /** Site URL for QR payload (matches Django registry_detail URL). */
    const siteUrl =
      process.env['SITE_URL'] ??
      process.env['FRONTEND_URL'] ??
      'http://localhost';

    const parseDateParts = (
      v: unknown,
    ): { y: number; m: number; d: number } | null => {
      if (!v) return null;
      if (v instanceof Date) {
        return {
          y: v.getFullYear(),
          m: v.getMonth() + 1,
          d: v.getDate(),
        };
      }
      const s = String(v);
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
      if (!match) return null;
      return {
        y: Number(match[1]),
        m: Number(match[2]),
        d: Number(match[3]),
      };
    };

    const fmtDateDmy = (v: unknown): string => {
      const parts = parseDateParts(v);
      if (!parts) return '';
      const dd = String(parts.d).padStart(2, '0');
      const mm = String(parts.m).padStart(2, '0');
      return `${dd}.${mm}.${parts.y}`;
    };

    const sanitiseFilenameSegment = (s: string): string =>
      s.replace(/[^\p{L}\p{N}._-]+/gu, '_');

    for (const r of rows) {
      const driverId = r['driver_id'] as number;
      if (seen.has(driverId)) continue;
      seen.add(driverId);
      driverCount++;

      const hasCard = r['card_id'] !== null;

      // Excel row index: header(1) + col-letters(2) → first data row is 3.
      const rowNum = wsData.length + 1;

      // Driver PIP used for image filenames inside the archive.
      const driverPip = sanitiseFilenameSegment(
        ((r['d_surname'] as string) ?? '') +
          '_' +
          ((r['d_first_name'] as string) ?? ''),
      );

      if (hasCard) {
        // F column: ecard DOB only (place_of_birth removed).
        const dob = fmtDateDmy(r['date_of_birth']);
        const dobPlace = dob;

        const tcNameShort = (r['tc_name_short'] as string) ?? '';
        const tcEdrpou = (r['tc_edrpou'] as string) ?? '';
        const issuedByVal = tcNameShort ? `${tcNameShort} (${tcEdrpou})` : '';

        // O column: driver's own address (Django parity — was TC address).
        const dPostCode = (r['d_post_code'] as string) ?? '';
        const dAddrTown = (r['d_addr_town'] as string) ?? '';
        const dAddrStreet = (r['d_addr_street'] as string) ?? '';
        const dAddrHouse = (r['d_addr_house'] as string) ?? '';
        const dAddrFlat = (r['d_addr_flat'] as string) ?? '';
        const residence = [
          dPostCode,
          dAddrTown,
          dAddrStreet,
          dAddrHouse,
          dAddrFlat,
        ]
          .filter(Boolean)
          .join(', ');

        // Parse categories_list for individual category columns
        const catList = ((r['categories_list'] as string) ?? '')
          .split(',')
          .map((s) => s.trim());
        const catMap: Record<string, string> = {};
        for (const cat of catList) {
          if (cat) catMap[cat] = cat;
        }

        const serialNo = (r['serial_no'] as string) ?? '';
        // Y column: registry URL for QR (Django parity — was "CARD:<serial>").
        const qrData = `${siteUrl}/registry/${driverId}`;

        const issueParts = parseDateParts(r['date_of_issue']);
        const expiryParts = parseDateParts(r['date_of_expiry']);

        dateFormulas.push({
          rowNum,
          issue: issueParts,
          expiry: expiryParts,
        });

        imagesToBundle.push({
          driverIdx: driverCount,
          pip: driverPip,
          photoUrl: (r['photo_img'] as string) || null,
          signUrl: (r['sign_img'] as string) || null,
        });

        wsData.push([
          driverCount,
          ((r['c_surname'] as string) ?? '').toUpperCase(),
          ((r['surname_trans'] as string) ?? '').toUpperCase(),
          ((r['c_first_name'] as string) ?? '').toUpperCase(),
          ((r['first_name_trans'] as string) ?? '').toUpperCase(),
          dobPlace,
          fmtDateDmy(r['date_of_issue']), // overwritten by DATE() formula below
          fmtDateDmy(r['date_of_expiry']), // overwritten by DATE() formula below
          issuedByVal,
          '', // demographic registry code — not stored
          (r['licence_no'] as string) ?? '',
          serialNo,
          '', // photo — hyperlink placeholder
          '', // signature — hyperlink placeholder
          residence,
          catMap['C1'] ?? '',
          catMap['C'] ?? '',
          catMap['D1'] ?? '',
          catMap['D'] ?? '',
          catMap['C1E'] ?? '',
          catMap['CE'] ?? '',
          catMap['D1E'] ?? '',
          catMap['DE'] ?? '',
          (r['union_code95'] as string) ?? '',
          qrData,
          '', // reserved
        ]);
      } else {
        wsData.push([
          driverCount,
          (r['d_surname'] as string) ?? '',
          'картка відсутня',
          (r['d_first_name'] as string) ?? '',
          'картка відсутня',
          ...Array(21).fill(''),
        ]);
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths (approximate match to Django)
    ws['!cols'] = [
      { wch: 5 }, // A — №
      { wch: 20 }, // B — Прізвище
      { wch: 20 }, // C — Surname
      { wch: 15 }, // D — Ім'я
      { wch: 15 }, // E — First name
      { wch: 57 }, // F — Дата і місце народження
      { wch: 15 }, // G — Дата видачі
      { wch: 15 }, // H — Дата закінчення дії
      { wch: 45 }, // I — Назва код установи
      { wch: 25 }, // J — Код в демографічному реєстрі
      { wch: 25 }, // K — Номер посвідчення водія
      { wch: 25 }, // L — Серійний номер картки
      { wch: 45 }, // M — Фото водія
      { wch: 45 }, // N — Підпис водія
      { wch: 30 }, // O — Місце проживання
      { wch: 15 }, // P — C1
      { wch: 15 }, // Q — C
      { wch: 15 }, // R — D1
      { wch: 15 }, // S — D
      { wch: 15 }, // T — C1E
      { wch: 15 }, // U — CE
      { wch: 15 }, // V — D1E
      { wch: 15 }, // W — DE
      { wch: 15 }, // X — код 95
      { wch: 40 }, // Y — QR код
      { wch: 15 }, // Z — Зарезервовано
    ];

    // Patch G/H cells with real DATE(y,m,d) formulas (Django parity —
    // `write_formula(..., '=DATE(year,month,day)', date_col_style)`).
    for (const { rowNum, issue, expiry } of dateFormulas) {
      if (issue) {
        ws[`G${rowNum}`] = {
          t: 'n',
          f: `DATE(${issue.y},${issue.m},${issue.d})`,
          z: 'dd.mm.yyyy',
        };
      }
      if (expiry) {
        ws[`H${rowNum}`] = {
          t: 'n',
          f: `DATE(${expiry.y},${expiry.m},${expiry.d})`,
          z: 'dd.mm.yyyy',
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, '1. Таблиця персональних даних');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Create ZIP with Excel file
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const collectPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    archive.append(xlsxBuffer, {
      name: `${safeGroupName}/${safeGroupName}_персоналізація.xlsx`,
    });

    // Bundle photo + signature images (Django parity — see
    // ArchivePersonalisationDownloadView writing `{group}/{ecard.photo_img.name}`).
    for (const img of imagesToBundle) {
      if (img.photoUrl) {
        const photoBytes = await this.storageService.download(img.photoUrl);
        if (photoBytes) {
          archive.append(photoBytes, {
            name: `${safeGroupName}/${img.driverIdx}.${img.pip}_photo.jpg`,
          });
        }
      }
      if (img.signUrl) {
        const signBytes = await this.storageService.download(img.signUrl);
        if (signBytes) {
          archive.append(signBytes, {
            name: `${safeGroupName}/${img.driverIdx}.${img.pip}_signature.jpg`,
          });
        }
      }
    }

    void archive.finalize();
    const archiveBuffer = await collectPromise;

    const now = new Date();
    const ts = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getFullYear()),
      '_',
      String(now.getHours()).padStart(2, '0'),
      '.',
      String(now.getMinutes()).padStart(2, '0'),
      '.',
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const filename = `${safeGroupName}_персоналізація_${ts}.zip`;

    return { buffer: archiveBuffer, filename };
  }

  async getECard(userId: string, cardId: number): Promise<ECardDetail> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const row = await this.cardRepo
      .createQueryBuilder('c')
      .innerJoin(EDriver, 'd', 'd.id = c.driverId')
      .where('c.id = :cardId', { cardId })
      .andWhere('d.tcId = :tcOldId', { tcOldId })
      .getOne();

    if (!row) throw new NotFoundException('ECard not found');

    const driver = await this.driverRepo.findOne({
      where: { id: row.driverId },
    });

    // Fetch current country of birth name if countryOfBirthId exists
    let countryOfBirth: string | null = null;
    if (driver?.countryOfBirthId) {
      const country = await this.countryRepo.findOne({
        where: { id: driver.countryOfBirthId },
      });
      countryOfBirth = country?.nameUkr ?? null;
    }

    return {
      id: row.id,
      driverId: row.driverId,
      surname: driver?.surname ?? row.surname,
      firstName: driver?.firstName ?? row.firstName,
      surnameTranslit: row.surnameTrans,
      firstNameTranslit: row.firstNameTrans,
      dateOfBirth: this.mapDate(driver?.dateOfBirth),
      countryOfBirth,
      dateOfIssue: this.mapDate(row.dateOfIssue),
      dateOfExpiry: this.mapDate(row.dateOfExpiry),
      issuedBy: row.issuedBy,
      registrationNumber: row.registrationNumber,
      licenceNo: row.licenceNo,
      serialNo: row.serialNo,
      categoriesList: row.categoriesList ?? null,
      unionCode95: row.unionCode95,
      photoImg: row.photoImg ?? null,
      signImg: row.signImg ?? null,
      qrImg: row.qrImg ?? null,
      createdAt: row.createdAt ? row.createdAt.toISOString() : null,
    };
  }

  async updateECard(
    userId: string,
    cardId: number,
    dto: UpdateECardDto,
  ): Promise<ECardDetail> {
    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const card = await this.cardRepo
      .createQueryBuilder('c')
      .innerJoin(EDriver, 'd', 'd.id = c.driverId')
      .where('c.id = :cardId', { cardId })
      .andWhere('d.tcId = :tcOldId', { tcOldId })
      .getOne();
    if (!card) throw new NotFoundException('ECard not found');

    const nameFields = [
      'surname',
      'firstName',
      'surnameTranslit',
      'firstNameTranslit',
    ] as const;
    const hasNameChange = nameFields.some((f) => dto[f] !== undefined);
    if (hasNameChange) {
      const ageMs = Date.now() - (card.createdAt?.getTime() ?? 0);
      if (ageMs > NAME_EDIT_WINDOW_MS) {
        throw new BadRequestException(
          'Name fields can only be changed within 48 hours of card creation',
        );
      }
      if (dto.surname !== undefined) card.surname = dto.surname;
      if (dto.firstName !== undefined) card.firstName = dto.firstName;
      if (dto.surnameTranslit !== undefined)
        card.surnameTrans = dto.surnameTranslit;
      if (dto.firstNameTranslit !== undefined)
        card.firstNameTrans = dto.firstNameTranslit;
    }

    // serialNo (SPK link), issuedBy and dateOfExpiry (derived from the SPK
    // 5-year rule) are read-only after creation and not accepted here.
    if (dto.dateOfIssue !== undefined) card.dateOfIssue = dto.dateOfIssue;
    if (dto.registrationNumber !== undefined)
      card.registrationNumber = dto.registrationNumber;
    if (dto.licenceNo !== undefined) card.licenceNo = dto.licenceNo;
    if (dto.unionCode95 !== undefined) card.unionCode95 = dto.unionCode95;
    if (dto.photoImg !== undefined) card.photoImg = dto.photoImg ?? null;
    if (dto.signImg !== undefined) card.signImg = dto.signImg ?? null;
    if (dto.categoriesList !== undefined)
      card.categoriesList = dto.categoriesList ?? null;

    card.updatedAt = new Date();
    await this.cardRepo.save(card);

    return this.getECard(userId, cardId);
  }

  async uploadDriverFile(
    userId: string,
    driverId: number,
    field: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!['photo', 'signature'].includes(field)) {
      throw new BadRequestException('Field must be "photo" or "signature"');
    }

    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const driver = await this.driverRepo.findOne({
      where: { id: driverId, tcId: tcOldId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const key = `driver/${driverId}/${field}`;
    const url = await this.storageService.upload(
      key,
      file.buffer,
      file.mimetype,
    );

    if (field === 'photo') {
      await this.driverRepo.update(driverId, { photoImg: url });
    } else {
      await this.driverRepo.update(driverId, { signImg: url });
    }

    return { url };
  }

  async uploadEcardFile(
    userId: string,
    ecardId: number,
    field: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!['photo', 'signature'].includes(field)) {
      throw new BadRequestException('Field must be "photo" or "signature"');
    }

    const tcOldId = await this.getTcOldId(userId);
    if (!tcOldId) throw new ForbiddenException();

    const card = await this.cardRepo
      .createQueryBuilder('c')
      .innerJoin(EDriver, 'd', 'd.id = c.driverId')
      .where('c.id = :ecardId', { ecardId })
      .andWhere('d.tcId = :tcOldId', { tcOldId })
      .getOne();

    if (!card) throw new NotFoundException('ECard not found');

    const key = `ecard/${ecardId}/${field}`;
    const url = await this.storageService.upload(
      key,
      file.buffer,
      file.mimetype,
    );

    if (field === 'photo') {
      await this.cardRepo.update(ecardId, { photoImg: url });
    } else {
      await this.cardRepo.update(ecardId, { signImg: url });
    }

    return { url };
  }

  async getDriverIdBySpkUuid(uuid: string): Promise<number | null> {
    const spk = await this.spkRepo.findOne({
      where: { uuid },
      select: ['driverId'],
    });
    return spk?.driverId ?? null;
  }

  async getRegistryEntry(driverId: number): Promise<{
    driverPip: string;
    carryType: string | null;
    atiCode: string;
    categoriesList: string | null;
    unionCode95: string | null;
    espks: {
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
    }[];
  } | null> {
    const [entry, driver, card, spkResult] = await Promise.all([
      this.registryRepo.findOne({ where: { driverId } }),
      this.driverRepo.findOne({ where: { id: driverId } }),
      this.cardRepo.findOne({
        where: { driverId },
        order: { dateOfExpiry: 'DESC' },
      }),
      this.spkRepo
        .createQueryBuilder('e')
        .leftJoin(ECarryType, 'ct', 'ct.id = e.carryTypeId')
        .addSelect('ct.name', 'carryTypeName')
        .where('e.driverId = :driverId', { driverId })
        .orderBy('e.dateOfExpiry', 'DESC')
        .getRawAndEntities(),
    ]);

    // Require at least a driver or a registry entry to show anything
    if (!entry && !driver && spkResult.entities.length === 0) return null;

    const driverPip =
      entry?.driverPip ??
      (driver
        ? this.buildDriverPip(
            driver.surname,
            driver.firstName,
            driver.middleName,
          )
        : '—');

    // Derive carry type from first SPK when registry entry is absent
    const firstSpkCarryType = (spkResult.raw[0]?.carryTypeName ??
      spkResult.raw[0]?.ct_name ??
      null) as string | null;

    // Public response is anonymized (ТЗ: реєстр без персональних даних —
    // no РНОКПП, no date of birth, no address).
    return {
      driverPip,
      carryType: entry?.carryType ?? firstSpkCarryType,
      atiCode: entry?.atiCode ?? '',
      categoriesList: card?.categoriesList ?? entry?.categoriesList ?? null,
      unionCode95: card?.unionCode95 ?? null,
      espks: spkResult.entities.map((e, idx) => ({
        id: e.id,
        tcCertNo: e.tcCertNo,
        tcName: e.tcName,
        dateOfTest: this.mapDate(e.dateOfTest),
        carryTypeName: (spkResult.raw[idx]?.carryTypeName ??
          spkResult.raw[idx]?.ct_name ??
          null) as string | null,
        dateOfMiniinfra: this.mapDate(e.dateOfMiniinfra),
        miniinfraNo: e.miniinfraNo,
        dateOfMinjust: this.mapDate(e.dateOfMinjust),
        minjustNo: e.minjustNo,
        dateOfTestProtocol: this.mapDate(e.dateOfTestProtocol),
        testProtocolNo: e.testProtocolNo,
        dateOfExpiry: this.mapDate(e.dateOfExpiry),
        position: e.position,
        chiefPip: e.chiefPip,
      })),
    };
  }
}
