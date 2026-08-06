import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FormsService } from './forms.service';
import { Form } from '../entities';

describe('FormsService', () => {
  let service: FormsService;
  const findOne = jest.fn();
  const save = jest.fn();
  const create = jest.fn((input: unknown) => input);

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsService,
        {
          provide: getRepositoryToken(Form),
          useValue: { findOne, save, create },
        },
      ],
    }).compile();

    service = module.get(FormsService);
  });

  const dto = { name: 'Lead Registration', slug: 'lead-registration' };

  it('creates the first form and pins the singleton flag', async () => {
    findOne.mockResolvedValue(null);
    save.mockImplementation((form: unknown) => Promise.resolve(form));

    await service.create(dto);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ ...dto, singleton: true }),
    );
  });

  it('refuses a second form', async () => {
    findOne.mockResolvedValue({ id: 1, ...dto });

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(save).not.toHaveBeenCalled();
  });

  it('turns a duplicate-key race into a conflict rather than a 500', async () => {
    // Two concurrent requests both pass the check above; the database rejects
    // the loser on the unique index, and that must read as a conflict.
    findOne.mockResolvedValue(null);
    const dbError = new QueryFailedError('INSERT', [], new Error('dup'));
    (dbError as unknown as { code: string }).code = 'ER_DUP_ENTRY';
    save.mockRejectedValue(dbError);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows an unrelated database error untouched', async () => {
    findOne.mockResolvedValue(null);
    const dbError = new QueryFailedError('INSERT', [], new Error('offline'));
    (dbError as unknown as { code: string }).code = 'ER_LOCK_WAIT_TIMEOUT';
    save.mockRejectedValue(dbError);

    await expect(service.create(dto)).rejects.toBeInstanceOf(QueryFailedError);
  });

  it('returns null before any form exists, rather than throwing', async () => {
    findOne.mockResolvedValue(null);

    // The admin form page renders a create card off this null.
    await expect(service.findOne()).resolves.toBeNull();
  });

  it('finds a form by slug', async () => {
    findOne.mockResolvedValue({ id: 1, ...dto });

    await expect(service.findBySlug('lead-registration')).resolves.toMatchObject(
      { slug: 'lead-registration' },
    );
  });

  it('404s an unknown slug so the public page can render not-found', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.findBySlug('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
