import { isDateOnly } from './is-date-only.validator';

describe('isDateOnly', () => {
  it('accepts a valid calendar date', () => {
    expect(isDateOnly('2026-06-11')).toBe(true);
  });

  it('accepts the range boundaries', () => {
    expect(isDateOnly('1900-01-01')).toBe(true);
    expect(isDateOnly('2100-12-31')).toBe(true);
  });

  it('rejects out-of-range years (e.g. 3438 typo)', () => {
    expect(isDateOnly('3438-04-23')).toBe(false);
    expect(isDateOnly('1899-12-31')).toBe(false);
    expect(isDateOnly('2101-01-01')).toBe(false);
  });

  it('rejects impossible calendar days', () => {
    expect(isDateOnly('2026-02-31')).toBe(false);
    expect(isDateOnly('2026-13-01')).toBe(false);
    expect(isDateOnly('2026-00-10')).toBe(false);
  });

  it('rejects non date-only formats', () => {
    expect(isDateOnly('2026-06-11T00:00:00Z')).toBe(false);
    expect(isDateOnly('11.06.2026')).toBe(false);
    expect(isDateOnly('2026-6-1')).toBe(false);
    expect(isDateOnly('')).toBe(false);
    expect(isDateOnly(null)).toBe(false);
    expect(isDateOnly(20260611)).toBe(false);
  });

  it('accepts leap-day only in leap years', () => {
    expect(isDateOnly('2024-02-29')).toBe(true);
    expect(isDateOnly('2025-02-29')).toBe(false);
  });
});
