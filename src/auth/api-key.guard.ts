import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { timingSafeEqual, createHash } from 'crypto';

/**
 * Hash both values to a fixed-length buffer before comparing so that
 * timingSafeEqual never throws on mismatched buffer lengths, while still
 * being resistant to timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const password = request.headers['x-api-key'];

    const validPassword = this.configService.get<string>('ADMIN_PASSWORD');

    if (!validPassword) {
      throw new UnauthorizedException(
        'Admin password is not configured on the server',
      );
    }

    if (!password) {
      throw new UnauthorizedException('Password is required');
    }

    if (!safeCompare(String(password), validPassword)) {
      throw new UnauthorizedException('Invalid password');
    }

    return true;
  }
}
