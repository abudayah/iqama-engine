import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { QiyamConfigService } from './qiyam-config.service';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generates a valid HH:mm string (00:00–23:59). */
const validHHmmArbitrary = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(
    ([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
  );

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------

/**
 * In-memory store that mimics prisma.qiyamConfig behaviour for the tests.
 * Keyed by hijri_year.
 */
function createMockPrismaService() {
  const store = new Map<
    number,
    {
      id: number;
      hijri_year: number;
      start_time: string;
      createdAt: Date;
      updatedAt: Date;
    }
  >();
  let nextId = 1;

  return {
    qiyamConfig: {
      findUnique: jest.fn(({ where }: { where: { hijri_year: number } }) => {
        const record = store.get(where.hijri_year);
        return Promise.resolve(record ?? null);
      }),
      upsert: jest.fn(
        ({
          where,
          create,
          update,
        }: {
          where: { hijri_year: number };
          create: { hijri_year: number; start_time: string };
          update: { start_time: string };
        }) => {
          const existing = store.get(where.hijri_year);
          if (existing) {
            existing.start_time = update.start_time;
            existing.updatedAt = new Date();
            return Promise.resolve(existing);
          } else {
            const record = {
              id: nextId++,
              hijri_year: create.hijri_year,
              start_time: create.start_time,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            store.set(create.hijri_year, record);
            return Promise.resolve(record);
          }
        },
      ),
      // Expose store for assertions
      _store: store,
      _reset: () => {
        store.clear();
        nextId = 1;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QiyamConfigService', () => {
  let service: QiyamConfigService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QiyamConfigService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<QiyamConfigService>(QiyamConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockPrisma.qiyamConfig._reset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Task 3.4 — Unit tests
  // -------------------------------------------------------------------------

  describe('getForYear', () => {
    it('returns null when no record exists for the given year', async () => {
      const result = await service.getForYear(1446);
      expect(result).toBeNull();
    });

    it('returns the record when one exists', async () => {
      await service.upsert(1446, '02:30');
      const result = await service.getForYear(1446);
      expect(result).toEqual({ hijri_year: 1446, start_time: '02:30' });
    });

    it('returns null for a year that has no record even after another year is saved', async () => {
      await service.upsert(1446, '02:30');
      const result = await service.getForYear(1447);
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('creates a record when none exists', async () => {
      await service.upsert(1446, '03:00');
      const result = await service.getForYear(1446);
      expect(result).toEqual({ hijri_year: 1446, start_time: '03:00' });
    });

    it('updates an existing record (upsert semantics)', async () => {
      await service.upsert(1446, '03:00');
      await service.upsert(1446, '04:15');
      const result = await service.getForYear(1446);
      expect(result).toEqual({ hijri_year: 1446, start_time: '04:15' });
    });

    it('stores exactly one record per hijri_year after multiple upserts', async () => {
      await service.upsert(1446, '01:00');
      await service.upsert(1446, '02:00');
      await service.upsert(1446, '03:00');
      // Only one record should exist for year 1446
      expect(mockPrisma.qiyamConfig._store.size).toBe(1);
      const result = await service.getForYear(1446);
      expect(result?.start_time).toBe('03:00');
    });

    it('creates independent records for different years', async () => {
      await service.upsert(1446, '03:00');
      await service.upsert(1447, '04:00');
      expect(mockPrisma.qiyamConfig._store.size).toBe(2);
      expect((await service.getForYear(1446))?.start_time).toBe('03:00');
      expect((await service.getForYear(1447))?.start_time).toBe('04:00');
    });
  });

  // -------------------------------------------------------------------------
  // Task 3.5 — Property 9: Upsert — at most one record per Hijri year
  //
  // Validates: Requirements 7.3
  //
  // For any valid HH:mm times time1 and time2, calling upsert(year, time1)
  // then upsert(year, time2) results in exactly one record with
  // start_time === time2.
  // -------------------------------------------------------------------------

  describe('Property 9: upsert results in exactly one record with the latest start_time', () => {
    /**
     * **Validates: Requirements 7.3**
     *
     * For any valid HH:mm times `time1` and `time2`, calling
     * `upsert(year, time1)` then `upsert(year, time2)` SHALL result in
     * exactly one `QiyamConfig` record for that `hijri_year`, with
     * `start_time` equal to `time2`.
     */
    it('upsert(year, time1) then upsert(year, time2) → exactly one record with start_time === time2', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1400, max: 1500 }),
          validHHmmArbitrary,
          validHHmmArbitrary,
          async (hijriYear, time1, time2) => {
            // Reset store between iterations
            mockPrisma.qiyamConfig._reset();
            jest.clearAllMocks();

            await service.upsert(hijriYear, time1);
            await service.upsert(hijriYear, time2);

            // Exactly one record for this year
            const storeSize = mockPrisma.qiyamConfig._store.size;
            if (storeSize !== 1) return false;

            // The record has start_time === time2
            const result = await service.getForYear(hijriYear);
            return result?.start_time === time2;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
