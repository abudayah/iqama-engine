export declare class EidPrayerEntryDto {
    label: string;
    time: string;
}
export declare class EidConfigDto {
    type: 'EID_AL_FITR' | 'EID_AL_ADHA';
    date: string;
    prayers: EidPrayerEntryDto[];
}
export declare class SubmitOverrideDto {
    hijriYear: number;
    hijriMonth: number;
    length: 29 | 30;
    eidConfig?: EidConfigDto;
}
