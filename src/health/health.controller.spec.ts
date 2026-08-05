import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const buildController = async (
    query: jest.Mock,
  ): Promise<HealthController> => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: { query } }],
    }).compile();

    return module.get<HealthController>(HealthController);
  };

  it('reports the database as up when the probe succeeds', async () => {
    const controller = await buildController(
      jest.fn().mockResolvedValue([{ '1': 1 }]),
    );

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('reports the database as down when the probe fails', async () => {
    const controller = await buildController(
      jest.fn().mockRejectedValue(new Error('connection lost')),
    );

    await expect(controller.check()).resolves.toEqual({
      status: 'degraded',
      database: 'down',
    });
  });
});
