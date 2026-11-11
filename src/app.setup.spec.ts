import {
  Controller,
  Get,
  INestApplication,
  Module,
  UseGuards,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { configureApp } from './app.setup';
import { ApiKeyGuard } from './auth/api-key.guard';
import { AdminController } from './admin/admin.controller';
import { HijriCalendarController } from './hijri-calendar/hijri-calendar.controller';
import { ScheduleController } from './schedule/schedule.controller';
import {
  ADMIN_LIMIT_PER_MIN,
  isAdminRoute,
  PUBLIC_LIMIT_PER_MIN,
  THROTTLER_OPTIONS,
} from './throttle/throttle.config';

@Controller('api/v1/schedule-test')
class PublicTestController {
  @Get()
  get() {
    return { ok: true };
  }
}

@Controller('api/v1/admin')
@UseGuards(ApiKeyGuard)
class AdminTestController {
  @Get('a')
  a() {
    return { ok: 'a' };
  }
  @Get('b')
  b() {
    return { ok: 'b' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => ({ ADMIN_PASSWORD: 'correct-key' })],
    }),
    ThrottlerModule.forRoot(THROTTLER_OPTIONS),
  ],
  controllers: [PublicTestController, AdminTestController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class TestAppModule {}

async function makeApp(env: Record<string, string> = {}) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  process.env = saved; // configureApp has read what it needs
  return app;
}

describe('app setup: helmet, CORS, throttling', () => {
  let app: INestApplication;
  afterEach(async () => {
    await app?.close();
  });

  describe('helmet', () => {
    it('sets security headers and keeps Cache-Control: no-store', async () => {
      app = await makeApp();
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedule-test')
        .expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(res.headers['cache-control']).toContain('no-store');
    });
  });

  describe('CORS (CORS_ORIGIN) still works with helmet', () => {
    const origin = 'https://prayers.example.com';

    it('answers the preflight for an allowed origin, public and admin routes', async () => {
      app = await makeApp({ CORS_ORIGIN: `${origin},http://localhost:5173` });
      for (const path of ['/api/v1/schedule-test', '/api/v1/admin/a']) {
        const res = await request(app.getHttpServer())
          .options(path)
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'x-api-key,content-type')
          .expect(204);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
        expect(res.headers['access-control-allow-headers']).toContain(
          'x-api-key',
        );
      }
    });

    it('adds the CORS header to a normal response', async () => {
      app = await makeApp({ CORS_ORIGIN: origin });
      const res = await request(app.getHttpServer())
        .get('/api/v1/schedule-test')
        .set('Origin', origin)
        .expect(200);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it('does not allow an origin that is not listed', async () => {
      app = await makeApp({ CORS_ORIGIN: origin });
      const res = await request(app.getHttpServer())
        .options('/api/v1/schedule-test')
        .set('Origin', 'https://evil.example.com')
        .set('Access-Control-Request-Method', 'GET');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('preflights are not counted against the admin limit', async () => {
      app = await makeApp({ CORS_ORIGIN: origin });
      for (let i = 0; i < ADMIN_LIMIT_PER_MIN + 5; i++) {
        await request(app.getHttpServer())
          .options('/api/v1/admin/a')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .expect(204);
      }
      await request(app.getHttpServer()).get('/api/v1/admin/a').expect(401); // not 429
    });
  });

  describe('rate limiting', () => {
    it('public polling well above normal use is never blocked', async () => {
      app = await makeApp();
      // a display polling every 10 s is 6 req/min; 100 in a minute is far above that
      for (let i = 0; i < 100; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/schedule-test')
          .expect(200);
      }
    });

    it('public routes return 429 only past the generous limit', async () => {
      app = await makeApp();
      const server = app.getHttpServer();
      for (let i = 0; i < PUBLIC_LIMIT_PER_MIN; i++) {
        await request(server).get('/api/v1/schedule-test').expect(200);
      }
      await request(server).get('/api/v1/schedule-test').expect(429);
    }, 30_000);

    it('admin routes: over the limit gets 429, even with a wrong key', async () => {
      app = await makeApp();
      const server = app.getHttpServer();
      for (let i = 0; i < ADMIN_LIMIT_PER_MIN; i++) {
        await request(server)
          .get('/api/v1/admin/a')
          .set('x-api-key', 'wrong')
          .expect(401);
      }
      const res = await request(server)
        .get('/api/v1/admin/a')
        .set('x-api-key', 'wrong')
        .expect(429);
      // named throttlers add a suffix, e.g. retry-after-admin
      expect(
        Object.keys(res.headers).some((h) => h.startsWith('retry-after')),
      ).toBe(true);
    });

    it('all admin routes share one counter (guessing across routes is limited)', async () => {
      app = await makeApp();
      const server = app.getHttpServer();
      for (let i = 0; i < ADMIN_LIMIT_PER_MIN; i++) {
        await request(server)
          .get(i % 2 ? '/api/v1/admin/a' : '/api/v1/admin/b')
          .set('x-api-key', 'wrong')
          .expect(401);
      }
      await request(server)
        .get('/api/v1/admin/b')
        .set('x-api-key', 'correct-key')
        .expect(429);
    });

    it('admin traffic does not use up the public allowance', async () => {
      app = await makeApp();
      const server = app.getHttpServer();
      for (let i = 0; i < ADMIN_LIMIT_PER_MIN + 1; i++) {
        await request(server).get('/api/v1/admin/a');
      }
      await request(server).get('/api/v1/schedule-test').expect(200);
    });
  });

  describe('TRUST_PROXY', () => {
    const hit = (server: unknown, ip: string) =>
      request(server as never)
        .get('/api/v1/admin/a')
        .set('X-Forwarded-For', ip);

    it('default (off): X-Forwarded-For is ignored, so a client cannot dodge the limit', async () => {
      app = await makeApp();
      const server = app.getHttpServer();
      for (let i = 0; i < ADMIN_LIMIT_PER_MIN; i++) {
        await hit(server, `10.0.0.${i}`).expect(401);
      }
      await hit(server, '10.9.9.9').expect(429);
    });

    it('TRUST_PROXY=1: the client address from the proxy is used per client', async () => {
      app = await makeApp({ TRUST_PROXY: '1' });
      const server = app.getHttpServer();
      for (let i = 0; i < ADMIN_LIMIT_PER_MIN; i++) {
        await hit(server, '203.0.113.7').expect(401);
      }
      await hit(server, '203.0.113.7').expect(429);
      await hit(server, '203.0.113.8').expect(401); // another client is unaffected
    });
  });
});

describe('isAdminRoute (real controllers)', () => {
  const ctx = (cls: new (...a: never[]) => unknown, method: string) =>
    ({
      getClass: () => cls,
      getHandler: () =>
        (cls.prototype as Record<string, () => unknown>)[method],
    }) as never;

  it('is true for every AdminController route', () => {
    expect(isAdminRoute(ctx(AdminController, 'listOverrides'))).toBe(true);
    expect(isAdminRoute(ctx(AdminController, 'clearAllOverrides'))).toBe(true);
  });

  it('is true for method-level guards and false for public reads', () => {
    expect(isAdminRoute(ctx(HijriCalendarController, 'submitOverride'))).toBe(
      true,
    );
    expect(isAdminRoute(ctx(HijriCalendarController, 'getStatus'))).toBe(false);
    expect(isAdminRoute(ctx(ScheduleController, 'getSchedule'))).toBe(false);
  });
});
