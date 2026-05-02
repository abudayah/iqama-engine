import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    mockConfigService.get.mockReset();
  });

  afterEach(async () => {
    if (service) {
      await service.$disconnect();
    }
  });

  it('should be defined', async () => {
    mockConfigService.get.mockReturnValue(
      'mysql://user:password@localhost:3306/testdb',
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });

  it('should throw error when DATABASE_URL is not defined', () => {
    mockConfigService.get.mockReturnValue(undefined);

    expect(() => {
      new PrismaService(mockConfigService as any);
    }).toThrow('DATABASE_URL is not defined');
  });

  it('should parse database URL correctly', async () => {
    const databaseUrl = 'mysql://testuser:testpass@db.example.com:3307/mydb';
    mockConfigService.get.mockReturnValue(databaseUrl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
    expect(mockConfigService.get).toHaveBeenCalledWith('DATABASE_URL');
  });

  it('should use default port 3306 when not specified', async () => {
    const databaseUrl = 'mysql://user:pass@localhost/testdb';
    mockConfigService.get.mockReturnValue(databaseUrl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });

  it('should handle custom port in database URL', async () => {
    const databaseUrl = 'mysql://user:pass@localhost:3308/testdb';
    mockConfigService.get.mockReturnValue(databaseUrl);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });

  describe('lifecycle hooks', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue(
        'mysql://user:password@localhost:3306/testdb',
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrismaService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      service = module.get<PrismaService>(PrismaService);
    });

    it('should connect on module init', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalled();
      connectSpy.mockRestore();
    });

    it('should disconnect on module destroy', async () => {
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });
  });
});
