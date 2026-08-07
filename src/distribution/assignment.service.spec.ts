import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AssignmentService } from './assignment.service';
import { Form, Lead, LeadStatus } from '../entities';

/**
 * Covers the routing decisions around the transaction. The pure selection
 * maths lives in eligibility.spec.ts.
 */
describe('AssignmentService', () => {
  let service: AssignmentService;

  const leadRepo = {
    create: jest.fn((v: unknown) => ({ ...(v as object) }) as Lead),
    save: jest.fn((v: unknown) => Promise.resolve(v)),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  };
  const distributionRepo = { findOne: jest.fn() };
  const brokerRepo = { findOne: jest.fn() };
  const memberRepo = { find: jest.fn().mockResolvedValue([]) };

  const manager = {
    getRepository: (entity: { name: string }) => {
      if (entity.name === 'Lead') return leadRepo;
      if (entity.name === 'Distribution') return distributionRepo;
      if (entity.name === 'Broker') return brokerRepo;
      return memberRepo;
    },
  };

  const form = { id: 1, name: 'Lead Registration' } as Form;
  const input = {
    name: 'Ada',
    email: 'ada@example.com',
    phone: null,
    ipAddress: '203.0.113.9',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    leadRepo.count.mockResolvedValue(0);
    memberRepo.find.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: (cb: (m: unknown) => unknown) => cb(manager),
          },
        },
      ],
    }).compile();

    service = module.get(AssignmentService);
  });

  it('links a duplicate to the distribution so it appears on the detail page', async () => {
    // The specification requires the distribution detail page to list
    // duplicates alongside sent, unsent and failed leads. Returning before the
    // distribution is resolved leaves distributionId null and the duplicate
    // never shows up there.
    distributionRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    leadRepo.findOne.mockResolvedValue({ id: 99, brokerId: 3 });

    const lead = await service.submit(form, input);

    expect(lead.status).toBe(LeadStatus.DUPLICATE);
    expect(lead.distributionId).toBe(7);
    expect(lead.brokerId).toBeUndefined();
  });

  it('names the broker a duplicate is already assigned to', async () => {
    // The note is read by a person deciding what to do about the duplicate.
    // "broker #3" makes them go and look the id up.
    distributionRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    leadRepo.findOne.mockResolvedValue({ id: 99, brokerId: 3 });
    brokerRepo.findOne.mockResolvedValue({ id: 3, name: 'Broker A' });

    const lead = await service.submit(form, input);

    expect(lead.note).toBe('Already assigned to Broker A');
  });

  it('falls back to the id when that broker no longer exists', async () => {
    distributionRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    leadRepo.findOne.mockResolvedValue({ id: 99, brokerId: 3 });
    brokerRepo.findOne.mockResolvedValue(null);

    const lead = await service.submit(form, input);

    expect(lead.note).toBe('Already assigned to broker #3');
  });

  it('stores the visitor IP on every path', async () => {
    distributionRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    leadRepo.findOne.mockResolvedValue({ id: 99, brokerId: 3 });

    const lead = await service.submit(form, input);

    expect(lead.ipAddress).toBe('203.0.113.9');
  });

  it('marks a lead unsent when no distribution exists', async () => {
    distributionRepo.findOne.mockResolvedValue(null);
    leadRepo.findOne.mockResolvedValue(null);

    const lead = await service.submit(form, input);

    expect(lead.status).toBe(LeadStatus.UNSENT);
    expect(lead.note).toBe('No active distribution');
  });

  it('marks a lead unsent when nobody is eligible', async () => {
    distributionRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    leadRepo.findOne.mockResolvedValue(null);
    memberRepo.find.mockResolvedValue([]);

    const lead = await service.submit(form, input);

    expect(lead.status).toBe(LeadStatus.UNSENT);
    expect(lead.note).toBe('No eligible broker at submission time');
  });

  it('assigns to an eligible broker and timestamps it', async () => {
    distributionRepo.findOne.mockResolvedValue({ id: 7, isActive: true });
    leadRepo.findOne.mockResolvedValue(null);
    memberRepo.find.mockResolvedValue([
      {
        brokerId: 5,
        percentage: 100,
        isActive: true,
        broker: {
          id: 5,
          isActive: true,
          dailyCap: 0,
          timezone: 'UTC',
          openMinute: 0,
          closeMinute: 1440,
          workingDays: '1,2,3,4,5,6,7',
        },
      },
    ]);

    const lead = await service.submit(form, input);

    expect(lead.status).toBe(LeadStatus.SENT);
    expect(lead.brokerId).toBe(5);
    expect(lead.assignedAt).toBeInstanceOf(Date);
  });
});
