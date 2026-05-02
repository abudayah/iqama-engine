import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return ok status when database is up', async () => {
      prismaService.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.services.database).toBe('up');
      expect(result.services.api).toBe('up');
      expect(result.timestamp).toBeDefined();
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return degraded status when database is down', async () => {
      const dbError = new Error('Connection refused');
      prismaService.$queryRaw.mockRejectedValue(dbError);

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.services.database).toBe('down');
      expect(result.services.api).toBe('up');
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBe('Connection refused');
    });

    it('should handle non-Error exceptions', async () => {
      prismaService.$queryRaw.mockRejectedValue('Unknown error');

      const result = await controller.check();

      expect(result.status).toBe('degraded');
      expect(result.error).toBe('Unknown error');
    });
  });
});
