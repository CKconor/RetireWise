import type { AccountType } from '@/types';

/** Minimum age to access private pensions (SIPP / workplace) in the UK */
export const PRIVATE_PENSION_ACCESS_AGE = 57;

/** Solid colour for each account type, used for chart series and table dots */
export const ACCOUNT_TYPE_CHART_COLORS: Record<AccountType, string> = {
  isa: 'var(--isa-9)',
  sipp: 'var(--sipp-9)',
  pension: 'var(--pension-9)',
  gia: 'var(--gia-9)',
  savings: 'var(--savings-9)',
};
