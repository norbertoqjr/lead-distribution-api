import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the global JwtAuthGuard. The guard protects everything
 * by default, so forgetting this decorator leaves a route secured — the safe
 * direction to fail.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
