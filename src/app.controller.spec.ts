import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppController } from './app.controller';

describe('AppController', () => {
  const buildController = async (
    query: jest.Mock,
  ): Promise<AppController> => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: getDataSourceToken(), useValue: { query } }],
    }).compile();

    return module.get<AppController>(AppController);
  };

  it('reports ok when the database answers', async () => {
    const query = jest.fn().mockResolvedValue([{ '1': 1 }]);
    const controller = await buildController(query);

    await expect(controller.welcome()).resolves.toEqual({
      name: 'Lead Distribution Platform API',
      status: 'ok',
      database: 'up',
      docs: '/api/health',
    });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports degraded instead of throwing when the database is down', async () => {
    const query = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const controller = await buildController(query);

    // The root route must still answer when the database is unreachable,
    // otherwise it cannot tell you the database is unreachable.
    await expect(controller.welcome()).resolves.toMatchObject({
      status: 'degraded',
      database: 'down',
    });
  });
});
