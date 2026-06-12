import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

export const DATE_ONLY_MIN = '1900-01-01';
export const DATE_ONLY_MAX = '2100-12-31';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Strict calendar-date check for DATE columns: `YYYY-MM-DD`, a real calendar
 * day (no 2026-02-31), bounded to [1900-01-01, 2100-12-31] so typos like
 * `3438-04-23` are rejected at the API boundary.
 */
export function isDateOnly(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_ONLY_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return false;
  }
  return value >= DATE_ONLY_MIN && value <= DATE_ONLY_MAX;
}

export function IsDateOnly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateOnly',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => isDateOnly(value),
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be a calendar date in YYYY-MM-DD format between ${DATE_ONLY_MIN} and ${DATE_ONLY_MAX}`,
      },
    });
  };
}
