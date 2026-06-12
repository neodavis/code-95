import { StudyGroupStatus } from '@code95/shared-types';

/** Number of recent study groups shown on the dashboard */
export const DASHBOARD_RECENT_GROUPS_LIMIT = 3;

/**
 * Allowed study-group status transitions (ТЗ: lifecycle п.5).
 * ENROLLMENT_START → ENROLLMENT_FINISH | CANCELLED
 * ENROLLMENT_FINISH → IN_PROGRESS | ENROLLMENT_START
 * IN_PROGRESS → COMPLETED | ENROLLMENT_FINISH
 * COMPLETED — terminal; CANCELLED → ENROLLMENT_START
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<number, number[]> = {
  [StudyGroupStatus.ENROLLMENT_START]: [
    StudyGroupStatus.ENROLLMENT_FINISH,
    StudyGroupStatus.CANCELLED,
  ],
  [StudyGroupStatus.ENROLLMENT_FINISH]: [
    StudyGroupStatus.IN_PROGRESS,
    StudyGroupStatus.ENROLLMENT_START,
  ],
  [StudyGroupStatus.IN_PROGRESS]: [
    StudyGroupStatus.COMPLETED,
    StudyGroupStatus.ENROLLMENT_FINISH,
  ],
  [StudyGroupStatus.COMPLETED]: [],
  [StudyGroupStatus.CANCELLED]: [StudyGroupStatus.ENROLLMENT_START],
};

/** Maximum number of results returned by the driver autocomplete search */
export const DRIVER_SEARCH_LIMIT = 25;

/**
 * Maximum number of students per study group.
 * Per Наказ Мінінфраструктури № 789, Розділ II, п.5:
 * «Кількість суб'єктів звернення у групі не повинна перевищувати 25 осіб.»
 */
export const MAX_GROUP_SIZE = 25;

/** Phone number validation regex */
export const PHONE_REGEX = /^\+?\d[\d\s\-()]{6,19}$/;

/** Tax number (РНОКПП) validation regex — exactly 10 digits */
export const TAX_NUMBER_REGEX = /^\d{10}$/;
