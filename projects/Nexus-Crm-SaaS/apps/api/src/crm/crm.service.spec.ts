import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CrmService, validateStageTransition } from './crm.service';
import { Principal } from '../common/security';
import { PrismaService } from '../database/prisma.service';

const user: Principal = {
  id: 'sales-a',
  organizationId: 'tenant-a',
  role: 'SALES_REP',
  name: 'Sales',
  email: 'sales@example.test',
};
describe('deal transition rules', () => {
  it('allows open stages to progress or move backwards', () => {
    expect(() => validateStageTransition('QUALIFICATION', 'NEGOTIATION')).not.toThrow();
    expect(() => validateStageTransition('NEGOTIATION', 'DISCOVERY')).not.toThrow();
  });
  it('requires a reason for a lost deal and prevents reopening a terminal deal', () => {
    expect(() => validateStageTransition('PROPOSAL', 'LOST', '  ')).toThrow(BadRequestException);
    expect(() => validateStageTransition('PROPOSAL', 'LOST', 'Budget postponed')).not.toThrow();
    expect(() => validateStageTransition('WON', 'QUALIFICATION')).toThrow(ConflictException);
    expect(() => validateStageTransition('LOST', 'WON')).toThrow(ConflictException);
    expect(() => validateStageTransition('WON', 'WON')).not.toThrow();
  });
});
describe('tenant-scoped record access', () => {
  it('scopes guessed identifiers to current organization and excludes archived records', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = { lead: { findFirst } } as unknown as PrismaService;
    const service = new CrmService(db);
    await expect(service.get('lead', 'foreign-id', user)).rejects.toThrow(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'foreign-id',
          organizationId: 'tenant-a',
          ownerId: 'sales-a',
          archivedAt: null,
        },
      }),
    );
  });
  it('rejects arbitrary sort fields before touching the database', async () => {
    const service = new CrmService({} as PrismaService);
    await expect(service.list('lead', { sortBy: 'passwordHash' }, user)).rejects.toThrow(
      BadRequestException,
    );
  });
  it('refuses an assignee in another organization', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const db = { user: { findFirst } } as unknown as PrismaService;
    await expect(
      new CrmService(db).validateRelations(db, { ownerId: 'foreign-user' }, user),
    ).rejects.toThrow(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-user', organizationId: 'tenant-a', active: true },
    });
  });
});
