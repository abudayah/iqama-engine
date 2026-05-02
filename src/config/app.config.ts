import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  masjidLatitude: parseFloat(process.env.MASJID_LATITUDE ?? '49.2514'),
  masjidLongitude: parseFloat(process.env.MASJID_LONGITUDE ?? '-122.7740'),
  masjidTimezone: process.env.MASJID_TIMEZONE ?? 'America/Vancouver',
  databaseUrl: process.env.DATABASE_URL,
}));
