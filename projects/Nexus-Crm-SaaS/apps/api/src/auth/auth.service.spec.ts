import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { Response } from 'express';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { Principal } from '../common/security';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-password-hash'),
}));
const user: Principal = {
  id: 'user-a',
  name: 'Alex',
  email: 'alex@example.test',
  role: 'ADMIN',
  organizationId: 'org-a',
};
const compareMock = compare as unknown as jest.Mock;
const response = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as unknown as Response;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_ACCESS_SECRET = 'test-secret-with-at-least-thirty-two-characters';
});

describe('authentication and refresh lifecycle', () => {
  it('uses the same generic authentication error for a missing account and wrong password', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...user, passwordHash: 'hash', active: true });
    compareMock.mockResolvedValue(false);
    const auth = new AuthService({ user: { findUnique } } as unknown as PrismaService);
    for (const email of ['missing@example.test', user.email]) {
      await expect(auth.login(email, 'wrong', response())).rejects.toThrow(
        'Invalid email or password.',
      );
    }
    expect(compareMock).toHaveBeenCalledTimes(2);
  });
  it('stores a refresh digest and sets secure HttpOnly cookie options without returning credentials', async () => {
    const create = jest.fn().mockResolvedValue({});
    const db = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ...user, passwordHash: 'hash', active: true }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(user),
      },
      refreshToken: { create },
    } as unknown as PrismaService;
    compareMock.mockResolvedValue(true);
    const res = response();
    const result = await new AuthService(db).login(user.email, 'a-valid-password', res);
    expect(result).toEqual({ user });
    const calls = (res.cookie as unknown as jest.Mock).mock.calls as [
      string,
      string,
      Record<string, unknown>,
    ][];
    const refresh = calls.find((call) => call[0] === 'nexus_refresh')!;
    const raw = refresh[1] as string;
    const stored = create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(stored.tokenHash).not.toBe(raw);
    expect(refresh[2]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/v1' });
  });
  it('revokes the entire refresh family when an already consumed token is replayed', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const db = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({
          userId: user.id,
          user: { ...user, active: true },
          expiresAt: new Date(Date.now() + 60000),
          revokedAt: new Date(),
          familyId: 'family-a',
        }),
        updateMany,
      },
    } as unknown as PrismaService;
    const res = response();
    await expect(new AuthService(db).refresh('replayed-token', res)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-a', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });
  it('revokes the session family on logout and clears both cookies', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const db = {
      refreshToken: {
        findUnique: jest.fn().mockResolvedValue({ familyId: 'family-a' }),
        updateMany,
      },
    } as unknown as PrismaService;
    const res = response();
    await new AuthService(db).logout('refresh-token', res);
    expect(updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-a' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
  });
  it('keeps the current session valid when the password-change form has an incorrect current password', async () => {
    const db = {
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ passwordHash: 'hash' }) },
    } as unknown as PrismaService;
    compareMock.mockResolvedValue(false);
    await expect(
      new AuthService(db).changePassword(user, 'incorrect', 'ChangedPassword!2026'),
    ).rejects.toThrow(BadRequestException);
  });
});
