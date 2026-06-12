export interface TrainingCenter {
  id: string;
  fatherTc: string;
  atiCode: string;
  division: string;
  name: string;
  nameShort: string;
  edrpou: string;
  certNo: string;
  city: string;
  addrStreet: string;
  addrHouse: string;
  postCode: string | null;
  certDate: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  chiefPip: string;
  isActive: boolean;
}

export interface CreateTrainingCenterPayload {
  name: string;
  edrpou: string;
  nameShort?: string;
  chiefPip?: string;
  atiCode?: string;
  division?: string;
  certNo?: string;
  certDate?: string;
  region?: string;
  city?: string;
  addrStreet?: string;
  addrHouse?: string;
  postCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  isActive?: boolean;
}

export type UpdateTrainingCenterPayload = Partial<CreateTrainingCenterPayload>;

export interface EmployeeListItem {
  id: string;
  isActive: boolean;
  userId: string;
  userUniqueCode: string;
  userFullName: string;
  trainingCenterId: string;
  trainingCenterName: string;
}

export interface CreateEmployeePayload {
  userId: string;
  trainingCenterId: string;
  isActive?: boolean;
}

export interface UpdateEmployeePayload {
  isActive: boolean;
}

export enum StudyGroupStatus {
  ENROLLMENT_START = 1,
  ENROLLMENT_FINISH = 2,
  IN_PROGRESS = 3,
  COMPLETED = 4,
  CANCELLED = 5,
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

export const COURSE_TYPE_HOURS: Record<CourseType, number> = {
  [CourseType.INITIAL]: 280,
  [CourseType.INITIAL_SHORTENED]: 140,
  [CourseType.PERIODIC]: 35,
};

/**
 * Reduced-program hours per Порядок (проєкт), п.16
 * (water with existing СПК on another category).
 */
export const COURSE_TYPE_REDUCED_HOURS: Partial<Record<CourseType, number>> = {
  [CourseType.INITIAL]: 70,
  [CourseType.INITIAL_SHORTENED]: 35,
};

export interface StudyGroup {
  id: string;
  name: string;
  trainingCenterId: string;
  carryTypeId: number | null;
  groupTypeId: string | null;
  dateStart: string | null;
  dateFinish: string | null;
  status: StudyGroupStatus;
  courseType: CourseType | null;
  isReducedProgram: boolean;
}

export interface StudyGroupStudent {
  id: number;
  surname: string;
  firstName: string;
  middleName: string;
  taxNumber: string;
  dateOfBirth: string | null;
}

export interface StudyGroupDetail extends StudyGroup {
  students: StudyGroupStudent[];
}

/**
 * Reasons a driver may be ineligible for a given course type, per Наказ 789, Розділ II, п.11.
 */
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

/**
 * @deprecated Use {@link CourseEligibilityResult}. Kept for transitional builds.
 */
export type ShortCourseEligibilityResult = CourseEligibilityResult;

export interface SplitGroupResult {
  primaryGroupId: string;
  secondaryGroupId: string;
}

export interface CreateStudyGroupPayload {
  name: string;
  carryTypeId?: number | null;
  groupTypeId?: number | null;
  dateStart?: string | null;
  dateFinish?: string | null;
  courseType?: CourseType | null;
}

export type UpdateStudyGroupPayload = Partial<CreateStudyGroupPayload>;
