import { ApiKeyGuard } from '../auth/api-key.guard';
import { IqamaRulesController } from './iqama-rules.controller';
import { IqamaRulesService } from './iqama-rules.service';

describe('IqamaRulesController', () => {
  const service = {
    getConfig: jest.fn().mockResolvedValue({ ok: 'config' }),
    getCatalog: jest.fn().mockReturnValue({ ok: 'catalog' }),
    preview: jest.fn().mockResolvedValue({ ok: 'preview' }),
    createVersion: jest.fn().mockResolvedValue({ ok: 'saved' }),
  };
  const controller = new IqamaRulesController(
    service as unknown as IqamaRulesService,
  );

  it('is mounted at /api/v1/admin/iqama-rules behind the admin API key guard', () => {
    expect(Reflect.getMetadata('path', IqamaRulesController)).toBe(
      'api/v1/admin/iqama-rules',
    );
    expect(Reflect.getMetadata('__guards__', IqamaRulesController)).toContain(
      ApiKeyGuard,
    );
  });

  it('maps the four routes', () => {
    const route = (fn: keyof IqamaRulesController) => {
      const h = IqamaRulesController.prototype[fn] as () => void;
      return [
        Reflect.getMetadata('method', h) as number,
        Reflect.getMetadata('path', h) as string,
      ];
    };
    // RequestMethod: GET=0, POST=1, PUT=2
    expect(route('getConfig')).toEqual([0, '/']);
    expect(route('getCatalog')).toEqual([0, 'catalog']);
    expect(route('preview')).toEqual([1, 'preview']);
    expect(route('createVersion')).toEqual([2, 'base']);
  });

  it('delegates to the service', async () => {
    expect(await controller.getConfig()).toEqual({ ok: 'config' });
    expect(controller.getCatalog()).toEqual({ ok: 'catalog' });
    const dto = { settings: '{}' };
    expect(await controller.preview(dto)).toEqual({ ok: 'preview' });
    expect(service.preview).toHaveBeenCalledWith(dto);
    const put = { settings: '{}', previewId: 'p', expectedRevision: 1 };
    expect(await controller.createVersion(put)).toEqual({ ok: 'saved' });
    expect(service.createVersion).toHaveBeenCalledWith(put, 'admin');
  });
});
