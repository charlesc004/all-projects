import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { PrismaService } from '../database/prisma.service';

export interface Principal {
  id: string;
  organizationId: string;
  role: Role;
  name: string;
  email: string;
}
export interface AuthRequest extends Request {
  user: Principal;
}
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  organizationId: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    try {
      const payload = verify(request.cookies?.nexus_access ?? '', process.env.JWT_ACCESS_SECRET!, {
        algorithms: ['HS256'],
        issuer: 'nexus-crm',
        audience: 'nexus-web',
      });
      if (typeof payload === 'string' || !payload.sub) throw new Error('Invalid token');
      const user = await this.db.user.findUnique({
        where: { id: payload.sub },
        select: { ...publicUserSelect, active: true },
      });
      if (!user?.active) throw new Error('Inactive account');
      request.user = user;
    } catch {
      throw new UnauthorizedException('Please sign in to continue.');
    }
    const allowed = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed && !allowed.includes(request.user.role))
      throw new ForbiddenException('You do not have permission to perform this action.');
    return true;
  }
}

export function csrfProtection(request: Request, response: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
  const expectedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  const origin = request.headers.origin;
  // Custom headers cannot be submitted by HTML forms. CORS only permits our web origin.
  if (request.headers['x-nexus-csrf'] !== '1' || (origin && origin !== expectedOrigin)) {
    response
      .status(403)
      .json({ statusCode: 403, message: 'Request origin could not be verified.' });
    return;
  }
  next();
}

export function assertManager(user: Principal) {
  if (user.role === 'SALES_REP')
    throw new ForbiddenException('Manager or administrator access is required.');
}

export function recordScope(user: Principal, task = false) {
  return {
    organizationId: user.organizationId,
    ...(user.role === 'SALES_REP' ? (task ? { assigneeId: user.id } : { ownerId: user.id }) : {}),
  };
}

export function activityScope(user: Principal) {
  const kinds = ['task', 'lead', 'deal', 'contact', 'company'] as const;
  return {
    organizationId: user.organizationId,
    ...(user.role === 'SALES_REP'
      ? {
          // Conversion and task events can link several records. Authorize their
          // primary record so a shared company cannot reveal a colleague's work.
          OR: kinds.map((kind, index) => ({
            ...Object.fromEntries(kinds.slice(0, index).map((prior) => [`${prior}Id`, null])),
            [kind]: {
              is: {
                ...recordScope(user, kind === 'task'),
                ...(kind === 'task' ? {} : { archivedAt: null }),
              },
            },
          })),
        }
      : {}),
  };
}
export function assertCanMutate(
  user: Principal,
  record: { ownerId?: string; assigneeId?: string },
  deleting = false,
  task = false,
) {
  if (user.role !== 'SALES_REP') return;
  if ((deleting && !task) || (record.ownerId ?? record.assigneeId) !== user.id)
    throw new ForbiddenException('You can only update records assigned to you.');
}
