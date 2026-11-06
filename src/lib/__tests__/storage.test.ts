import { describe, it, expect } from 'vitest';
import { applyProfilePatch, DEFAULT_DRAWDOWN_CONFIG, migrateDrawdownConfig, migrateProfile } from '@/lib/storage';
import { UK_FIGURES } from '@/lib/uk-figures';

describe('migrateDrawdownConfig', () => {
  it('moves a saved plan off the removed RMD strategy', () => {
    expect(migrateDrawdownConfig({ strategy: 'rmd' }).strategy).toBe('percentage');
  });

  it('keeps a saved fixed strategy and its settings', () => {
    const config = migrateDrawdownConfig({ strategy: 'fixed', fixedAnnualIncome: 25_000 });
    expect(config.strategy).toBe('fixed');
    expect(config.fixedAnnualIncome).toBe(25_000);
  });

  it('moves the old 3% retirement return default to 2%', () => {
    expect(migrateDrawdownConfig({ drawdownReturnRate: 3 }).drawdownReturnRate).toBe(2);
  });

  it('keeps a different retirement return', () => {
    expect(migrateDrawdownConfig({ drawdownReturnRate: 1.5 }).drawdownReturnRate).toBe(1.5);
  });

  it('uses the defaults when nothing is saved', () => {
    expect(migrateDrawdownConfig(undefined)).toEqual(DEFAULT_DRAWDOWN_CONFIG);
  });
});

describe('migrateProfile', () => {
  const saved = { birthday: '1996-01-01', statePensionAmount: 221.2, statePensionAge: 67 };

  it('moves the old full rate default to the current rate', () => {
    expect(migrateProfile(saved).statePensionAmount).toBe(UK_FIGURES.fullStatePensionWeekly);
  });

  it('keeps a state pension amount the person entered', () => {
    expect(migrateProfile({ ...saved, statePensionAmount: 180 }).statePensionAmount).toBe(180);
  });

  it('corrects the old default age from the birthday', () => {
    expect(migrateProfile(saved).statePensionAge).toBe(68);
  });

  it('treats an age that differs from the old default as an override', () => {
    const profile = migrateProfile({ ...saved, statePensionAge: 70 });
    expect(profile.statePensionAge).toBe(70);
    expect(profile.statePensionAgeOverridden).toBe(true);
  });

  it('keeps an override across reloads, even at the old default age', () => {
    const profile = migrateProfile({ ...saved, statePensionAge: 67, statePensionAgeOverridden: true });
    expect(profile.statePensionAge).toBe(67);
  });
});

describe('applyProfilePatch', () => {
  const profile = migrateProfile({ birthday: '1996-01-01' });

  it('follows a new birthday when the age is not overridden', () => {
    expect(applyProfilePatch(profile, { birthday: '1970-01-01' }).statePensionAge).toBe(67);
  });

  it('marks a typed age as an override, which a new birthday then leaves alone', () => {
    const overridden = applyProfilePatch(profile, { statePensionAge: 70 });
    expect(overridden.statePensionAgeOverridden).toBe(true);
    expect(applyProfilePatch(overridden, { birthday: '1970-01-01' }).statePensionAge).toBe(70);
  });

  it('goes back to the birthday when the override is cleared', () => {
    const overridden = applyProfilePatch(profile, { statePensionAge: 70 });
    expect(applyProfilePatch(overridden, { statePensionAgeOverridden: false }).statePensionAge).toBe(68);
  });
});
