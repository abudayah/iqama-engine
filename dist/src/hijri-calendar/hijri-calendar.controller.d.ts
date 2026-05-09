import { CalendarOverrideService } from './calendar-override.service';
import { QiyamConfigService } from './qiyam-config.service';
import { SubmitOverrideDto } from './dto/submit-override.dto';
import { HijriCalendarStatusDto } from './dto/hijri-calendar-status.dto';
import { EidPrayerRecordDto } from './dto/eid-prayer-record.dto';
import { QiyamConfigDto } from './dto/qiyam-config.dto';
export declare class HijriCalendarController {
    private readonly calendarOverrideService;
    private readonly qiyamConfigService;
    constructor(calendarOverrideService: CalendarOverrideService, qiyamConfigService: QiyamConfigService);
    getStatus(): Promise<HijriCalendarStatusDto>;
    submitOverride(dto: SubmitOverrideDto): Promise<void>;
    deleteOverride(): Promise<void>;
    getEidPrayers(date?: string, admin?: string): Promise<EidPrayerRecordDto[]>;
    getQiyamConfig(): Promise<{
        hijri_year: number;
        start_time: string;
    } | null>;
    saveQiyamConfig(dto: QiyamConfigDto): Promise<void>;
}
