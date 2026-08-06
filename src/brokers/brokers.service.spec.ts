import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { BrokersService } from './brokers.service';
import { Broker, Lead } from '../entities';

describe('BrokersService', () => {
  let service: BrokersService;

  const brokers = {
    find: jest.fn(),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOne: jest.fn(),
    save: jest.fn((v: unknown) => Promise.resolve(v)),
    create: jest.fn((v: unknown) => v),
    delete: jest.fn(),
  };
  const leads = {
    find: jest.fn(),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const dto = {
    name: 'Broker A',
    dailyCap: 10,
    timezone: 'Asia/Manila',
    openMinute: 540,
    closeMinute: 1080,
    workingDays: [5, 1, 3],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrokersService,
        { provide: getRepositoryToken(Broker), useValue: brokers },
        { provide: getRepositoryToken(Lead), useValue: leads },
      ],
    }).compile();

    service = module.get(BrokersService);
  });

  it('stores working days sorted, so the column is stable regardless of click order', async () => {
    await service.create(dto);

    expect(brokers.save).toHaveBeenCalledWith(
      expect.objectContaining({ workingDays: '1,3,5' }),
    );
  });

  it('defaults a broker to active when the flag is omitted', async () => {
    await service.create(dto);

    expect(brokers.save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    );
  });

  it('honours an explicit inactive flag', async () => {
    await service.create({ ...dto, isActive: false });

    expect(brokers.save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    );
  });

  it('404s an unknown broker', async () => {
    brokers.findOne.mockResolvedValue(null);

    await expect(service.findOne(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('keeps existing working days when an update omits them', async () => {
    brokers.findOne.mockResolvedValue({ id: 1, workingDays: '1,2,3' });

    await service.update(1, { dailyCap: 20 });

    expect(brokers.save).toHaveBeenCalledWith(
      expect.objectContaining({ workingDays: '1,2,3', dailyCap: 20 }),
    );
  });

  it('re-sorts working days on update', async () => {
    brokers.findOne.mockResolvedValue({ id: 1, workingDays: '1,2,3' });

    await service.update(1, { workingDays: [7, 6] });

    expect(brokers.save).toHaveBeenCalledWith(
      expect.objectContaining({ workingDays: '6,7' }),
    );
  });

  it('refuses to delete a broker that does not exist', async () => {
    brokers.findOne.mockResolvedValue(null);

    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
    expect(brokers.delete).not.toHaveBeenCalled();
  });

  it('lists a broker leads newest first', async () => {
    brokers.findOne.mockResolvedValue({ id: 1 });
    leads.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.findLeads(1);

    expect(leads.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { brokerId: 1 }, skip: 0, take: 20 }),
    );
    expect(result).toMatchObject({ total: 0, page: 1, totalPages: 1 });
  });
});
