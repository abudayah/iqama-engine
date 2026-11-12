import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { warnIfStaleTzdata } from './config/tzdata-guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Log loudly if this Node build has old timezone data (B.C. is UTC-7 all year).
  warnIfStaleTzdata(
    app.get(ConfigService).get<string>('app.masjidTimezone') ?? '',
  );

  // Proxy trust, helmet, no-store, CORS and validation (see app.setup.ts).
  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
