import { appConfig } from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should use default values when environment variables are not set', () => {
    delete process.env.MASJID_LATITUDE;
    delete process.env.MASJID_LONGITUDE;
    delete process.env.MASJID_TIMEZONE;
    delete process.env.DATABASE_URL;

    const config = appConfig();

    expect(config.masjidLatitude).toBe(49.2652047);
    expect(config.masjidLongitude).toBe(-122.7878735);
    expect(config.masjidTimezone).toBe('America/Vancouver');
    expect(config.databaseUrl).toBeUndefined();
  });

  it('should use environment variables when set', () => {
    process.env.MASJID_LATITUDE = '40.7128';
    process.env.MASJID_LONGITUDE = '-74.0060';
    process.env.MASJID_TIMEZONE = 'America/New_York';
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/test';

    const config = appConfig();

    expect(config.masjidLatitude).toBe(40.7128);
    expect(config.masjidLongitude).toBe(-74.006);
    expect(config.masjidTimezone).toBe('America/New_York');
    expect(config.databaseUrl).toBe('mysql://user:pass@localhost:3306/test');
  });

  it('should parse latitude and longitude as floats', () => {
    process.env.MASJID_LATITUDE = '51.5074';
    process.env.MASJID_LONGITUDE = '-0.1278';

    const config = appConfig();

    expect(typeof config.masjidLatitude).toBe('number');
    expect(typeof config.masjidLongitude).toBe('number');
    expect(config.masjidLatitude).toBe(51.5074);
    expect(config.masjidLongitude).toBe(-0.1278);
  });

  it('should handle negative coordinates', () => {
    process.env.MASJID_LATITUDE = '-33.8688';
    process.env.MASJID_LONGITUDE = '151.2093';

    const config = appConfig();

    expect(config.masjidLatitude).toBe(-33.8688);
    expect(config.masjidLongitude).toBe(151.2093);
  });
});
