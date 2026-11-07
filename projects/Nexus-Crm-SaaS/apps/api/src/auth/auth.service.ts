import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { sign } from 'jsonwebtoken';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { Principal, publicUserSelect } from '../common/security';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly db: PrismaService) {}
  private cookies(response: Response, user: Principal, refresh: string) {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1',
    };
    const access = sign({}, process.env.JWT_ACCESS_SECRET!, {
      algorithm: 'HS256',
      subject: user.id,
      issuer: 'nexus-crm',
      audience: 'nexus-web',
      expiresIn: '15m',
    });
    response.cookie('nexus_access', access, { ...options, maxAge: 15 * 60 * 1000 });
    response.cookie('nexus_refresh', refresh, { ...options, maxAge: REFRESH_TTL });
  }
  clearCookies(response: Response) {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/api/v1',
    };
    response.clearCookie('nexus_access', options);
    response.clearCookie('nexus_refresh', options);
  }
  async login(email: string, password: string, response: Response) {
    const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always execute bcrypt, including for an unknown address, to reduce account enumeration.
    const valid = await compare(
      password,
      user?.passwordHash ?? '$2b$12$tRwQwHYbP0FPHUoD1bZtE.0N9.QVJ8qXfQW8sbKPT4mSiwSG9E72y',
    );
    if (!user?.active || !valid) throw new UnauthorizedException('Invalid email or password.');
    const refresh = randomBytes(48).toString('base64url');
    await this.db.refreshToken.create({
      data: {
        tokenHash: digest(refresh),
        userId: user.id,
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + REFRESH_TTL),
      },
    });
    this.cookies(response, user, refresh);
    const publicUser = await this.db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });
    return { user: publicUser };
  }
  async refresh(raw: string | undefined, response: Response) {
    if (!raw) throw new UnauthorizedException('Session expired. Please sign in again.');
    const token = await this.db.refreshToken.findUnique({
      where: { tokenHash: digest(raw) },
      include: { user: true },
    });
    if (!token || token.expiresAt < new Date() || !token.user.active) {
      this.clearCookies(response);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    if (token.revokedAt) {
      await this.db.refreshToken.updateMany({
        where: { familyId: token.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.clearCookies(response);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    const replacement = randomBytes(48).toString('base64url');
    try {
      await this.db.$transaction(async (tx) => {
        const consumed = await tx.refreshToken.updateMany({
          where: { id: token.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (consumed.count !== 1) throw new ConflictException('Refresh token already used.');
        await tx.refreshToken.create({
          data: {
            tokenHash: digest(replacement),
            userId: token.userId,
            familyId: token.familyId,
            expiresAt: new Date(Date.now() + REFRESH_TTL),
          },
        });
      });
    } catch {
      await this.db.refreshToken.updateMany({
        where: { familyId: token.familyId },
        data: { revokedAt: new Date() },
      });
      this.clearCookies(response);
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    this.cookies(response, token.user, replacement);
    return {
      user: await this.db.user.findUniqueOrThrow({
        where: { id: token.userId },
        select: publicUserSelect,
      }),
    };
  }
  async logout(raw: string | undefined, response: Response) {
    if (raw) {
      const token = await this.db.refreshToken.findUnique({ where: { tokenHash: digest(raw) } });
      if (token)
        await this.db.refreshToken.updateMany({
          where: { familyId: token.familyId },
          data: { revokedAt: new Date() },
        });
    }
    this.clearCookies(response);
    return { message: 'Signed out successfully.' };
  }
  async changePassword(user: Principal, currentPassword: string, newPassword: string) {
    const current = await this.db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await compare(currentPassword, current.passwordHash)))
      throw new BadRequestException('Current password is incorrect.');
    await this.db.$transaction([
      this.db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hash(newPassword, 12) },
      }),
      this.db.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: 'Password updated. Sign in again to continue.' };
  }
}
