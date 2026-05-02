import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockContext = (apiKey?: string): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: apiKey ? { 'x-api-key': apiKey } : {},
          }),
        }),
      } as ExecutionContext;
    };

    it('should allow access with valid API key', () => {
      const validKey = 'test-api-key-123';
      configService.get.mockReturnValue(validKey);
      const context = createMockContext(validKey);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('ADMIN_API_KEY');
    });

    it('should throw UnauthorizedException when API key is not configured', () => {
      configService.get.mockReturnValue(undefined);
      const context = createMockContext('some-key');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow(
        'Admin API key is not configured on the server',
      );
    });

    it('should throw UnauthorizedException when API key is missing', () => {
      configService.get.mockReturnValue('valid-key');
      const context = createMockContext();

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('API key is required');
    });

    it('should throw UnauthorizedException when API key is invalid', () => {
      configService.get.mockReturnValue('valid-key');
      const context = createMockContext('invalid-key');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid API key');
    });

    it('should handle empty string API key', () => {
      configService.get.mockReturnValue('valid-key');
      const context = createMockContext('');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('API key is required');
    });
  });
});
