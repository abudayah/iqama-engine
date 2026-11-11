import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { ApiKeyGuard } from '../auth/api-key.guard';

/** Window for both limits. */
export const THROTTLE_WINDOW_MS = 60_000;
/**
 * Public routes (schedule, health, public Hijri reads), per client IP.
 * Generous on purpose: display screens poll the schedule and must never be blocked.
 */
export const PUBLIC_LIMIT_PER_MIN = 300;
/**
 * Routes protected by ApiKeyGuard (all admin routes), per client IP, ONE shared
 * counter for all of them. This is also what slows down guessing the admin key.
 */
export const ADMIN_LIMIT_PER_MIN = 120;

/**
 * A route is an "admin route" when ApiKeyGuard is applied to its handler or
 * its controller. New guarded routes are covered automatically.
 */
export function isAdminRoute(context: ExecutionContext): boolean {
  const guards = [
    ...((Reflect.getMetadata(GUARDS_METADATA, context.getHandler()) as
      | unknown[]
      | undefined) ?? []),
    ...((Reflect.getMetadata(GUARDS_METADATA, context.getClass()) as
      | unknown[]
      | undefined) ?? []),
  ];
  return guards.includes(ApiKeyGuard);
}

export const THROTTLER_OPTIONS: ThrottlerModuleOptions = [
  {
    name: 'default',
    ttl: THROTTLE_WINDOW_MS,
    limit: PUBLIC_LIMIT_PER_MIN,
    skipIf: isAdminRoute,
  },
  {
    name: 'admin',
    ttl: THROTTLE_WINDOW_MS,
    limit: ADMIN_LIMIT_PER_MIN,
    skipIf: (context) => !isAdminRoute(context),
    // One bucket per client for every admin route (the default key is per handler).
    generateKey: (_context, tracker, name) =>
      createHash('sha256').update(`${name}:${tracker}`).digest('hex'),
  },
];
