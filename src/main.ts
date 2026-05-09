import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix for all routes (e.g., /api/v1/...)
  // This allows the app to work when deployed at a subpath like /api
  app.setGlobalPrefix('api');

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
