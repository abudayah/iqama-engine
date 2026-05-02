import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { DailySchedule } from './daily-schedule.interface';

describe('ScheduleController', () => {
  let controller: ScheduleController;
  let scheduleService: jest.Mocked<ScheduleService>;

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
    const mockScheduleService = {
      getScheduleForDate: jest.fn(),
      getScheduleForRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [{ provide: ScheduleService, useValue: mockScheduleService }],
    }).compile();

    controller = module.get<ScheduleController>(ScheduleController);
    scheduleService = module.get(ScheduleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSchedule with date parameter', () => {
    it('should return schedule for a single date', async () => {
      const query = { date: '2026-06-15' };
      scheduleService.getScheduleForDate.mockResolvedValue(mockSchedule);

      const result = await controller.getSchedule(query);

      expect(scheduleService.getScheduleForDate).toHaveBeenCalledWith(
        '2026-06-15',
      );
      expect(result).toEqual(mockSchedule);
    });
  });

  describe('getSchedule with date range', () => {
    it('should return schedules for a date range', async () => {
      const query = { start_date: '2026-06-01', end_date: '2026-06-30' };
      const mockSchedules = [mockSchedule, mockSchedule];
      scheduleService.getScheduleForRange.mockResolvedValue(mockSchedules);

      const result = await controller.getSchedule(query);

      expect(scheduleService.getScheduleForRange).toHaveBeenCalledWith(
        '2026-06-01',
        '2026-06-30',
      );
      expect(result).toEqual(mockSchedules);
    });
  });

  describe('validation errors', () => {
    it('should throw error when date is used with start_date', async () => {
      const query = { date: '2026-06-15', start_date: '2026-06-01' };

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "Cannot use 'date' together with 'start_date' or 'end_date'",
      );
    });

    it('should throw error when date is used with end_date', async () => {
      const query = { date: '2026-06-15', end_date: '2026-06-30' };

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "Cannot use 'date' together with 'start_date' or 'end_date'",
      );
    });

    it('should throw error when date is used with both start_date and end_date', async () => {
      const query = {
        date: '2026-06-15',
        start_date: '2026-06-01',
        end_date: '2026-06-30',
      };

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "Cannot use 'date' together with 'start_date' or 'end_date'",
      );
    });

    it('should throw error when only start_date is provided', async () => {
      const query = { start_date: '2026-06-01' };

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "'start_date' and 'end_date' must be provided together",
      );
    });

    it('should throw error when only end_date is provided', async () => {
      const query = { end_date: '2026-06-30' };

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "'start_date' and 'end_date' must be provided together",
      );
    });

    it('should throw error when no parameters are provided', async () => {
      const query = {};

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "Provide either 'date' or both 'start_date' and 'end_date'",
      );
    });

    it('should throw error when start_date is after end_date', async () => {
      const query = { start_date: '2026-06-30', end_date: '2026-06-01' };

      await expect(controller.getSchedule(query)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getSchedule(query)).rejects.toThrow(
        "'start_date' must not be after 'end_date'",
      );
    });
  });
});
