import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { Broker, Lead, LeadStatus } from '../entities';

describe('LeadsService', () => {
  let service: LeadsService;

  const leads = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const brokers = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: getRepositoryToken(Lead), useValue: leads },
        { provide: getRepositoryToken(Broker), useValue: brokers },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  describe('findAll', () => {
    it('returns everything when no status is given', async () => {
      leads.find.mockResolvedValue([]);

      await service.findAll({});

      expect(leads.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('filters by status when one is given', async () => {
      leads.find.mockResolvedValue([]);

      await service.findAll({ status: LeadStatus.UNSENT });

      expect(leads.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: LeadStatus.UNSENT } }),
      );
    });
  });

  describe('summary', () => {
    it('fills every status, including ones with no rows', async () => {
      leads.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([
            { status: LeadStatus.SENT, count: '12' },
            { status: LeadStatus.DUPLICATE, count: '3' },
          ]),
      });

      // Absent statuses must read as 0, not undefined; the dashboard renders
      // these straight into stat tiles.
      await expect(service.summary()).resolves.toEqual({
        total: 15,
        sent: 12,
        unsent: 0,
        duplicate: 3,
        failed: 0,
      });
    });
  });

  describe('assign', () => {
    it('refuses to assign a duplicate to a broker', async () => {
      // Routing an already-seen email to a second broker is an automatic fail
      // condition, so the UI must not be able to do it either.
      leads.findOne.mockResolvedValue({
        id: 1,
        status: LeadStatus.DUPLICATE,
      });

      await expect(service.assign(1, 5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(leads.save).not.toHaveBeenCalled();
    });

    it('refuses to reassign a lead that is already sent', async () => {
      leads.findOne.mockResolvedValue({ id: 1, status: LeadStatus.SENT });

      await expect(service.assign(1, 5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('404s an unknown lead', async () => {
      leads.findOne.mockResolvedValue(null);

      await expect(service.assign(1, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('404s an unknown broker', async () => {
      leads.findOne.mockResolvedValue({ id: 1, status: LeadStatus.UNSENT });
      brokers.findOne.mockResolvedValue(null);

      await expect(service.assign(1, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sets both the relation and the foreign key when assigning', async () => {
      const lead = {
        id: 1,
        status: LeadStatus.UNSENT,
        brokerId: null,
        broker: null,
        assignedAt: null,
        note: null,
      };
      const broker = { id: 5, name: 'Broker A' };

      leads.findOne.mockResolvedValue(lead);
      brokers.findOne.mockResolvedValue(broker);
      leads.save.mockResolvedValue(lead);

      await service.assign(1, 5);

      // Setting only brokerId lets the stale loaded relation win and writes
      // NULL, leaving a lead marked sent with no broker attached.
      const calls = leads.save.mock.calls as [typeof lead & { broker: unknown }][];
      const saved = calls[0][0];
      expect(saved.brokerId).toBe(5);
      expect(saved.broker).toBe(broker);
      expect(saved.status).toBe(LeadStatus.SENT);
      expect(saved.assignedAt).toBeInstanceOf(Date);
    });
  });
});
