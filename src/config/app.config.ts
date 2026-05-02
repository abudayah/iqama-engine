import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  // Masjid al-Hidayah, 2626 Kingsway Ave, Port Coquitlam, BC V3C 1T5
  masjidLatitude: parseFloat(process.env.MASJID_LATITUDE ?? '49.2652047'),
  masjidLongitude: parseFloat(process.env.MASJID_LONGITUDE ?? '-122.7878735'),
  masjidTimezone: process.env.MASJID_TIMEZONE ?? 'America/Vancouver',
  databaseUrl: process.env.DATABASE_URL,
}));
