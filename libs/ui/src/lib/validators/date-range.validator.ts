import {
  type AbstractControl,
  type ValidationErrors,
  type ValidatorFn,
} from '@angular/forms';

export const DATE_RANGE_MIN = '1900-01-01';
export const DATE_RANGE_MAX = '2100-12-31';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a `YYYY-MM-DD` control value against a sane calendar range so
 * typos like `3438-04-23` are caught before they reach the API. Empty values
 * pass — combine with `Validators.required` where the field is mandatory.
 */
export function dateRangeValidator(
  min: string = DATE_RANGE_MIN,
  max: string = DATE_RANGE_MAX,
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    const iso = String(value).substring(0, 10);
    if (!DATE_ONLY_RE.test(iso) || iso < min || iso > max) {
      return { dateRange: { min, max, actual: iso } };
    }
    return null;
  };
}
