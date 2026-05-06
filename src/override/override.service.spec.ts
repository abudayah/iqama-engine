import { Test, TestingModule } from '@nestjs/testing';
import { OverrideService } from './override.service';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from '../dayjs';
import { Dayjs } from 'dayjs';

describe('OverrideService', () => {
  let service: OverrideService;

  const mockPrismaService = {
    override: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverrideService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OverrideService>(OverrideService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverridesForDate', () => {
    it('should return empty array when no overrides exist', async () => {
      mockPrismaService.override.findMany.mockResolvedValue([]);

      const result = await service.getOverridesForDate('2025-06-15');

      expect(result).toEqual([]);
      expect(mockPrismaService.override.findMany).toHaveBeenCalledWith({
        where: {
          startDate: { lte: new Date('2025-06-15T00:00:00.000Z') },
          endDate: { gte: new Date('2025-06-15T00:00:00.000Z') },
          deletedAt: null,
        },
      });
    });

    it('should return overrides for the given date', async () => {
      const mockOverrides = [
        {
          id: 1,
          prayer: 'fajr',
          overrideType: 'FIXED',
          value: '04:30',
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.override.findMany.mockResolvedValue(mockOverrides);

      const result = await service.getOverridesForDate('2025-06-15');

      expect(result).toEqual(mockOverrides);
    });
  });

  describe('applyOverrides', () => {
    const rawAzanMap: Record<string, Dayjs> = {
      fajr: dayjs.tz('2025-06-15 03:30', 'America/Vancouver'),
      dhuhr: dayjs.tz('2025-06-15 13:10', 'America/Vancouver'),
      asr: dayjs.tz('2025-06-15 17:30', 'America/Vancouver'),
      maghrib: dayjs.tz('2025-06-15 20:30', 'America/Vancouver'),
      isha: dayjs.tz('2025-06-15 22:15', 'America/Vancouver'),
    };

    const baseIqamaTimes = {
      fajr: '04:00',
      dhuhr: '13:45',
      asr: '18:00',
      maghrib: '20:35',
      isha: '22:30',
    };

    it('should return original times when no overrides', () => {
      const result = service.applyOverrides(rawAzanMap, baseIqamaTimes, []);

      expect(result.iqamaTimes).toEqual(baseIqamaTimes);
      expect(result.hasOverrides).toBe(false);
    });

    it('should apply FIXED override', () => {
      const overrides = [
        {
          id: 1,
          date: '2025-06-15',
          prayer: 'fajr',
          overrideType: 'FIXED' as const,
          value: '04:30',
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.applyOverrides(
        rawAzanMap,
        baseIqamaTimes,
        overrides,
      );

      expect(result.iqamaTimes.fajr).toBe('04:30');
      expect(result.iqamaTimes.dhuhr).toBe('13:45'); // Unchanged
      expect(result.hasOverrides).toBe(true);
    });

    it('should apply OFFSET override', () => {
      const overrides = [
        {
          id: 1,
          date: '2025-06-15',
          prayer: 'fajr',
          overrideType: 'OFFSET' as const,
          value: '30', // 30 minutes after Azan
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.applyOverrides(
        rawAzanMap,
        baseIqamaTimes,
        overrides,
      );

      // 03:30 + 30 min = 04:00
      expect(result.iqamaTimes.fajr).toBe('04:00');
      expect(result.hasOverrides).toBe(true);
    });

    it('should apply multiple overrides', () => {
      const overrides = [
        {
          id: 1,
          date: '2025-06-15',
          prayer: 'fajr',
          overrideType: 'FIXED' as const,
          value: '04:30',
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          date: '2025-06-15',
          prayer: 'dhuhr',
          overrideType: 'FIXED' as const,
          value: '14:00',
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.applyOverrides(
        rawAzanMap,
        baseIqamaTimes,
        overrides,
      );

      expect(result.iqamaTimes.fajr).toBe('04:30');
      expect(result.iqamaTimes.dhuhr).toBe('14:00');
      expect(result.iqamaTimes.asr).toBe('18:00'); // Unchanged
      expect(result.hasOverrides).toBe(true);
    });

    it('should allow Iqama before Azan (admin responsibility)', () => {
      // The service doesn't validate Iqama >= Azan
      // This is the admin's responsibility to set correct values
      const overrides = [
        {
          id: 1,
          date: '2025-06-15',
          prayer: 'fajr',
          overrideType: 'FIXED' as const,
          value: '03:00', // Before Azan (03:30)
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.applyOverrides(
        rawAzanMap,
        baseIqamaTimes,
        overrides,
      );

      // Service applies the override as-is
      expect(result.iqamaTimes.fajr).toBe('03:00');
    });

    it('should handle invalid prayer names gracefully', () => {
      const overrides = [
        {
          id: 1,
          date: '2025-06-15',
          prayer: 'invalid_prayer',
          overrideType: 'FIXED' as const,
          value: '04:30',
          startDate: new Date('2025-06-15'),
          endDate: new Date('2025-06-15'),
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = service.applyOverrides(
        rawAzanMap,
        baseIqamaTimes,
        overrides,
      );

      // Should not crash, just ignore invalid override
      expect(result.iqamaTimes).toEqual(baseIqamaTimes);
    });
  });
});
