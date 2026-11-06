/**
 * The one place for UK tax and state pension figures, for England, Wales and
 * Northern Ireland. Update these together each tax year, along with the dates.
 */
export const UK_FIGURES = {
  taxYear: '2026/27',
  /** The last day these figures apply, 5 April 2027 */
  taxYearEnd: { year: 2027, monthIndex: 3, day: 5 },

  personalAllowance: 12_570,
  /** The allowance falls by £1 for every £2 of income above this */
  personalAllowanceTaperStart: 100_000,
  /** Total income where the higher rate starts, with the full allowance */
  higherRateThreshold: 50_270,
  /** Taxable income where the additional rate starts */
  additionalRateThreshold: 125_140,
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,

  capitalGainsAllowance: 3_000,
  capitalGainsBasicRate: 0.18,
  capitalGainsHigherRate: 0.24,

  /** Maximum tax-free pension cash across all pensions, without protection */
  lumpSumAllowance: 268_275,
  pensionTaxFreeShare: 0.25,
  /** Minimum age to access private pensions. Applies from 6 April 2028; 55 until then */
  pensionAccessAge: 57,

  fullStatePensionWeekly: 241.3,
} as const;

/** Taxable income covered by the basic rate, after the personal allowance */
export const BASIC_RATE_BAND = UK_FIGURES.higherRateThreshold - UK_FIGURES.personalAllowance;

export const PRIVATE_PENSION_ACCESS_AGE = UK_FIGURES.pensionAccessAge;

/**
 * State pension age in whole years. Those reaching it in stepped months or dates
 * (born 6 April 1960 to 5 March 1961, and 6 April 1977 to 5 April 1978) round up,
 * so the income never starts earlier than it really would.
 */
export function getStatePensionAge(birthday: string): number {
  if (birthday >= '1977-04-06') return 68;
  if (birthday >= '1960-04-06') return 67;
  return 66;
}

export interface TaxYearStatus {
  taxYear: string;
  hasEnded: boolean;
}

export function getTaxYearStatus(today: Date = new Date()): TaxYearStatus {
  const { year, monthIndex, day } = UK_FIGURES.taxYearEnd;
  return {
    taxYear: UK_FIGURES.taxYear,
    hasEnded: today >= new Date(year, monthIndex, day + 1),
  };
}
