export type CalculationMethodName = 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' | 'Dubai' | 'MoonsightingCommittee' | 'NorthAmerica' | 'Kuwait' | 'Qatar' | 'Singapore' | 'Tehran' | 'Turkey' | 'Other';
export type MadhabName = 'shafi' | 'hanafi';
export type HighLatitudeRuleName = 'MiddleOfTheNight' | 'SeventhOfTheNight' | 'TwilightAngle';
export type RoundingName = 'Nearest' | 'Up' | 'None';
export type ShafaqName = 'General' | 'Ahmer' | 'Abyad';
export type PolarCircleResolutionName = 'Unresolved' | 'AqrabBalad' | 'AqrabYaum';
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
    ishaInterval: number | null;
    maghribAngle: number | null;
    methodAdjustments: MethodAdjustments;
    supportsShafaq: boolean;
}
export interface AdhanCatalog {
    methods: MethodCatalogEntry[];
    madhabValues: MadhabName[];
    highLatitudeRuleValues: HighLatitudeRuleName[];
    roundingValues: RoundingName[];
    shafaqValues: ShafaqName[];
    polarCircleResolutionValues: PolarCircleResolutionName[];
    recommendedHighLatitudeRule: (lat: number, lon: number) => HighLatitudeRuleName;
}
export declare const ADHAN_CATALOG: AdhanCatalog;
export declare function getMethodEntry(name: CalculationMethodName): MethodCatalogEntry;
