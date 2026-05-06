import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QiyamConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getForYear(
    hijriYear: number,
  ): Promise<{ hijri_year: number; start_time: string } | null> {
    const record = await this.prisma.qiyamConfig.findUnique({
      where: { hijri_year: hijriYear },
    });

    if (!record) {
      return null;
    }

    return {
      hijri_year: record.hijri_year,
      start_time: record.start_time,
    };
  }

  async upsert(hijriYear: number, startTime: string): Promise<void> {
    await this.prisma.qiyamConfig.upsert({
      where: { hijri_year: hijriYear },
      create: {
        hijri_year: hijriYear,
        start_time: startTime,
      },
      update: {
        start_time: startTime,
      },
    });
  }
}
