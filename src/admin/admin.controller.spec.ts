import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { UpdateOverrideDto } from './dto/update-override.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let prismaService: jest.Mocked<PrismaService>;

  const mockOverride = {
    id: 1,
    prayer: 'fajr',
    overrideType: 'FIXED',
    value: '04:30',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      override: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: PrismaService, useValue: mockPrismaService }],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createOverride', () => {
    it('should create a new override', async () => {
      const dto: CreateOverrideDto = {
        prayer: 'fajr',
        overrideType: 'FIXED',
        value: '04:30',
        startDate: '2026-06-01',
        endDate: '2026-08-31',
      };

      prismaService.override.create.mockResolvedValue(mockOverride);

      const result = await controller.createOverride(dto);

      expect(prismaService.override.create).toHaveBeenCalledWith({
        data: {
          prayer: 'fajr',
          overrideType: 'FIXED',
          value: '04:30',
          startDate: new Date('2026-06-01'),
          endDate: new Date('2026-08-31'),
        },
      });
      expect(result).toEqual(mockOverride);
    });

    it('should create an OFFSET override', async () => {
      const dto: CreateOverrideDto = {
        prayer: 'isha',
        overrideType: 'OFFSET',
        value: '+15',
        startDate: '2026-12-01',
        endDate: '2026-12-31',
      };

      const offsetOverride = { ...mockOverride, ...dto };
      prismaService.override.create.mockResolvedValue(offsetOverride);

      const result = await controller.createOverride(dto);

      expect(result.overrideType).toBe('OFFSET');
      expect(result.value).toBe('+15');
    });
  });

  describe('listOverrides', () => {
    it('should return all overrides', async () => {
      const overrides = [mockOverride, { ...mockOverride, id: 2 }];
      prismaService.override.findMany.mockResolvedValue(overrides);

      const result = await controller.listOverrides();

      expect(prismaService.override.findMany).toHaveBeenCalledWith({
        orderBy: [{ startDate: 'desc' }, { prayer: 'asc' }],
      });
      expect(result).toEqual(overrides);
    });

    it('should return empty array when no overrides exist', async () => {
      prismaService.override.findMany.mockResolvedValue([]);

      const result = await controller.listOverrides();

      expect(result).toEqual([]);
    });
  });

  describe('getOverride', () => {
    it('should return a specific override', async () => {
      prismaService.override.findUnique.mockResolvedValue(mockOverride);

      const result = await controller.getOverride(1);

      expect(prismaService.override.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockOverride);
    });

    it('should throw NotFoundException when override not found', async () => {
      prismaService.override.findUnique.mockResolvedValue(null);

      await expect(controller.getOverride(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getOverride(999)).rejects.toThrow(
        'Override with ID 999 not found',
      );
    });
  });

  describe('updateOverride', () => {
    it('should update an existing override', async () => {
      const dto: UpdateOverrideDto = {
        value: '04:45',
      };

      const updatedOverride = { ...mockOverride, value: '04:45' };

      prismaService.override.findUnique.mockResolvedValue(mockOverride);
      prismaService.override.update.mockResolvedValue(updatedOverride);

      const result = await controller.updateOverride(1, dto);

      expect(prismaService.override.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.override.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { value: '04:45' },
      });
      expect(result.value).toBe('04:45');
    });

    it('should update multiple fields', async () => {
      const dto: UpdateOverrideDto = {
        value: '05:00',
        startDate: '2026-07-01',
        endDate: '2026-09-30',
      };

      const updatedOverride = {
        ...mockOverride,
        value: '05:00',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-09-30'),
      };

      prismaService.override.findUnique.mockResolvedValue(mockOverride);
      prismaService.override.update.mockResolvedValue(updatedOverride);

      const result = await controller.updateOverride(1, dto);

      expect(result.value).toBe('05:00');
      expect(result.startDate).toEqual(new Date('2026-07-01'));
    });

    it('should throw NotFoundException when override not found', async () => {
      const dto: UpdateOverrideDto = { value: '04:45' };

      prismaService.override.findUnique.mockResolvedValue(null);

      await expect(controller.updateOverride(999, dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.updateOverride(999, dto)).rejects.toThrow(
        'Override with ID 999 not found',
      );
    });
  });

  describe('deleteOverride', () => {
    it('should delete an override', async () => {
      prismaService.override.findUnique.mockResolvedValue(mockOverride);
      prismaService.override.delete.mockResolvedValue(mockOverride);

      await controller.deleteOverride(1);

      expect(prismaService.override.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.override.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when override not found', async () => {
      prismaService.override.findUnique.mockResolvedValue(null);

      await expect(controller.deleteOverride(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.deleteOverride(999)).rejects.toThrow(
        'Override with ID 999 not found',
      );
    });
  });

  describe('clearAllOverrides', () => {
    it('should delete all overrides', async () => {
      prismaService.override.deleteMany.mockResolvedValue({ count: 5 });

      await controller.clearAllOverrides();

      expect(prismaService.override.deleteMany).toHaveBeenCalled();
    });
  });
});
