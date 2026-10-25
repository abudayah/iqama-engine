"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADHAN_CATALOG = void 0;
exports.getMethodEntry = getMethodEntry;
const adhan_1 = require("adhan");
const METHOD_META = {
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
        description: 'Used in the Arabian Peninsula (18.5°, Isha 90 min after Maghrib)',
    },
    Dubai: {
        label: 'Dubai',
        description: 'Dubai Islamic Affairs and Charitable Activities (18.2°/18.2°)',
    },
    MoonsightingCommittee: {
        label: 'Moonsighting Committee',
        description: 'Moonsighting.com; uses shafaq for Isha. Appropriate for high latitudes.',
    },
    NorthAmerica: {
        label: 'ISNA (North America)',
        description: 'Islamic Society of North America (15°/15°). Default for this masjid.',
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
        description: 'Institute of Geophysics, University of Tehran (17.7°/14°, Maghrib 4.5°)',
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
const ZERO_ADJ = {
    fajr: 0,
    sunrise: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
};
function extractAdjustments(params) {
    const ma = params.methodAdjustments;
    if (!ma)
        return ZERO_ADJ;
    return {
        fajr: ma.fajr ?? 0,
        sunrise: ma.sunrise ?? 0,
        dhuhr: ma.dhuhr ?? 0,
        asr: ma.asr ?? 0,
        maghrib: ma.maghrib ?? 0,
        isha: ma.isha ?? 0,
    };
}
function buildEntry(name, factory) {
    const params = factory();
    const meta = METHOD_META[name];
    return {
        name,
        label: meta.label,
        description: meta.description,
        fajrAngle: params.fajrAngle ?? 0,
        ishaAngle: params.ishaAngle !== undefined &&
            params.ishaAngle !== 0 &&
            !params.ishaInterval
            ? params.ishaAngle
            : null,
        ishaInterval: params.ishaInterval || null,
        maghribAngle: params.maghribAngle !== undefined && params.maghribAngle !== 0
            ? params.maghribAngle
            : null,
        methodAdjustments: extractAdjustments(params),
        supportsShafaq: name === 'MoonsightingCommittee',
    };
}
const METHODS = [
    buildEntry('NorthAmerica', adhan_1.CalculationMethod.NorthAmerica),
    buildEntry('MuslimWorldLeague', adhan_1.CalculationMethod.MuslimWorldLeague),
    buildEntry('Egyptian', adhan_1.CalculationMethod.Egyptian),
    buildEntry('Karachi', adhan_1.CalculationMethod.Karachi),
    buildEntry('UmmAlQura', adhan_1.CalculationMethod.UmmAlQura),
    buildEntry('Dubai', adhan_1.CalculationMethod.Dubai),
    buildEntry('MoonsightingCommittee', adhan_1.CalculationMethod.MoonsightingCommittee),
    buildEntry('Kuwait', adhan_1.CalculationMethod.Kuwait),
    buildEntry('Qatar', adhan_1.CalculationMethod.Qatar),
    buildEntry('Singapore', adhan_1.CalculationMethod.Singapore),
    buildEntry('Tehran', adhan_1.CalculationMethod.Tehran),
    buildEntry('Turkey', adhan_1.CalculationMethod.Turkey),
    buildEntry('Other', () => adhan_1.CalculationMethod.Other()),
];
function recommendedHighLatitudeRule(lat, lon) {
    const coords = new adhan_1.Coordinates(lat, lon);
    const rule = adhan_1.HighLatitudeRule.recommended(coords);
    if (rule === 'middleofthenight')
        return 'MiddleOfTheNight';
    if (rule === 'twilightangle')
        return 'TwilightAngle';
    return 'SeventhOfTheNight';
}
exports.ADHAN_CATALOG = {
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
function getMethodEntry(name) {
    const entry = METHODS.find((m) => m.name === name);
    if (!entry)
        throw new Error(`Unknown calculation method: ${name}`);
    return entry;
}
//# sourceMappingURL=adhan-catalog.js.map