import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type SessionUser = { id: number; email: string; name: string | null };

/**
 * A real bcrypt hash of a value no password will ever equal, at the same cost
 * factor the seed uses. Compared against when the email is unknown so both
 * paths take the same time. Generated once, offline; it is not a secret.
 */
const DECOY_HASH =
  '$2a$12$.ysgZsqYymhnMNUNBBZhd.ncMtVccs2JyEku8dCSOtzzM6dyq/PmO';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async validate(dto: LoginDto): Promise<SessionUser> {
    const user = await this.users.findOne({
      where: { email: dto.email },
      // passwordHash is select:false on the entity, so ask for it explicitly.
      select: ['id', 'email', 'name', 'passwordHash'],
    });

    // Compare against a decoy when the user is missing, so response time does
    // not reveal whether an address has an account.
    //
    // This must be a *valid* bcrypt hash. An malformed placeholder is rejected
    // by the parser in microseconds instead of costing a real comparison,
    // which reintroduces exactly the timing difference it is meant to hide
    // (measured: 0.001ms against a broken hash, 310ms against a valid one).
    const hash = user?.passwordHash ?? DECOY_HASH;
    const matches = await bcrypt.compare(dto.password, hash);

    if (!user || !matches) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  sign(user: SessionUser): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  /**
   * Updates the signed-in admin's own profile. Email is not accepted: it is
   * the login identifier, so changing it here risks a lockout.
   */
  async updateProfile(
    id: number,
    dto: UpdateProfileDto,
  ): Promise<SessionUser> {
    const user = await this.users.findOne({
      where: { id },
      select: ['id', 'email', 'name', 'passwordHash'],
    });

    if (!user) throw new NotFoundException('Account not found');

    if (dto.newPassword) {
      // Re-authenticate before changing the password, so a hijacked session
      // cannot lock the real owner out of their own account.
      const matches = await bcrypt.compare(
        dto.currentPassword ?? '',
        user.passwordHash,
      );

      if (!matches) {
        throw new UnauthorizedException('Your current password is incorrect');
      }

      user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    }

    if (dto.name !== undefined) {
      user.name = dto.name === '' ? null : dto.name;
    }

    await this.users.save(user);

    return { id: user.id, email: user.email, name: user.name };
  }

  async findById(id: number): Promise<SessionUser | null> {
    return this.users.findOne({
      where: { id },
      select: ['id', 'email', 'name'],
    });
  }
}
