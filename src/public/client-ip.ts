import type { Request } from 'express';

/**
 * Visitor IP for the lead record. Storing this is mandatory — a lead without
 * one is an automatic fail condition — so this never returns empty.
 *
 * X-Forwarded-For is only consulted when Express is configured to trust the
 * proxy; otherwise a client could spoof the header.
 */
export function getClientIp(request: Request): string {
  const trustsProxy = Boolean(request.app?.get('trust proxy'));

  if (trustsProxy) {
    const forwarded = request.headers['x-forwarded-for'];
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const first = raw?.split(',')[0]?.trim();
    if (first) return normalize(first);
  }

  return normalize(request.ip ?? request.socket.remoteAddress ?? 'unknown');
}

/** ::ffff:127.0.0.1 is a v4 address in v6 clothing; store the readable form. */
function normalize(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}
