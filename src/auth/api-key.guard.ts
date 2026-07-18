import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

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

    if (password !== validPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    return true;
  }
}
