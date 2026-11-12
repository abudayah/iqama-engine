import { Test, TestingModule } from '@nestjs/testing';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
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

  afterEach(() => jest.restoreAllMocks());

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

    it('returns 503 with a generic body and never the raw error text', async () => {
      const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      prismaService.$queryRaw.mockRejectedValue(
        new Error('Connection refused: file:/secret/path/db.sqlite'),
      );

      const err: unknown = await controller.check().catch((e: unknown) => e);

      expect(err).toBeInstanceOf(ServiceUnavailableException);
      const e = err as ServiceUnavailableException;
      expect(e.getStatus()).toBe(503);
      expect(e.getResponse()).toEqual({ status: 'error', db: 'down' });
      expect(JSON.stringify(e.getResponse())).not.toContain('secret');
      // the real error is logged server-side
      expect(logged).toHaveBeenCalledTimes(1);
      expect(String(logged.mock.calls[0][1])).toContain('Connection refused');
    });

    it('handles non-Error exceptions the same way', async () => {
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      prismaService.$queryRaw.mockRejectedValue('Unknown error');

      await expect(controller.check()).rejects.toMatchObject({
        response: { status: 'error', db: 'down' },
      });
    });
  });
});
