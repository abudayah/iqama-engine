import { ADHAN_CATALOG, getMethodEntry } from './adhan-catalog';

describe('AdhanCatalog', () => {
  describe('ADHAN_CATALOG.methods', () => {
    it('includes NorthAmerica (ISNA) as the first entry', () => {
      expect(ADHAN_CATALOG.methods[0].name).toBe('NorthAmerica');
    });

    it('every method has a non-empty label and description', () => {
      for (const m of ADHAN_CATALOG.methods) {
        expect(m.label.length).toBeGreaterThan(0);
        expect(m.description.length).toBeGreaterThan(0);
      }
    });

    it('NorthAmerica has fajrAngle 15 and ishaAngle 15', () => {
      const isna = getMethodEntry('NorthAmerica');
      expect(isna.fajrAngle).toBe(15);
      expect(isna.ishaAngle).toBe(15);
      expect(isna.ishaInterval).toBeNull();
    });

    it('UmmAlQura has an ishaInterval and null ishaAngle', () => {
      const umm = getMethodEntry('UmmAlQura');
      expect(umm.ishaInterval).not.toBeNull();
      expect(umm.ishaAngle).toBeNull();
    });

    it('MoonsightingCommittee is the only method with supportsShafaq=true', () => {
      for (const m of ADHAN_CATALOG.methods) {
        if (m.name === 'MoonsightingCommittee') {
          expect(m.supportsShafaq).toBe(true);
        } else {
          expect(m.supportsShafaq).toBe(false);
        }
      }
    });
  });

  describe('getMethodEntry', () => {
    it('returns the correct entry for a known method', () => {
      const entry = getMethodEntry('Egyptian');
      expect(entry.name).toBe('Egyptian');
    });

    it('throws for an unknown method name', () => {
      expect(() => getMethodEntry('Unknown' as never)).toThrow(
        'Unknown calculation method: Unknown',
      );
    });
  });

  describe('recommendedHighLatitudeRule', () => {
    it('returns SeventhOfTheNight for Port Coquitlam (~49.3°N)', () => {
      const rule = ADHAN_CATALOG.recommendedHighLatitudeRule(
        49.2652,
        -122.7879,
      );
      expect(rule).toBe('SeventhOfTheNight');
    });

    it('returns a valid rule name for equatorial coordinates', () => {
      const rule = ADHAN_CATALOG.recommendedHighLatitudeRule(1.3, 103.8);
      expect([
        'MiddleOfTheNight',
        'SeventhOfTheNight',
        'TwilightAngle',
      ]).toContain(rule);
    });
  });

  describe('enum value arrays', () => {
    it('contains expected madhab values', () => {
      expect(ADHAN_CATALOG.madhabValues).toEqual(['shafi', 'hanafi']);
    });

    it('contains all three high-latitude rules', () => {
      expect(ADHAN_CATALOG.highLatitudeRuleValues).toHaveLength(3);
    });

    it('contains all rounding values', () => {
      expect(ADHAN_CATALOG.roundingValues).toContain('Nearest');
      expect(ADHAN_CATALOG.roundingValues).toContain('Up');
      expect(ADHAN_CATALOG.roundingValues).toContain('None');
    });
  });
});
