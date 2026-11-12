import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleBuilderService } from '../schedule-builder/schedule-builder.service';
import { CreateOverrideDto } from './dto/create-override.dto';
import { UpdateOverrideDto } from './dto/update-override.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { OverrideService } from '../override/override.service';

describe('AdminController', () => {
  let controller: AdminController;

  let prismaService: any;

  const mockOverride = {
    id: 1,
    prayer: 'fajr',
    overrideType: 'FIXED',
    value: '04:30',
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-08-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      override: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const mockScheduleBuilder = {
      invalidateCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ScheduleBuilderService, useValue: mockScheduleBuilder },
        {
          provide: OverrideService,
          useValue: { assertNoOverlap: jest.fn().mockResolvedValue(undefined) },
        },
      ],
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
        where: { deletedAt: null },
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
      prismaService.override.update.mockResolvedValue({
        ...mockOverride,
        deletedAt: new Date(),
      });

      await controller.deleteOverride(1);

      expect(prismaService.override.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.override.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
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
    it('should soft-delete all active overrides', async () => {
      prismaService.override.updateMany.mockResolvedValue({ count: 5 });

      await controller.clearAllOverrides();

      expect(prismaService.override.updateMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});

describe('AdminController: same-prayer override overlap', () => {
  const build = async (assertNoOverlap: jest.Mock) => {
    const prisma = {
      override: {
        create: jest.fn().mockResolvedValue({ id: 9 }),
        findUnique: jest.fn().mockResolvedValue({
          id: 3,
          prayer: 'fajr',
          startDate: new Date('2027-06-01'),
          endDate: new Date('2027-06-10'),
          deletedAt: null,
        }),
        update: jest.fn().mockResolvedValue({ id: 3 }),
      },
    };
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: ScheduleBuilderService,
          useValue: { invalidateCache: jest.fn() },
        },
        { provide: OverrideService, useValue: { assertNoOverlap } },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();
    return { controller: module.get(AdminController), prisma };
  };

  const dto = {
    prayer: 'fajr',
    overrideType: 'FIXED',
    value: '04:30',
    startDate: '2027-06-05',
    endDate: '2027-06-12',
  } as CreateOverrideDto;

  it('create checks the range and saves nothing on a clash (409)', async () => {
    const clash = jest
      .fn()
      .mockRejectedValue(new ConflictException('Override #1 ...'));
    const { controller, prisma } = await build(clash);
    await expect(controller.createOverride(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(clash).toHaveBeenCalledWith('fajr', '2027-06-05', '2027-06-12');
    expect(prisma.override.create).not.toHaveBeenCalled();
  });

  it('create succeeds when nothing overlaps', async () => {
    const { controller, prisma } = await build(
      jest.fn().mockResolvedValue(undefined),
    );
    await controller.createOverride(dto);
    expect(prisma.override.create).toHaveBeenCalled();
  });

  it('update checks the merged range and ignores itself', async () => {
    const check = jest.fn().mockResolvedValue(undefined);
    const { controller } = await build(check);
    await controller.updateOverride(3, {
      endDate: '2027-06-20',
    });
    expect(check).toHaveBeenCalledWith('fajr', '2027-06-01', '2027-06-20', 3);
  });

  it('update returns 409 and changes nothing on a clash', async () => {
    const { controller, prisma } = await build(
      jest.fn().mockRejectedValue(new ConflictException('Override #1 ...')),
    );
    await expect(
      controller.updateOverride(3, { prayer: 'dhuhr' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.override.update).not.toHaveBeenCalled();
  });
});
