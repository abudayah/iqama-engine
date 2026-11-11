import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { OverrideService } from './override.service';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from '../dayjs';
import { Dayjs } from 'dayjs';

describe('OverrideService', () => {
  let service: OverrideService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
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

  describe('getOverridesForRange', () => {
    it('should return empty array when no overrides exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getOverridesForRange(
        '2025-06-01',
        '2025-06-30',
      );

      expect(result).toEqual([]);
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
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

      mockPrismaService.$queryRaw.mockResolvedValue(mockOverrides);

      const result = await service.getOverridesForRange(
        '2025-06-01',
        '2025-06-30',
      );

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

describe('OverrideService: precedence and overlap', () => {
  let service: OverrideService;
  const prisma = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OverrideService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OverrideService);
  });

  const tz = 'America/Vancouver';
  const raw = {
    fajr: dayjs.tz('2027-06-15 03:30', tz),
    dhuhr: dayjs.tz('2027-06-15 13:10', tz),
    asr: dayjs.tz('2027-06-15 17:30', tz),
    maghrib: dayjs.tz('2027-06-15 20:30', tz),
    isha: dayjs.tz('2027-06-15 22:15', tz),
  };
  const base = {
    fajr: '04:00',
    dhuhr: '13:45',
    asr: '18:00',
    maghrib: '20:35',
    isha: '22:30',
  };
  const ov = (id: number, value: string, createdAt: string) => ({
    id,
    prayer: 'dhuhr',
    overrideType: 'FIXED',
    value,
    startDate: new Date('2027-06-15'),
    endDate: new Date('2027-06-15'),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    deletedAt: null,
  });

  it('the NEWEST override for a prayer wins, whatever the input order', () => {
    const older = ov(1, '14:00', '2027-05-01T00:00:00Z');
    const newer = ov(2, '14:30', '2027-05-02T00:00:00Z');
    // newest-first (as the query returns) and oldest-first both give the newer value
    expect(
      service.applyOverrides(raw, base, [newer, older]).iqamaTimes.dhuhr,
    ).toBe('14:30');
    expect(
      service.applyOverrides(raw, base, [older, newer]).iqamaTimes.dhuhr,
    ).toBe('14:30');
  });

  it('assertNoOverlap passes when nothing clashes', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(
      service.assertNoOverlap('fajr', '2027-06-01', '2027-06-10'),
    ).resolves.toBeUndefined();
  });

  it('assertNoOverlap throws 409 naming the clashing override', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { ...ov(7, '14:00', '2027-05-01T00:00:00Z'), prayer: 'fajr' },
    ]);
    const err: unknown = await service
      .assertNoOverlap('fajr', '2027-06-10', '2027-06-20')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).message).toContain('Override #7');
    expect((err as ConflictException).message).toContain(
      '2027-06-15 to 2027-06-15',
    );
  });
});
