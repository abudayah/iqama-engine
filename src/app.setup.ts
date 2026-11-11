import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { parseTrustProxy } from './config/trust-proxy';

/**
 * HTTP-level setup shared by main.ts and the tests: proxy trust, security
 * headers, no-store caching, CORS and request validation.
 */
export function configureApp(app: NestExpressApplication): void {
  // Behind a reverse proxy, req.ip (used by the rate limiter) is the proxy's
  // address unless trust proxy is set. Off by default: set TRUST_PROXY.
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

  // Security headers. This API serves JSON to other origins (display screens, the
  // admin UI), so Cross-Origin-Resource-Policy is relaxed; CORS itself is below.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Disable nginx/proxy caching for all API responses
  app.use(
    (
      _req: unknown,
      res: { setHeader: (k: string, v: string) => void },
      next: () => void,
    ) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      next();
    },
  );

  // CORS — driven by CORS_ORIGIN env variable.
  // Accepts a comma-separated list of allowed origins, or '*' for open access.
  // Example: CORS_ORIGIN=http://localhost:5173,https://prayers.example.com
  const rawOrigin = process.env.CORS_ORIGIN ?? '';
  if (rawOrigin) {
    const origins = rawOrigin
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    app.enableCors({
      origin: origins.length === 1 && origins[0] === '*' ? '*' : origins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-api-key', 'Cache-Control'],
      credentials: false,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );
}
