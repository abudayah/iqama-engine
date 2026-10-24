/**
 * adhan-catalog.ts
 *
 * Generates the authoritative catalog of calculation methods and enum values
 * directly from the installed `adhan` library, so it can never drift from the
 * library's own defaults.
 */

import { CalculationMethod, Coordinates, HighLatitudeRule } from 'adhan';

export type CalculationMethodName =
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'MoonsightingCommittee'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey'
  | 'Other';

export type MadhabName = 'shafi' | 'hanafi';
export type HighLatitudeRuleName =
  | 'MiddleOfTheNight'
  | 'SeventhOfTheNight'
  | 'TwilightAngle';
export type RoundingName = 'Nearest' | 'Up' | 'None';
export type ShafaqName = 'General' | 'Ahmer' | 'Abyad';
export type PolarCircleResolutionName =
  | 'Unresolved'
  | 'AqrabBalad'
  | 'AqrabYaum';

export interface MethodAdjustments {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface MethodCatalogEntry {
  name: CalculationMethodName;
  label: string;
  description: string;
  fajrAngle: number;
  ishaAngle: number | null;
  ishaInterval: number | null; // minutes after Maghrib (UmmAlQura, Qatar)
  maghribAngle: number | null;
  methodAdjustments: MethodAdjustments;
  supportsShafaq: boolean; // only MoonsightingCommittee
}

export interface AdhanCatalog {
  methods: MethodCatalogEntry[];
  madhabValues: MadhabName[];
  highLatitudeRuleValues: HighLatitudeRuleName[];
  roundingValues: RoundingName[];
  shafaqValues: ShafaqName[];
  polarCircleResolutionValues: PolarCircleResolutionName[];
  recommendedHighLatitudeRule: (
    lat: number,
    lon: number,
  ) => HighLatitudeRuleName;
}

// Map adhan CalculationMethod factory names to metadata
const METHOD_META: Record<
  CalculationMethodName,
  { label: string; description: string }
> = {
  MuslimWorldLeague: {
    label: 'Muslim World League',
    description: 'Used in Europe, Far East, and parts of the US (18°/17°)',
  },
  Egyptian: {
    label: 'Egyptian General Survey',
    description: 'Used in Africa, Syria, Lebanon, Malaysia (19.5°/17.5°)',
  },
  Karachi: {
    label: 'University of Islamic Sciences, Karachi',
    description: 'Used in Pakistan, Bangladesh, India, Afghanistan (18°/18°)',
  },
  UmmAlQura: {
    label: 'Umm al-Qura University, Makkah',
    description:
      'Used in the Arabian Peninsula (18.5°, Isha 90 min after Maghrib)',
  },
  Dubai: {
    label: 'Dubai',
    description:
      'Dubai Islamic Affairs and Charitable Activities (18.2°/18.2°)',
  },
  MoonsightingCommittee: {
    label: 'Moonsighting Committee',
    description:
      'Moonsighting.com; uses shafaq for Isha. Appropriate for high latitudes.',
  },
  NorthAmerica: {
    label: 'ISNA (North America)',
    description:
      'Islamic Society of North America (15°/15°). Default for this masjid.',
  },
  Kuwait: {
    label: 'Kuwait',
    description: 'Used in Kuwait (18°/17.5°)',
  },
  Qatar: {
    label: 'Qatar',
    description: 'Used in Qatar (18°, Isha 90 min after Maghrib)',
  },
  Singapore: {
    label: 'Singapore',
    description: 'Majlis Ugama Islam Singapura (20°/18°)',
  },
  Tehran: {
    label: 'Tehran',
    description:
      'Institute of Geophysics, University of Tehran (17.7°/14°, Maghrib 4.5°)',
  },
  Turkey: {
    label: 'Turkey',
    description: 'Diyanet İşleri Başkanlığı (Turkey) (18°/17°)',
  },
  Other: {
    label: 'Custom',
    description: 'Manually specify Fajr and Isha angles',
  },
};

const ZERO_ADJ: MethodAdjustments = {
  fajr: 0,
  sunrise: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
};

function extractAdjustments(
  params: ReturnType<typeof CalculationMethod.NorthAmerica>,
): MethodAdjustments {
  const ma = params.methodAdjustments as Partial<MethodAdjustments> | undefined;
  if (!ma) return ZERO_ADJ;
  return {
    fajr: ma.fajr ?? 0,
    sunrise: ma.sunrise ?? 0,
    dhuhr: ma.dhuhr ?? 0,
    asr: ma.asr ?? 0,
    maghrib: ma.maghrib ?? 0,
    isha: ma.isha ?? 0,
  };
}

function buildEntry(
  name: CalculationMethodName,
  factory: () => ReturnType<typeof CalculationMethod.NorthAmerica>,
): MethodCatalogEntry {
  const params = factory();
  const meta = METHOD_META[name];
  return {
    name,
    label: meta.label,
    description: meta.description,
    fajrAngle: params.fajrAngle ?? 0,
    ishaAngle:
      params.ishaAngle !== undefined &&
      params.ishaAngle !== 0 &&
      params.ishaInterval === undefined
        ? params.ishaAngle
        : null,
    ishaInterval:
      (params as unknown as { ishaInterval?: number }).ishaInterval ?? null,
    maghribAngle:
      params.maghribAngle !== undefined && params.maghribAngle !== 0
        ? params.maghribAngle
        : null,
    methodAdjustments: extractAdjustments(params),
    supportsShafaq: name === 'MoonsightingCommittee',
  };
}

// Build the catalog from the actual adhan library factories
const METHODS: MethodCatalogEntry[] = [
  buildEntry('NorthAmerica', CalculationMethod.NorthAmerica),
  buildEntry('MuslimWorldLeague', CalculationMethod.MuslimWorldLeague),
  buildEntry('Egyptian', CalculationMethod.Egyptian),
  buildEntry('Karachi', CalculationMethod.Karachi),
  buildEntry('UmmAlQura', CalculationMethod.UmmAlQura),
  buildEntry('Dubai', CalculationMethod.Dubai),
  buildEntry('MoonsightingCommittee', CalculationMethod.MoonsightingCommittee),
  buildEntry('Kuwait', CalculationMethod.Kuwait),
  buildEntry('Qatar', CalculationMethod.Qatar),
  buildEntry('Singapore', CalculationMethod.Singapore),
  buildEntry('Tehran', CalculationMethod.Tehran),
  buildEntry('Turkey', CalculationMethod.Turkey),
  buildEntry('Other', () => CalculationMethod.Other()),
];

function recommendedHighLatitudeRule(
  lat: number,
  lon: number,
): HighLatitudeRuleName {
  const coords = new Coordinates(lat, lon);
  const rule = HighLatitudeRule.recommended(coords) as string;
  if (rule === 'middleofthenight') return 'MiddleOfTheNight';
  if (rule === 'twilightangle') return 'TwilightAngle';
  return 'SeventhOfTheNight'; // 'seventhofthenight' is the default
}

export const ADHAN_CATALOG: AdhanCatalog = {
  methods: METHODS,
  madhabValues: ['shafi', 'hanafi'],
  highLatitudeRuleValues: [
    'MiddleOfTheNight',
    'SeventhOfTheNight',
    'TwilightAngle',
  ],
  roundingValues: ['Nearest', 'Up', 'None'],
  shafaqValues: ['General', 'Ahmer', 'Abyad'],
  polarCircleResolutionValues: ['Unresolved', 'AqrabBalad', 'AqrabYaum'],
  recommendedHighLatitudeRule,
};

export function getMethodEntry(
  name: CalculationMethodName,
): MethodCatalogEntry {
  const entry = METHODS.find((m) => m.name === name);
  if (!entry) throw new Error(`Unknown calculation method: ${name}`);
  return entry;
}
