import { CourseType, EligibilityFailReason } from '@code95/shared-types';
import {
  calcExperienceYears,
  isLicenseExpired,
  parseLicenseCategories,
  qualifiesForReducedProgram,
  validateDriverEligibility,
  type DriverLicenseSnapshot,
} from './eligibility.util';

const TODAY = new Date('2026-05-04T00:00:00Z');

function snapshot(
  overrides: Partial<DriverLicenseSnapshot> = {},
): DriverLicenseSnapshot {
  return {
    driverLicenseCategories: 'C,CE',
    driverLicenseIssueDate: '2018-01-01',
    driverLicenseExpiryDate: '2030-01-01',
    cCategoryIssueDate: null,
    dCategoryIssueDate: null,
    intendsUrbanSuburbanRoute: false,
    hasPriorSpk: false,
    ...overrides,
  };
}

describe('parseLicenseCategories', () => {
  it('parses CSV and trims whitespace', () => {
    expect(parseLicenseCategories(' C, CE,D ')).toEqual(['C', 'CE', 'D']);
  });

  it('skips unknown values', () => {
    expect(parseLicenseCategories('C,B,Z')).toEqual(['C']);
  });

  it('returns [] for null/empty', () => {
    expect(parseLicenseCategories(null)).toEqual([]);
    expect(parseLicenseCategories('')).toEqual([]);
  });
});

describe('calcExperienceYears', () => {
  it('returns 0 for null issue date', () => {
    expect(calcExperienceYears(null, TODAY)).toBe(0);
  });

  it('returns ~3 years for an issue date 3 years ago', () => {
    const issued = '2023-05-04';
    const years = calcExperienceYears(issued, TODAY);
    expect(years).toBeCloseTo(3, 1);
  });

  it('returns 0 for future-dated issue date', () => {
    expect(calcExperienceYears('2099-01-01', TODAY)).toBe(0);
  });
});

describe('isLicenseExpired', () => {
  it('false when expiry is in the future', () => {
    expect(isLicenseExpired('2030-01-01', TODAY)).toBe(false);
  });

  it('true when expiry is in the past', () => {
    expect(isLicenseExpired('2020-01-01', TODAY)).toBe(true);
  });

  it('false when expiry is null', () => {
    expect(isLicenseExpired(null, TODAY)).toBe(false);
  });
});

describe('validateDriverEligibility — INITIAL', () => {
  it('allows C/CE holder', () => {
    expect(
      validateDriverEligibility(
        snapshot({ driverLicenseCategories: 'C,CE' }),
        CourseType.INITIAL,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('allows D/DE holder', () => {
    expect(
      validateDriverEligibility(
        snapshot({ driverLicenseCategories: 'D' }),
        CourseType.INITIAL,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('blocks holders without C/CE/D/DE', () => {
    const result = validateDriverEligibility(
      snapshot({ driverLicenseCategories: 'C1' }),
      CourseType.INITIAL,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.CATEGORIES_NOT_MATCHING);
  });

  it('blocks driver without any license categories', () => {
    const result = validateDriverEligibility(
      snapshot({ driverLicenseCategories: null }),
      CourseType.INITIAL,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.NO_LICENSE_DATA);
  });

  it('blocks driver with expired license', () => {
    const result = validateDriverEligibility(
      snapshot({ driverLicenseExpiryDate: '2020-01-01' }),
      CourseType.INITIAL,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.NO_LICENSE_DATA);
  });
});

describe('validateDriverEligibility — INITIAL_SHORTENED', () => {
  it('allows C1/C1E', () => {
    expect(
      validateDriverEligibility(
        snapshot({ driverLicenseCategories: 'C1' }),
        CourseType.INITIAL_SHORTENED,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('allows C/CE with ≥3 years experience', () => {
    expect(
      validateDriverEligibility(
        snapshot({
          driverLicenseCategories: 'C',
          driverLicenseIssueDate: '2010-01-01',
          cCategoryIssueDate: '2010-01-01',
        }),
        CourseType.INITIAL_SHORTENED,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('blocks C/CE with <3 years experience', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'C',
        driverLicenseIssueDate: '2025-01-01',
        cCategoryIssueDate: '2025-01-01',
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.EXPERIENCE_INSUFFICIENT);
  });

  it('blocks C/CE when cCategoryIssueDate is missing', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'C',
        driverLicenseIssueDate: '2010-01-01',
        cCategoryIssueDate: null,
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.NO_LICENSE_DATA);
  });

  it('allows D1/D1E', () => {
    expect(
      validateDriverEligibility(
        snapshot({ driverLicenseCategories: 'D1E' }),
        CourseType.INITIAL_SHORTENED,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('allows D/DE with intentUrbanSuburbanRoute regardless of experience', () => {
    expect(
      validateDriverEligibility(
        snapshot({
          driverLicenseCategories: 'D',
          driverLicenseIssueDate: '2025-01-01',
          intendsUrbanSuburbanRoute: true,
        }),
        CourseType.INITIAL_SHORTENED,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('allows D/DE with ≥3 years experience even without intent', () => {
    expect(
      validateDriverEligibility(
        snapshot({
          driverLicenseCategories: 'D',
          driverLicenseIssueDate: '2010-01-01',
          dCategoryIssueDate: '2010-01-01',
        }),
        CourseType.INITIAL_SHORTENED,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('blocks D/DE when dCategoryIssueDate is missing and no intent', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'D',
        driverLicenseIssueDate: '2010-01-01',
        dCategoryIssueDate: null,
        intendsUrbanSuburbanRoute: false,
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.NO_LICENSE_DATA);
  });

  it('blocks D/DE with <3 years and no intent', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'D',
        driverLicenseIssueDate: '2025-01-01',
        dCategoryIssueDate: '2025-01-01',
        intendsUrbanSuburbanRoute: false,
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.EXPERIENCE_INSUFFICIENT);
  });
});

describe('validateDriverEligibility — PERIODIC', () => {
  it('allows D-family holder when dCategoryIssueDate is before Order 789 effective date', () => {
    expect(
      validateDriverEligibility(
        snapshot({
          driverLicenseCategories: 'D1',
          dCategoryIssueDate: '2018-01-01',
        }),
        CourseType.PERIODIC,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('allows holder of a prior valid SPK regardless of categories', () => {
    expect(
      validateDriverEligibility(
        snapshot({
          driverLicenseCategories: null,
          hasPriorSpk: true,
        }),
        CourseType.PERIODIC,
        TODAY,
      ).ok,
    ).toBe(true);
  });

  it('blocks driver with no heavy categories and no prior SPK', () => {
    const result = validateDriverEligibility(
      snapshot({ driverLicenseCategories: 'B' }),
      CourseType.PERIODIC,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.CATEGORIES_NOT_MATCHING);
  });

  it('blocks D-family holder whose dCategoryIssueDate is AFTER Order 789 effective date (п.11.3 grandfather)', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'D',
        dCategoryIssueDate: '2024-06-01',
        hasPriorSpk: false,
      }),
      CourseType.PERIODIC,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.CATEGORIES_NOT_MATCHING);
  });

  it('blocks C-family holder whose cCategoryIssueDate is AFTER Order 789 (general licence date is irrelevant)', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'C1E',
        driverLicenseIssueDate: '2000-01-01',
        cCategoryIssueDate: '2026-01-01',
        hasPriorSpk: false,
      }),
      CourseType.PERIODIC,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.CATEGORIES_NOT_MATCHING);
  });

  it('allows post-Order driver if they have prior SPK (passed initial/shortened)', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'D',
        dCategoryIssueDate: '2024-06-01',
        hasPriorSpk: true,
      }),
      CourseType.PERIODIC,
      TODAY,
    );
    expect(result.ok).toBe(true);
  });

  it('blocks D-family holder when dCategoryIssueDate is missing', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'D',
        dCategoryIssueDate: null,
        hasPriorSpk: false,
      }),
      CourseType.PERIODIC,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.NO_LICENSE_DATA);
  });
});

describe('validateDriverEligibility — INITIAL_SHORTENED per-category experience', () => {
  it('uses cCategoryIssueDate (not license date) for C/CE experience', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'C',
        driverLicenseIssueDate: '2010-01-01',
        cCategoryIssueDate: '2025-01-01',
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.EXPERIENCE_INSUFFICIENT);
  });

  it('uses dCategoryIssueDate (not license date) for D/DE experience', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'D',
        driverLicenseIssueDate: '2010-01-01',
        dCategoryIssueDate: '2025-01-01',
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.EXPERIENCE_INSUFFICIENT);
  });

  it('requires cCategoryIssueDate (no fallback to driverLicenseIssueDate)', () => {
    const result = validateDriverEligibility(
      snapshot({
        driverLicenseCategories: 'C',
        driverLicenseIssueDate: '2018-01-01',
        cCategoryIssueDate: null,
      }),
      CourseType.INITIAL_SHORTENED,
      TODAY,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe(EligibilityFailReason.NO_LICENSE_DATA);
  });
});

describe('qualifiesForReducedProgram', () => {
  it('true for INITIAL when driver has prior SPK on other category', () => {
    expect(qualifiesForReducedProgram(true, CourseType.INITIAL)).toBe(true);
  });

  it('true for INITIAL_SHORTENED when driver has prior SPK on other category', () => {
    expect(qualifiesForReducedProgram(true, CourseType.INITIAL_SHORTENED)).toBe(
      true,
    );
  });

  it('false for PERIODIC even if driver has prior SPK', () => {
    expect(qualifiesForReducedProgram(true, CourseType.PERIODIC)).toBe(false);
  });

  it('false when driver has no prior SPK on other category', () => {
    expect(qualifiesForReducedProgram(false, CourseType.INITIAL)).toBe(false);
  });

  it('false when courseType is null', () => {
    expect(qualifiesForReducedProgram(true, null)).toBe(false);
  });
});
