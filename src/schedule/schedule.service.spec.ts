import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { DailySchedule } from './daily-schedule.interface';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let scheduleBuilder: jest.Mocked<ScheduleBuilderService>;

  const mockSchedule: DailySchedule = {
    date: '2026-06-15',
    hijri_date: 'Thul-Hijjah 20, 1447',
    day_of_week: 'Monday',
    is_dst: true,
    fajr: { azan: '03:00', iqama: '04:15' },
    sunrise: '05:30',
    dhuhr: { azan: '13:15', iqama: '13:45' },
    asr: { azan: '17:30', iqama: '18:00' },
    maghrib: { azan: '21:00', iqama: '21:05' },
    isha: { azan: '22:45', iqama: '23:00' },
    metadata: {
      calculation_method: 'ISNA',
      has_overrides: false,
    },
  };

  beforeEach(async () => {
    const mockScheduleBuilder = {
      getMonth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: ScheduleBuilderService, useValue: mockScheduleBuilder },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    scheduleBuilder = module.get(ScheduleBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getScheduleForDate', () => {
    it('should return schedule for a specific date', async () => {
      const date = '2026-06-15';
      const monthSchedules = [
        { ...mockSchedule, date: '2026-06-01' },
        { ...mockSchedule, date: '2026-06-15' },
        { ...mockSchedule, date: '2026-06-30' },
      ];

      scheduleBuilder.getMonth.mockResolvedValue(monthSchedules);

      const result = await service.getScheduleForDate(date);

      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-06');
      expect(result.date).toBe('2026-06-15');
    });

    it('should throw NotFoundException when date not found', async () => {
      const date = '2026-06-15';
      const monthSchedules = [
        { ...mockSchedule, date: '2026-06-01' },
        { ...mockSchedule, date: '2026-06-30' },
      ];

      scheduleBuilder.getMonth.mockResolvedValue(monthSchedules);

      await expect(service.getScheduleForDate(date)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getScheduleForDate(date)).rejects.toThrow(
        'No schedule found for date 2026-06-15',
      );
    });

    it('should extract year-month correctly from date', async () => {
      const date = '2026-12-25';
      scheduleBuilder.getMonth.mockResolvedValue([
        { ...mockSchedule, date: '2026-12-25' },
      ]);

      await service.getScheduleForDate(date);

      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-12');
    });
  });

  describe('getScheduleForRange', () => {
    it('should return schedules for a date range within same month', async () => {
      const startDate = '2026-06-10';
      const endDate = '2026-06-20';

      const monthSchedules: DailySchedule[] = [];
      for (let day = 1; day <= 30; day++) {
        monthSchedules.push({
          ...mockSchedule,
          date: `2026-06-${String(day).padStart(2, '0')}`,
        });
      }

      scheduleBuilder.getMonth.mockResolvedValue(monthSchedules);

      const result = await service.getScheduleForRange(startDate, endDate);

      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-06');
      expect(result).toHaveLength(11); // Days 10-20 inclusive
      expect(result[0].date).toBe('2026-06-10');
      expect(result[10].date).toBe('2026-06-20');
    });

    it('should return schedules for a date range spanning multiple months', async () => {
      const startDate = '2026-06-25';
      const endDate = '2026-07-05';

      const juneSchedules: DailySchedule[] = [];
      for (let day = 1; day <= 30; day++) {
        juneSchedules.push({
          ...mockSchedule,
          date: `2026-06-${String(day).padStart(2, '0')}`,
        });
      }

      const julySchedules: DailySchedule[] = [];
      for (let day = 1; day <= 31; day++) {
        julySchedules.push({
          ...mockSchedule,
          date: `2026-07-${String(day).padStart(2, '0')}`,
        });
      }

      scheduleBuilder.getMonth
        .mockResolvedValueOnce(juneSchedules)
        .mockResolvedValueOnce(julySchedules);

      const result = await service.getScheduleForRange(startDate, endDate);

      expect(scheduleBuilder.getMonth).toHaveBeenCalledTimes(2);
      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-06');
      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-07');
      expect(result).toHaveLength(11); // June 25-30 (6 days) + July 1-5 (5 days)
      expect(result[0].date).toBe('2026-06-25');
      expect(result[10].date).toBe('2026-07-05');
    });

    it('should return schedules for a date range spanning three months', async () => {
      const startDate = '2026-05-28';
      const endDate = '2026-07-03';

      const maySchedules: DailySchedule[] = [];
      for (let day = 1; day <= 31; day++) {
        maySchedules.push({
          ...mockSchedule,
          date: `2026-05-${String(day).padStart(2, '0')}`,
        });
      }

      const juneSchedules: DailySchedule[] = [];
      for (let day = 1; day <= 30; day++) {
        juneSchedules.push({
          ...mockSchedule,
          date: `2026-06-${String(day).padStart(2, '0')}`,
        });
      }

      const julySchedules: DailySchedule[] = [];
      for (let day = 1; day <= 31; day++) {
        julySchedules.push({
          ...mockSchedule,
          date: `2026-07-${String(day).padStart(2, '0')}`,
        });
      }

      scheduleBuilder.getMonth
        .mockResolvedValueOnce(maySchedules)
        .mockResolvedValueOnce(juneSchedules)
        .mockResolvedValueOnce(julySchedules);

      const result = await service.getScheduleForRange(startDate, endDate);

      expect(scheduleBuilder.getMonth).toHaveBeenCalledTimes(3);
      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-05');
      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-06');
      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-07');
      // May 28-31 (4 days) + June 1-30 (30 days) + July 1-3 (3 days) = 37 days
      expect(result).toHaveLength(37);
      expect(result[0].date).toBe('2026-05-28');
      expect(result[36].date).toBe('2026-07-03');
    });

    it('should return single day when start and end are the same', async () => {
      const date = '2026-06-15';

      const monthSchedules: DailySchedule[] = [];
      for (let day = 1; day <= 30; day++) {
        monthSchedules.push({
          ...mockSchedule,
          date: `2026-06-${String(day).padStart(2, '0')}`,
        });
      }

      scheduleBuilder.getMonth.mockResolvedValue(monthSchedules);

      const result = await service.getScheduleForRange(date, date);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2026-06-15');
    });

    it('should return empty array when no dates match the range', async () => {
      const startDate = '2026-06-01';
      const endDate = '2026-06-05';

      const monthSchedules: DailySchedule[] = [
        { ...mockSchedule, date: '2026-06-10' },
        { ...mockSchedule, date: '2026-06-20' },
      ];

      scheduleBuilder.getMonth.mockResolvedValue(monthSchedules);

      const result = await service.getScheduleForRange(startDate, endDate);

      expect(result).toHaveLength(0);
    });

    it('should handle year boundary correctly', async () => {
      const startDate = '2025-12-30';
      const endDate = '2026-01-02';

      const decSchedules: DailySchedule[] = [];
      for (let day = 1; day <= 31; day++) {
        decSchedules.push({
          ...mockSchedule,
          date: `2025-12-${String(day).padStart(2, '0')}`,
        });
      }

      const janSchedules: DailySchedule[] = [];
      for (let day = 1; day <= 31; day++) {
        janSchedules.push({
          ...mockSchedule,
          date: `2026-01-${String(day).padStart(2, '0')}`,
        });
      }

      scheduleBuilder.getMonth
        .mockResolvedValueOnce(decSchedules)
        .mockResolvedValueOnce(janSchedules);

      const result = await service.getScheduleForRange(startDate, endDate);

      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2025-12');
      expect(scheduleBuilder.getMonth).toHaveBeenCalledWith('2026-01');
      // Dec 30-31 (2 days) + Jan 1-2 (2 days) = 4 days
      expect(result).toHaveLength(4);
      expect(result[0].date).toBe('2025-12-30');
      expect(result[3].date).toBe('2026-01-02');
    });
  });
});
