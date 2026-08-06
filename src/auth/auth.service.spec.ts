import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../entities';

describe('AuthService', () => {
  let service: AuthService;
  const findOne = jest.fn();
  const sign = jest.fn().mockReturnValue('signed.jwt.token');

  const password = 'correct-horse';
  let passwordHash: string;

  beforeAll(async () => {
    // Cost 4 keeps the suite fast; production seeds at 12.
    passwordHash = await bcrypt.hash(password, 4);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { findOne } },
        { provide: JwtService, useValue: { sign } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('returns the user when the password matches', async () => {
    findOne.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      name: 'Admin',
      passwordHash,
    });

    await expect(
      service.validate({ email: 'admin@example.com', password }),
    ).resolves.toEqual({ id: 1, email: 'admin@example.com', name: 'Admin' });
  });

  it('explicitly selects the password hash, which the entity hides by default', async () => {
    findOne.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      name: null,
      passwordHash,
    });

    await service.validate({ email: 'admin@example.com', password });

    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.arrayContaining(['passwordHash']) as string[],
      }),
    );
  });

  it('rejects a wrong password', async () => {
    findOne.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      name: null,
      passwordHash,
    });

    await expect(
      service.validate({ email: 'admin@example.com', password: 'wrong-pass' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email with the same message as a wrong password', async () => {
    findOne.mockResolvedValue(null);

    // Identical wording on both paths: a distinct "no such user" reply would
    // let anyone enumerate which addresses have accounts.
    await expect(
      service.validate({ email: 'nobody@example.com', password }),
    ).rejects.toThrow('Incorrect email or password');
  });

  it('does not short-circuit on a missing user, so timing does not leak existence', async () => {
    findOne.mockResolvedValue(null);

    // bcryptjs exports a non-configurable `compare`, so it cannot be spied on.
    // Instead assert the observable consequence: the unknown-user path still
    // pays for a hash comparison rather than returning immediately, which is
    // what stops response time revealing whether an address has an account.
    const started = process.hrtime.bigint();
    await expect(
      service.validate({ email: 'nobody@example.com', password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;

    // A bare `return null` costs microseconds; any real bcrypt compare costs
    // far more. The threshold is deliberately loose to stay stable on CI.
    expect(elapsedMs).toBeGreaterThan(1);
  });

  it('signs a token carrying the user id and email', () => {
    expect(service.sign({ id: 7, email: 'a@b.co', name: null })).toBe(
      'signed.jwt.token',
    );
    expect(sign).toHaveBeenCalledWith({ sub: 7, email: 'a@b.co' });
  });

  it('never returns the password hash from findById', async () => {
    findOne.mockResolvedValue({ id: 1, email: 'a@b.co', name: 'Admin' });

    const user = await service.findById(1);

    expect(user).not.toHaveProperty('passwordHash');
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      select: ['id', 'email', 'name'],
    });
  });
});
