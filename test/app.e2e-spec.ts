import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Mock PrismaService — returns empty overrides so no DB connection is needed.
 */
const mockPrismaService = {
  override: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

describe('GET /api/v1/schedule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();
    // Mirror the global ValidationPipe from main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Task 18.1 — Integration test: GET /api/v1/schedule?date=YYYY-MM-DD
   * returns a valid DailySchedule.
   *
   * Validates: Requirements 8.2, 9.1, 9.2, 9.3
   */
  it('returns 200 with a valid DailySchedule for a specific date', async () => {
    const TIME_PATTERN = /^\d{2}:\d{2}$/;
    const TEST_DATE = '2025-06-15';

    const response = await request(app.getHttpServer())
      .get(`/api/v1/schedule?date=${TEST_DATE}`)
      .expect(200);

    const body = response.body;

    // --- Top-level required fields ---
    expect(body).toHaveProperty('date', TEST_DATE);
    expect(body).toHaveProperty('day_of_week');
    expect(typeof body.day_of_week).toBe('string');
    expect(body.day_of_week.length).toBeGreaterThan(0);

    expect(body).toHaveProperty('is_dst');
    expect(typeof body.is_dst).toBe('boolean');

    // --- Prayer entries ---
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
    for (const prayer of prayers) {
      expect(body).toHaveProperty(prayer);
      const entry = body[prayer];

      expect(entry).toHaveProperty('azan');
      expect(entry).toHaveProperty('iqama');

      expect(entry.azan).toMatch(TIME_PATTERN);
      expect(entry.iqama).toMatch(TIME_PATTERN);
    }

    // --- Metadata ---
    expect(body).toHaveProperty('metadata');
    expect(body.metadata).toHaveProperty('calculation_method', 'ISNA');
    expect(body.metadata).toHaveProperty('has_overrides', false);
  });

  /**
   * Task 18.2 — Integration test: GET /api/v1/schedule?start_date=...&end_date=...
   * returns correct array length and contiguous date sequence.
   *
   * Validates: Requirements 8.3
   */
  it('returns correct array length and contiguous dates for a date range', async () => {
    const START_DATE = '2025-06-10';
    const END_DATE = '2025-06-15';
    const EXPECTED_COUNT = 6; // 10, 11, 12, 13, 14, 15

    const response = await request(app.getHttpServer())
      .get(`/api/v1/schedule?start_date=${START_DATE}&end_date=${END_DATE}`)
      .expect(200);

    const body: Array<{ date: string }> = response.body;

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(EXPECTED_COUNT);

    // Verify contiguous ascending date sequence
    for (let i = 0; i < body.length; i++) {
      const expectedDate = new Date(START_DATE);
      expectedDate.setUTCDate(expectedDate.getUTCDate() + i);
      const expectedDateStr = expectedDate.toISOString().substring(0, 10);
      expect(body[i].date).toBe(expectedDateStr);
    }
  });

  /**
   * Task 18.3 — Integration tests for all 400 error cases.
   *
   * Validates: Requirements 8.4, 8.5, 8.6
   */
  describe('400 error cases', () => {
    it('returns 400 when date and start_date are both provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule?date=2025-06-15&start_date=2025-06-10')
        .expect(400);
      expect(response.body.message).toBe(
        "Cannot use 'date' together with 'start_date' or 'end_date'",
      );
    });

    it('returns 400 when date and end_date are both provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule?date=2025-06-15&end_date=2025-06-20')
        .expect(400);
      expect(response.body.message).toBe(
        "Cannot use 'date' together with 'start_date' or 'end_date'",
      );
    });

    it('returns 400 when no parameters are provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule')
        .expect(400);
      expect(response.body.message).toBe(
        "Provide either 'date' or both 'start_date' and 'end_date'",
      );
    });

    it('returns 400 when only start_date is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule?start_date=2025-06-10')
        .expect(400);
      expect(response.body.message).toBe(
        "'start_date' and 'end_date' must be provided together",
      );
    });

    it('returns 400 when only end_date is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule?end_date=2025-06-15')
        .expect(400);
      expect(response.body.message).toBe(
        "'start_date' and 'end_date' must be provided together",
      );
    });

    it('returns 400 when date format is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule?date=15-06-2025')
        .expect(400);
      // ValidationPipe returns an array of messages for format errors
      const messages: string[] = Array.isArray(response.body.message)
        ? response.body.message
        : [response.body.message];
      expect(messages.some((m) => m.includes('YYYY-MM-DD'))).toBe(true);
    });

    it('returns 400 when start_date is after end_date', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/schedule?start_date=2025-06-20&end_date=2025-06-10')
        .expect(400);
      expect(response.body.message).toBe(
        "'start_date' must not be after 'end_date'",
      );
    });
  });
});
