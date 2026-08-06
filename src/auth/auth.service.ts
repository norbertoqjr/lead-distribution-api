import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities';
import { LoginDto } from './dto/login.dto';

export type SessionUser = { id: number; email: string; name: string | null };

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

    // Compare against a dummy hash when the user is missing so the response
    // time does not reveal whether an address exists.
    const hash = user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const matches = await bcrypt.compare(dto.password, hash);

    if (!user || !matches) {
      throw new UnauthorizedException('Incorrect email or password');
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  sign(user: SessionUser): string {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  async findById(id: number): Promise<SessionUser | null> {
    return this.users.findOne({
      where: { id },
      select: ['id', 'email', 'name'],
    });
  }
}
