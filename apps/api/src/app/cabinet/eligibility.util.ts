/**
 * Course eligibility rules per Наказ Мінінфраструктури № 789, Розділ II, п.11.
 *
 * Pure functions only — no DB / Nest dependencies — so they are trivially testable
 * and reusable on the frontend if needed in the future.
 */
import {
  CourseType,
  DriverLicenseCategory,
  EligibilityFailReason,
} from '@code95/shared-types';

export const MIN_EXPERIENCE_YEARS_FOR_SHORTENED = 3;

/**
 * Order 789 enactment date (Наказ Мінінфраструктури № 789 від 18.11.2020).
 * Used by п.11.3 "до набрання чинності цього Порядку" grandfather clause for
 * the PERIODIC course.
 */
export const ORDER_789_EFFECTIVE_DATE = '2020-11-18';

/**
 * Snapshot of license-related driver fields the eligibility rules consume.
 * Decoupled from the EDriver TypeORM entity to keep the rules side-effect free.
 */
export interface DriverLicenseSnapshot {
  driverLicenseCategories: string | null;
  driverLicenseIssueDate: string | null;
  driverLicenseExpiryDate: string | null;
  /**
   * Date when the driver first opened a C/CE/C1/C1E category. Required per
   * Наказ 789 п.11.2 to compute category-specific experience (стаж керування
   * ЦІЄЇ категорії). When null AND the driver holds C/CE, the shortened-course
   * check fails with NO_LICENSE_DATA — driverLicenseIssueDate is general
   * licence issuance and is NOT a valid substitute for category-specific
   * experience (e.g. driver opened B first, C later).
   */
  cCategoryIssueDate: string | null;
  /**
   * Date when the driver first opened a D/DE/D1/D1E category. Required per
   * Наказ 789 п.11.2 to compute category-specific experience. When null AND
   * the driver holds D/DE, the shortened-course check fails — same reasoning
   * as {@link cCategoryIssueDate}.
   */
  dCategoryIssueDate: string | null;
  intendsUrbanSuburbanRoute: boolean;
  /**
   * Whether the driver already holds at least one valid SPK on a different category.
   * Used to qualify for the periodic course (third clause of п.11.3).
   */
  hasPriorSpk: boolean;
}

export interface EligibilityCheck {
  ok: boolean;
  reason?: EligibilityFailReason;
  detail?: string;
}

const C_GROUP: ReadonlySet<DriverLicenseCategory> = new Set([
  DriverLicenseCategory.C,
  DriverLicenseCategory.CE,
]);
const D_GROUP: ReadonlySet<DriverLicenseCategory> = new Set([
  DriverLicenseCategory.D,
  DriverLicenseCategory.DE,
]);
const C1_GROUP: ReadonlySet<DriverLicenseCategory> = new Set([
  DriverLicenseCategory.C1,
  DriverLicenseCategory.C1E,
]);
const D1_GROUP: ReadonlySet<DriverLicenseCategory> = new Set([
  DriverLicenseCategory.D1,
  DriverLicenseCategory.D1E,
]);
const ALL_HEAVY: ReadonlySet<DriverLicenseCategory> = new Set([
  ...C_GROUP,
  ...D_GROUP,
  ...C1_GROUP,
  ...D1_GROUP,
]);

export function parseLicenseCategories(
  csv: string | null,
): DriverLicenseCategory[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is DriverLicenseCategory =>
      (Object.values(DriverLicenseCategory) as string[]).includes(s),
    ) as DriverLicenseCategory[];
}

function intersects<T>(a: Iterable<T>, b: ReadonlySet<T>): boolean {
  for (const x of a) if (b.has(x)) return true;
  return false;
}

export function calcExperienceYears(
  issueDate: string | null,
  asOf: Date = new Date(),
): number {
  if (!issueDate) return 0;
  const issued = new Date(issueDate);
  if (Number.isNaN(issued.getTime())) return 0;
  const ms = asOf.getTime() - issued.getTime();
  if (ms <= 0) return 0;
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

export function isLicenseExpired(
  expiryDate: string | null,
  asOf: Date = new Date(),
): boolean {
  if (!expiryDate) return false;
  const exp = new Date(expiryDate);
  if (Number.isNaN(exp.getTime())) return false;
  return exp.getTime() < asOf.setHours(0, 0, 0, 0);
}

/**
 * Validates a driver against a target {@link CourseType}.
 *
 * Rules (Наказ 789, Розділ II, п.11):
 *  1) initial:           must hold C/CE OR D/DE.
 *  2) initial_shortened: must hold C1/C1E, OR (C/CE with ≥3y experience),
 *                        OR D/DE with intent to drive urban/suburban route,
 *                        OR D1/D1E,
 *                        OR (D/DE with ≥3y experience).
 *  3) periodic:          must hold any of C, CE, C1, C1E, D, DE, D1, D1E
 *                        (legacy holders) OR have completed initial / initial_shortened
 *                        previously (`hasPriorSpk = true`).
 */
export function validateDriverEligibility(
  snapshot: DriverLicenseSnapshot,
  courseType: CourseType,
  asOf: Date = new Date(),
): EligibilityCheck {
  const cats = parseLicenseCategories(snapshot.driverLicenseCategories);

  if (
    !cats.length &&
    courseType !== CourseType.PERIODIC &&
    !snapshot.hasPriorSpk
  ) {
    return {
      ok: false,
      reason: EligibilityFailReason.NO_LICENSE_DATA,
      detail: 'Категорії посвідчення водія не вказані',
    };
  }

  if (isLicenseExpired(snapshot.driverLicenseExpiryDate, asOf)) {
    return {
      ok: false,
      reason: EligibilityFailReason.NO_LICENSE_DATA,
      detail: 'Посвідчення водія прострочене',
    };
  }

  switch (courseType) {
    case CourseType.INITIAL: {
      const ok = intersects(cats, C_GROUP) || intersects(cats, D_GROUP);
      return ok
        ? { ok: true }
        : {
            ok: false,
            reason: EligibilityFailReason.CATEGORIES_NOT_MATCHING,
            detail: 'Потрібна категорія C/CE або D/DE',
          };
    }

    case CourseType.INITIAL_SHORTENED: {
      if (intersects(cats, C1_GROUP)) return { ok: true };
      if (intersects(cats, D1_GROUP)) return { ok: true };

      if (intersects(cats, C_GROUP)) {
        if (!snapshot.cCategoryIssueDate) {
          return {
            ok: false,
            reason: EligibilityFailReason.NO_LICENSE_DATA,
            detail:
              'Потрібна дата відкриття категорії C/CE для перевірки стажу (Наказ 789 п.11.2)',
          };
        }
        const cExperience = calcExperienceYears(
          snapshot.cCategoryIssueDate,
          asOf,
        );
        if (cExperience >= MIN_EXPERIENCE_YEARS_FOR_SHORTENED)
          return { ok: true };
        return {
          ok: false,
          reason: EligibilityFailReason.EXPERIENCE_INSUFFICIENT,
          detail: `Для C/CE потрібен стаж керування цієї категорії ≥${MIN_EXPERIENCE_YEARS_FOR_SHORTENED} років`,
        };
      }

      if (intersects(cats, D_GROUP)) {
        if (snapshot.intendsUrbanSuburbanRoute) return { ok: true };
        if (!snapshot.dCategoryIssueDate) {
          return {
            ok: false,
            reason: EligibilityFailReason.NO_LICENSE_DATA,
            detail:
              'Потрібна дата відкриття категорії D/DE для перевірки стажу (Наказ 789 п.11.2)',
          };
        }
        const dExperience = calcExperienceYears(
          snapshot.dCategoryIssueDate,
          asOf,
        );
        if (dExperience >= MIN_EXPERIENCE_YEARS_FOR_SHORTENED)
          return { ok: true };
        return {
          ok: false,
          reason: EligibilityFailReason.EXPERIENCE_INSUFFICIENT,
          detail: `Для D/DE потрібен стаж керування цієї категорії ≥${MIN_EXPERIENCE_YEARS_FOR_SHORTENED} років або намір роботи на міському/приміському маршруті`,
        };
      }

      return {
        ok: false,
        reason: EligibilityFailReason.CATEGORIES_NOT_MATCHING,
        detail: 'Потрібна категорія C1/C1E, D1/D1E, C/CE або D/DE',
      };
    }

    case CourseType.PERIODIC: {
      if (snapshot.hasPriorSpk) return { ok: true };
      const hasCFamily =
        intersects(cats, C_GROUP) || intersects(cats, C1_GROUP);
      const hasDFamily =
        intersects(cats, D_GROUP) || intersects(cats, D1_GROUP);
      if (!hasCFamily && !hasDFamily) {
        return {
          ok: false,
          reason: EligibilityFailReason.CATEGORIES_NOT_MATCHING,
          detail:
            'Періодичні курси доступні лише водіям з C/CE/C1/C1E/D/DE/D1/D1E (відкритих до 2020-11-18) або тим, хто пройшов початкові курси',
        };
      }
      // Наказ 789 п.11.3 — категорія C/CE/C1/C1E/D/DE/D1/D1E ВІДКРИТА до набрання
      // чинності Порядку (2020-11-18). Перевіряємо саме дату відкриття категорії,
      // а не загальну дату видачі посвідчення (водій міг мати B з 2000 і відкрити C1E у 2026).
      const orderDate = new Date(ORDER_789_EFFECTIVE_DATE);

      if (hasCFamily) {
        if (!snapshot.cCategoryIssueDate) {
          return {
            ok: false,
            reason: EligibilityFailReason.NO_LICENSE_DATA,
            detail:
              'Потрібна дата відкриття категорії C/CE/C1/C1E для перевірки права на періодичні курси (Наказ 789 п.11.3)',
          };
        }
        const cDate = new Date(snapshot.cCategoryIssueDate);
        if (
          !Number.isNaN(cDate.getTime()) &&
          cDate.getTime() < orderDate.getTime()
        ) {
          return { ok: true };
        }
      }

      if (hasDFamily) {
        if (!snapshot.dCategoryIssueDate) {
          return {
            ok: false,
            reason: EligibilityFailReason.NO_LICENSE_DATA,
            detail:
              'Потрібна дата відкриття категорії D/DE/D1/D1E для перевірки права на періодичні курси (Наказ 789 п.11.3)',
          };
        }
        const dDate = new Date(snapshot.dCategoryIssueDate);
        if (
          !Number.isNaN(dDate.getTime()) &&
          dDate.getTime() < orderDate.getTime()
        ) {
          return { ok: true };
        }
      }

      return {
        ok: false,
        reason: EligibilityFailReason.CATEGORIES_NOT_MATCHING,
        detail: `Періодичні курси: категорія відкрита після ${ORDER_789_EFFECTIVE_DATE}. Водій повинен спочатку пройти початкові або початково-скорочені курси (Наказ 789 п.11.3).`,
      };
    }

    default: {
      const _exhaustive: never = courseType;
      return _exhaustive;
    }
  }
}

/**
 * Determines whether a driver qualifies for the reduced-program variant of
 * the requested course (Порядок (проєкт), п.16).
 *
 * Caller decides what counts as a "valid prior SPK on a different category" and
 * passes a boolean — keeps this helper free of DB dependencies.
 */
export function qualifiesForReducedProgram(
  hasValidPriorSpkOnOtherCategory: boolean,
  courseType: CourseType | null,
): boolean {
  if (!hasValidPriorSpkOnOtherCategory) return false;
  return (
    courseType === CourseType.INITIAL ||
    courseType === CourseType.INITIAL_SHORTENED
  );
}
