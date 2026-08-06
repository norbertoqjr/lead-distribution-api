import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService, SessionUser } from './auth.service';

const user: SessionUser = { id: 1, email: 'admin@example.com', name: 'Admin' };

function build(corsOrigin: string) {
  const auth = {
    validate: jest.fn().mockResolvedValue(user),
    sign: jest.fn().mockReturnValue('token'),
  } as unknown as AuthService;

  const config = {
    get: (key: string) =>
      ({ CORS_ORIGIN: corsOrigin, SESSION_COOKIE_NAME: 'lds_session' })[key],
  } as unknown as ConfigService;

  const cookie = jest.fn();
  const response = { cookie } as unknown as Response;

  return { controller: new AuthController(auth, config), response, cookie };
}

describe('AuthController login cookie', () => {
  const credentials = { email: user.email, password: 'secret' };

  it('marks the session cookie Secure when the site is served over https', async () => {
    const { controller, response, cookie } = build('https://leads.example.com');

    await controller.login(credentials, response);

    expect(cookie).toHaveBeenCalledWith(
      'lds_session',
      'token',
      expect.objectContaining({ secure: true }),
    );
  });

  it('does not, over plain http', async () => {
    // A Secure cookie is dropped by the browser on an http origin, so the user
    // signs in successfully and is bounced straight back to the login page.
    const { controller, response, cookie } = build('http://203.0.113.5:8192');

    await controller.login(credentials, response);

    expect(cookie).toHaveBeenCalledWith(
      'lds_session',
      'token',
      expect.objectContaining({ secure: false, httpOnly: true }),
    );
  });
});
