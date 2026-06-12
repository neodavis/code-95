/** Milliseconds in the 48-hour window during which name/transliteration can be edited after eCard issuance */
export const NAME_EDIT_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Maximum file upload size in megabytes (photos, signatures) */
export const MAX_UPLOAD_SIZE_MB = 5;

/**
 * Maximum students per study group.
 * Наказ 789, Розділ II, п.5: ≤25 осіб у групі.
 */
export const MAX_GROUP_SIZE = 25;

/**
 * SPK validity period in years.
 * Наказ 789, Розділ II, п.27: «СППК … видаються строком на п'ять років.»
 */
export const SPK_VALIDITY_YEARS = 5;

/** CPC driving licence categories available for selection */
export const CPC_CATEGORIES = [
  'B',
  'BE',
  'C1',
  'C1E',
  'C',
  'CE',
  'D1',
  'D1E',
  'D',
  'DE',
  'T',
] as const;

export type CpcCategory = (typeof CPC_CATEGORIES)[number];
