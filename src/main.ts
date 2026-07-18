import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
