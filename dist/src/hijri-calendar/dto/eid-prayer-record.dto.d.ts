export declare class EidPrayerEntryDto {
    label: string;
    time: string;
}
export declare class EidPrayerRecordDto {
    type: 'EID_AL_FITR' | 'EID_AL_ADHA';
    date: string;
    prayers: EidPrayerEntryDto[];
    source: 'override' | 'astronomical';
}
