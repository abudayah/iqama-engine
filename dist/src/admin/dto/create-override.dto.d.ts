export declare class CreateOverrideDto {
    prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    overrideType: 'FIXED' | 'OFFSET';
    value: string;
    startDate: string;
    endDate: string;
}
