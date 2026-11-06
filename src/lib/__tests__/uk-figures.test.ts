import { describe, it, expect } from 'vitest';
import { getStatePensionAge, getTaxYearStatus } from '@/lib/uk-figures';

describe('getTaxYearStatus', () => {
  it('names the tax year while its rules still apply', () => {
    expect(getTaxYearStatus(new Date('2026-11-06'))).toEqual({ taxYear: '2026/27', hasEnded: false });
  });

  it('still applies on the last day of the tax year', () => {
    expect(getTaxYearStatus(new Date(2027, 3, 5, 23, 59)).hasEnded).toBe(false);
  });

  it('has ended from the first day of the next tax year', () => {
    expect(getTaxYearStatus(new Date(2027, 3, 6)).hasEnded).toBe(true);
  });
});

describe('getStatePensionAge', () => {
  it.each([
    ['1996-01-01', 68],
    ['1978-04-06', 68],
    ['1977-04-06', 68],
    ['1977-04-05', 67],
    ['1961-03-06', 67],
    ['1960-04-06', 67],
    ['1960-04-05', 66],
  ])('for a birthday of %s is %i', (birthday, age) => {
    expect(getStatePensionAge(birthday)).toBe(age);
  });
});
