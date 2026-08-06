import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService, SessionUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private get cookieName(): string {
    return this.config.get<string>('SESSION_COOKIE_NAME') ?? 'lds_session';
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SessionUser> {
    const user = await this.auth.validate(dto);

    response.cookie(this.cookieName, this.auth.sign(user), {
      // httpOnly keeps the token out of reach of client JavaScript.
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response): { ok: true } {
    response.clearCookie(this.cookieName, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<SessionUser | null> {
    return this.auth.findById(user.id);
  }
}
