import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  // Masjid al-Hidayah, 2626 Kingsway Ave, Port Coquitlam, BC V3C 1T5
  masjidLatitude: parseFloat(process.env.MASJID_LATITUDE ?? '49.2652047'),
  masjidLongitude: parseFloat(process.env.MASJID_LONGITUDE ?? '-122.7878735'),
  masjidTimezone: process.env.MASJID_TIMEZONE ?? 'America/Vancouver',
  // legacy | shadow | db — which iqama rule engine builds the schedule.
  iqamaRules: process.env.IQAMA_RULES ?? 'legacy',
  // First date (a Friday) served by the DB rules; earlier dates keep legacy behaviour.
  iqamaRulesCutover: process.env.IQAMA_RULES_CUTOVER ?? '2026-11-13',
  databaseUrl: process.env.DATABASE_URL,
}));
