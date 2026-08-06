import type { Request } from 'express';
import { getClientIp } from './client-ip';

/** Minimal Express request shaped for the IP reader. */
function request(options: {
  trustProxy?: boolean;
  forwarded?: string | string[];
  ip?: string;
  remoteAddress?: string;
}): Request {
  return {
    app: { get: () => options.trustProxy ?? false },
    headers: options.forwarded ? { 'x-forwarded-for': options.forwarded } : {},
    ip: options.ip,
    socket: { remoteAddress: options.remoteAddress },
  } as unknown as Request;
}

describe('getClientIp', () => {
  it('reads the socket address when the proxy is not trusted', () => {
    expect(getClientIp(request({ ip: '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('ignores X-Forwarded-For when the proxy is not trusted', () => {
    // Otherwise any client could spoof its own IP by setting the header.
    expect(
      getClientIp(
        request({ forwarded: '1.2.3.4', ip: '203.0.113.7', trustProxy: false }),
      ),
    ).toBe('203.0.113.7');
  });

  it('uses the first X-Forwarded-For entry when the proxy is trusted', () => {
    expect(
      getClientIp(
        request({
          trustProxy: true,
          forwarded: '198.51.100.5, 10.0.0.1, 10.0.0.2',
          ip: '10.0.0.1',
        }),
      ),
    ).toBe('198.51.100.5');
  });

  it('handles a repeated header arriving as an array', () => {
    expect(
      getClientIp(
        request({ trustProxy: true, forwarded: ['198.51.100.5'], ip: '10.0.0.1' }),
      ),
    ).toBe('198.51.100.5');
  });

  it('falls back to the socket when the trusted header is empty', () => {
    expect(
      getClientIp(request({ trustProxy: true, forwarded: '', ip: '203.0.113.7' })),
    ).toBe('203.0.113.7');
  });

  it('unwraps an IPv4 address in IPv6 clothing', () => {
    expect(getClientIp(request({ ip: '::ffff:127.0.0.1' }))).toBe('127.0.0.1');
  });

  it('never returns empty, since a lead without an IP is a fail condition', () => {
    expect(getClientIp(request({}))).toBe('unknown');
  });
});
