import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Coordinates,
  CalculationMethod,
  CalculationParameters,
  PrayerTimes,
  Madhab,
  HighLatitudeRule,
  Rounding,
  Shafaq,
  PolarCircleResolution,
} from 'adhan';
import { Dayjs } from 'dayjs';
import dayjs from '../dayjs';
import type {
  ResolvedAdhanSettings,
  ResolvedPrayerParams,
  PrayerKey,
} from '../adhan-config/adhan-config.types';
import type { CalculationMethodName } from '../adhan-config/adhan-catalog';

export interface RawPrayerTimes {
  fajr: Dayjs;
  sunrise: Dayjs;
  dhuhr: Dayjs;
  asr: Dayjs;
  maghrib: Dayjs;
  isha: Dayjs;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function toAdhanMadhab(
  m: 'shafi' | 'hanafi',
): (typeof Madhab)[keyof typeof Madhab] {
  return m === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
}

function toAdhanHighLatitudeRule(
  r: ResolvedPrayerParams['highLatitudeRule'],
): (typeof HighLatitudeRule)[keyof typeof HighLatitudeRule] {
  switch (r) {
    case 'MiddleOfTheNight':
      return HighLatitudeRule.MiddleOfTheNight;
    case 'TwilightAngle':
      return HighLatitudeRule.TwilightAngle;
    default:
      return HighLatitudeRule.SeventhOfTheNight;
  }
}

function toAdhanRounding(
  r: ResolvedPrayerParams['rounding'],
): (typeof Rounding)[keyof typeof Rounding] {
  switch (r) {
    case 'Up':
      return Rounding.Up;
    case 'None':
      return Rounding.None;
    default:
      return Rounding.Nearest;
  }
}

function toAdhanShafaq(
  s: ResolvedPrayerParams['shafaq'],
): (typeof Shafaq)[keyof typeof Shafaq] {
  switch (s) {
    case 'Ahmer':
      return Shafaq.Ahmer;
    case 'Abyad':
      return Shafaq.Abyad;
    default:
      return Shafaq.General;
  }
}

function toAdhanPolarCircle(
  p: ResolvedPrayerParams['polarCircleResolution'],
): (typeof PolarCircleResolution)[keyof typeof PolarCircleResolution] {
  switch (p) {
    case 'AqrabBalad':
      return PolarCircleResolution.AqrabBalad;
    case 'AqrabYaum':
      return PolarCircleResolution.AqrabYaum;
    default:
      return PolarCircleResolution.Unresolved;
  }
}

function buildParams(
  method: CalculationMethodName,
  params: ResolvedPrayerParams,
): CalculationParameters {
  let cp: CalculationParameters;
  switch (method) {
    case 'MuslimWorldLeague':
      cp = CalculationMethod.MuslimWorldLeague();
      break;
    case 'Egyptian':
      cp = CalculationMethod.Egyptian();
      break;
    case 'Karachi':
      cp = CalculationMethod.Karachi();
      break;
    case 'UmmAlQura':
      cp = CalculationMethod.UmmAlQura();
      break;
    case 'Dubai':
      cp = CalculationMethod.Dubai();
      break;
    case 'MoonsightingCommittee':
      cp = CalculationMethod.MoonsightingCommittee();
      break;
    case 'Kuwait':
      cp = CalculationMethod.Kuwait();
      break;
    case 'Qatar':
      cp = CalculationMethod.Qatar();
      break;
    case 'Singapore':
      cp = CalculationMethod.Singapore();
      break;
    case 'Tehran':
      cp = CalculationMethod.Tehran();
      break;
    case 'Turkey':
      cp = CalculationMethod.Turkey();
      break;
    case 'NorthAmerica':
      cp = CalculationMethod.NorthAmerica();
      break;
    default:
      cp = CalculationMethod.Other();
      break;
  }

  // Override angles if explicitly specified in per-prayer settings
  if (params.fajrAngle !== undefined) cp.fajrAngle = params.fajrAngle;
  if (params.ishaAngle !== null) cp.ishaAngle = params.ishaAngle;
  if (params.ishaInterval !== null) {
    (cp as unknown as { ishaInterval: number }).ishaInterval =
      params.ishaInterval;
  }
  if (params.maghribAngle !== null) cp.maghribAngle = params.maghribAngle;

  cp.madhab = toAdhanMadhab(params.madhab);
  cp.highLatitudeRule = toAdhanHighLatitudeRule(params.highLatitudeRule);
  cp.rounding = toAdhanRounding(params.rounding);
  cp.polarCircleResolution = toAdhanPolarCircle(params.polarCircleResolution);
  if (params.shafaq !== undefined) cp.shafaq = toAdhanShafaq(params.shafaq);

  // User offsets (adjustments) — NOT methodAdjustments
  if (params.offsetMinutes !== 0) {
    const prayerToAdjKey: Record<PrayerKey, keyof typeof cp.adjustments> = {
      fajr: 'fajr',
      sunrise: 'sunrise',
      dhuhr: 'dhuhr',
      asr: 'asr',
      maghrib: 'maghrib',
      isha: 'isha',
    };
    const adjKey = prayerToAdjKey[params.prayer];
    if (adjKey) {
      cp.adjustments[adjKey] = params.offsetMinutes;
    }
  }

  return cp;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdhanAdapter {
  private readonly latitude: number;
  private readonly longitude: number;
  private readonly timezone: string;

  constructor(private readonly configService: ConfigService) {
    this.latitude = this.configService.get<number>('app.masjidLatitude')!;
    this.longitude = this.configService.get<number>('app.masjidLongitude')!;
    this.timezone = this.configService.get<string>('app.masjidTimezone')!;
  }

  /**
   * Compute prayer times for a given date using hardcoded defaults.
   * Used as a fallback before the AdhanConfig feature is seeded,
   * and by the weekly context builder within ScheduleBuilderService.
   *
   * This preserves the exact same behaviour as before the Adhan Config feature:
   * ISNA + Shafi + TwilightAngle + seasonal Isha -6 offset for May–Jul.
   */
  getPrayerTimes(date: Date): RawPrayerTimes {
    const coordinates = new Coordinates(this.latitude, this.longitude);
    const params = CalculationMethod.NorthAmerica();
    params.madhab = Madhab.Shafi;

    const month = date.getMonth() + 1;
    if (month >= 5 && month <= 7) {
      params.methodAdjustments.isha = -6;
    }

    params.highLatitudeRule = HighLatitudeRule.TwilightAngle;

    const pt = new PrayerTimes(coordinates, date, params);
    return this._toRaw(pt);
  }

  /**
   * Compute prayer times for a given date using resolved Adhan config settings.
   * Supports per-prayer method overrides by grouping prayers with identical
   * CalculationParameters and running one PrayerTimes call per group.
   */
  getPrayerTimesFromConfig(
    date: Date,
    resolved: ResolvedAdhanSettings,
  ): RawPrayerTimes {
    const coordinates = new Coordinates(this.latitude, this.longitude);
    const prayers: PrayerKey[] = [
      'fajr',
      'sunrise',
      'dhuhr',
      'asr',
      'maghrib',
      'isha',
    ];

    // Group prayers by their CalculationParameters signature to minimise calls
    const groups = new Map<
      string,
      { params: CalculationParameters; keys: PrayerKey[] }
    >();
    for (const prayer of prayers) {
      const rp = resolved.perPrayer[prayer];
      const key = JSON.stringify({
        method: rp.method,
        fajrAngle: rp.fajrAngle,
        ishaAngle: rp.ishaAngle,
        ishaInterval: rp.ishaInterval,
        maghribAngle: rp.maghribAngle,
        // Include prayer name in the key when offset is non-zero so that two
        // prayers with the same offset value never share a CalculationParameters
        // group — the offset is applied to a specific prayer's adjustment slot.
        prayer: rp.offsetMinutes !== 0 ? rp.prayer : undefined,
        offsetMinutes: rp.offsetMinutes,
        madhab: rp.madhab,
        highLatitudeRule: rp.highLatitudeRule,
        polarCircleResolution: rp.polarCircleResolution,
        rounding: rp.rounding,
        shafaq: rp.shafaq,
      });
      if (!groups.has(key)) {
        groups.set(key, { params: buildParams(rp.method, rp), keys: [] });
      }
      groups.get(key)!.keys.push(prayer);
    }

    // Collect results per prayer
    const result: Partial<Record<PrayerKey, Dayjs>> = {};

    for (const { params, keys } of groups.values()) {
      const pt = new PrayerTimes(coordinates, date, params);
      const raw = this._toRaw(pt);
      for (const k of keys) {
        result[k] = raw[k];
      }
    }

    return result as RawPrayerTimes;
  }

  private _toRaw(pt: PrayerTimes): RawPrayerTimes {
    return {
      fajr: dayjs(pt.fajr).tz(this.timezone),
      sunrise: dayjs(pt.sunrise).tz(this.timezone),
      dhuhr: dayjs(pt.dhuhr).tz(this.timezone),
      asr: dayjs(pt.asr).tz(this.timezone),
      maghrib: dayjs(pt.maghrib).tz(this.timezone),
      isha: dayjs(pt.isha).tz(this.timezone),
    };
  }
}
