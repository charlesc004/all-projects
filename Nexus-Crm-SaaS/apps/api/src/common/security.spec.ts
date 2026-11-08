import { ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { assertCanMutate, assertManager, csrfProtection, Principal } from './security';

const user: Principal = {
  id: 'sales-a',
  organizationId: 'tenant-a',
  name: 'Sales A',
  email: 'sales@example.test',
  role: 'SALES_REP',
};
describe('server authorization policies', () => {
  it('allows representatives to edit only records assigned to them', () => {
    expect(() => assertCanMutate(user, { ownerId: user.id })).not.toThrow();
    expect(() => assertCanMutate(user, { ownerId: 'someone-else' })).toThrow(ForbiddenException);
    expect(() => assertCanMutate(user, { assigneeId: 'someone-else' })).toThrow(ForbiddenException);
  });
  it('prevents representatives from archiving CRM records but allows deleting their tasks', () => {
    expect(() => assertCanMutate(user, { ownerId: user.id }, true)).toThrow(ForbiddenException);
    expect(() => assertCanMutate(user, { assigneeId: user.id }, true, true)).not.toThrow();
  });
  it('reserves manager reports and allows managers to edit tenant records', () => {
    expect(() => assertManager(user)).toThrow(ForbiddenException);
    expect(() => assertManager({ ...user, role: 'MANAGER' })).not.toThrow();
    expect(() =>
      assertCanMutate({ ...user, role: 'MANAGER' }, { ownerId: 'other' }, true),
    ).not.toThrow();
  });
});

describe('cookie request forgery protection', () => {
  const res = () => {
    const response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
    return response as unknown as Response;
  };
  it('requires the custom mutation header and rejects an untrusted origin', () => {
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    const next = jest.fn() as NextFunction;
    const missing = res();
    csrfProtection({ method: 'POST', headers: {} } as Request, missing, next);
    expect(missing.status).toHaveBeenCalledWith(403);
    const foreign = res();
    csrfProtection(
      {
        method: 'PATCH',
        headers: { 'x-nexus-csrf': '1', origin: 'https://untrusted.example.test' },
      } as unknown as Request,
      foreign,
      next,
    );
    expect(foreign.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
  it('accepts same-origin mutations and ordinary read requests', () => {
    process.env.WEB_ORIGIN = 'http://localhost:3000';
    const next = jest.fn() as NextFunction;
    csrfProtection(
      {
        method: 'POST',
        headers: { 'x-nexus-csrf': '1', origin: 'http://localhost:3000' },
      } as unknown as Request,
      res(),
      next,
    );
    csrfProtection({ method: 'GET', headers: {} } as Request, res(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
