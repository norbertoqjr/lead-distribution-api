import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DistributionsService,
  NO_FORM_MESSAGE,
} from './distributions.service';
import { FormsService } from '../forms/forms.service';
import { Distribution, DistributionBroker, Lead } from '../entities';

describe('DistributionsService', () => {
  let service: DistributionsService;

  const distributions = { findOne: jest.fn(), save: jest.fn(), create: jest.fn((v: unknown) => v) };
  const members = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v: unknown) => v),
    delete: jest.fn(),
  };
  const leads = { find: jest.fn() };
  const forms = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributionsService,
        { provide: getRepositoryToken(Distribution), useValue: distributions },
        { provide: getRepositoryToken(DistributionBroker), useValue: members },
        { provide: getRepositoryToken(Lead), useValue: leads },
        { provide: FormsService, useValue: forms },
      ],
    }).compile();

    service = module.get(DistributionsService);
  });

  describe('create', () => {
    it('returns the exact message the specification requires when no form exists', async () => {
      forms.findOne.mockResolvedValue(null);

      await expect(service.create({})).rejects.toThrow(NO_FORM_MESSAGE);
      await expect(service.create({})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(NO_FORM_MESSAGE).toBe('Oops, please create a form first.');
    });

    it('checks for a missing form before checking for an existing distribution', async () => {
      // Order matters: with neither present, the admin must be told to create
      // a form, not that a distribution already exists.
      forms.findOne.mockResolvedValue(null);
      distributions.findOne.mockResolvedValue({ id: 1 });

      await expect(service.create({})).rejects.toThrow(NO_FORM_MESSAGE);
    });

    it('refuses a second distribution', async () => {
      forms.findOne.mockResolvedValue({ id: 1 });
      distributions.findOne.mockResolvedValue({ id: 1 });

      await expect(service.create({})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('attaches the distribution to the existing form automatically', async () => {
      forms.findOne.mockResolvedValue({ id: 42 });
      distributions.findOne.mockResolvedValueOnce(null).mockResolvedValue(null);
      distributions.save.mockResolvedValue({ id: 1, formId: 42 });

      await service.create({});

      expect(distributions.save).toHaveBeenCalledWith(
        expect.objectContaining({ formId: 42, singleton: true }),
      );
    });

    it('adds the selected brokers at zero percent, to be set afterwards', async () => {
      forms.findOne.mockResolvedValue({ id: 1 });
      distributions.findOne.mockResolvedValueOnce(null).mockResolvedValue(null);
      distributions.save.mockResolvedValue({ id: 9 });

      await service.create({ brokerIds: [3, 4] });

      expect(members.save).toHaveBeenCalledWith([
        expect.objectContaining({ distributionId: 9, brokerId: 3, percentage: 0 }),
        expect.objectContaining({ distributionId: 9, brokerId: 4, percentage: 0 }),
      ]);
    });
  });

  describe('setBrokers', () => {
    it('404s an unknown distribution', async () => {
      distributions.findOne.mockResolvedValue(null);

      await expect(
        service.setBrokers(1, { brokers: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates an existing member in place, keeping its row', async () => {
      distributions.findOne.mockResolvedValue({ id: 1 });
      members.find.mockResolvedValue([
        { id: 10, brokerId: 3, percentage: 0, isActive: true },
      ]);

      await service.setBrokers(1, {
        brokers: [{ brokerId: 3, percentage: 55.5, isActive: true }],
      });

      expect(members.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 10, percentage: 55.5 }),
      );
      expect(members.delete).not.toHaveBeenCalled();
    });

    it('adds a broker that was not previously a member', async () => {
      distributions.findOne.mockResolvedValue({ id: 1 });
      members.find.mockResolvedValue([]);

      await service.setBrokers(1, {
        brokers: [{ brokerId: 7, percentage: 20, isActive: true }],
      });

      expect(members.save).toHaveBeenCalledWith(
        expect.objectContaining({ distributionId: 1, brokerId: 7, percentage: 20 }),
      );
    });

    it('removes members that were left out of the submission', async () => {
      distributions.findOne.mockResolvedValue({ id: 1 });
      members.find.mockResolvedValue([
        { id: 10, brokerId: 3, percentage: 50, isActive: true },
        { id: 11, brokerId: 4, percentage: 50, isActive: true },
      ]);

      await service.setBrokers(1, {
        brokers: [{ brokerId: 3, percentage: 100, isActive: true }],
      });

      expect(members.delete).toHaveBeenCalled();
    });
  });

  describe('findLeads', () => {
    it('404s an unknown distribution', async () => {
      distributions.findOne.mockResolvedValue(null);

      await expect(service.findLeads(1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns every lead that passed through, not only the sent ones', async () => {
      distributions.findOne.mockResolvedValue({ id: 1 });
      leads.find.mockResolvedValue([]);

      await service.findLeads(1);

      // No status filter: the detail page must show duplicates and failures.
      expect(leads.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { distributionId: 1 } }),
      );
    });
  });
});
