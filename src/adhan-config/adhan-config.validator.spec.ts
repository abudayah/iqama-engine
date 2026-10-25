import {
  validateAdhanSettings,
  validatePartialAdhanSettings,
  validatePeriodDates,
} from './adhan-config.validator';
import type { AdhanSettings, PartialAdhanSettings } from './adhan-config.types';

const VALID_BASE: AdhanSettings = {
  general: {
    method: 'NorthAmerica',
    madhab: 'shafi',
    highLatitudeRule: 'TwilightAngle',
    polarCircleResolution: 'Unresolved',
    rounding: 'Nearest',
  },
  prayers: {},
};

describe('validateAdhanSettings', () => {
  it('accepts valid base settings', () => {
    const result = validateAdhanSettings(VALID_BASE);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects an unknown method', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      general: { ...VALID_BASE.general, method: 'Bogus' as never },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'general.method')).toBe(true);
  });

  it('rejects an unknown madhab', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      general: { ...VALID_BASE.general, madhab: 'maliki' as never },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(false);
  });

  it('rejects shafaq when method is not MoonsightingCommittee', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      general: { ...VALID_BASE.general, shafaq: 'Ahmer' },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.field === 'general.shafaq')).toBe(true);
  });

  it('allows shafaq when method is MoonsightingCommittee', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      general: {
        ...VALID_BASE.general,
        method: 'MoonsightingCommittee',
        shafaq: 'General',
      },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('rejects fajrAngle out of range', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      prayers: { fajr: { fajrAngle: 5 } },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(false);
  });

  it('rejects ishaAngle and ishaInterval together', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      prayers: { isha: { ishaAngle: 15, ishaInterval: 90 } },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(false);
  });

  it('rejects offsetMinutes above hard limit', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      prayers: { fajr: { offsetMinutes: 90 } },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(false);
  });

  it('warns when offsetMinutes exceeds soft limit', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      prayers: { fajr: { offsetMinutes: 15 } },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(true); // only a warning, not an error
    expect(result.issues.some((i) => i.severity === 'warning')).toBe(true);
  });

  it('accepts a valid offset within soft limit', () => {
    const settings: AdhanSettings = {
      ...VALID_BASE,
      prayers: { maghrib: { offsetMinutes: 5 } },
    };
    const result = validateAdhanSettings(settings);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});

describe('validatePartialAdhanSettings', () => {
  it('accepts a valid partial settings', () => {
    const settings: PartialAdhanSettings = {
      prayers: { isha: { offsetMinutes: -6 } },
    };
    const result = validatePartialAdhanSettings(settings);
    expect(result.valid).toBe(true);
  });

  it('rejects empty settings (no general, no prayers)', () => {
    const result = validatePartialAdhanSettings({});
    expect(result.valid).toBe(false);
  });

  it('rejects an invalid method in partial general', () => {
    const settings: PartialAdhanSettings = {
      general: { method: 'Fake' as never },
    };
    const result = validatePartialAdhanSettings(settings);
    expect(result.valid).toBe(false);
  });
});

describe('validatePeriodDates', () => {
  it('accepts a valid date range', () => {
    const issues = validatePeriodDates('2025-03-01', '2025-03-31');
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('accepts a single-day range', () => {
    const issues = validatePeriodDates('2025-06-15', '2025-06-15');
    expect(issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('rejects endDate before startDate', () => {
    const issues = validatePeriodDates('2025-06-15', '2025-06-01');
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('rejects invalid date format', () => {
    const issues = validatePeriodDates('15/06/2025', '2025-06-30');
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('warns for a range over one year', () => {
    const issues = validatePeriodDates('2025-01-01', '2026-06-01');
    expect(issues.some((i) => i.severity === 'warning')).toBe(true);
  });
});
