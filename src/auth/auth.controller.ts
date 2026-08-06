import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService, SessionUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  /**
   * A Secure cookie is discarded by the browser over plain HTTP, which reads as
   * a login that succeeds and then bounces straight back to the sign-in page.
   * NODE_ENV cannot answer this — production here is served over http on a bare
   * IP — so the public origin's own scheme decides.
   */
  private get cookieSecure(): boolean {
    return (this.config.get<string>('CORS_ORIGIN') ?? '').startsWith('https://');
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
      secure: this.cookieSecure,
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

  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<SessionUser> {
    // Always the caller's own id, never one from the body.
    return this.auth.updateProfile(user.id, dto);
  }
}
