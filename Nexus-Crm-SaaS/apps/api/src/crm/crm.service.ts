import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service';
import { assertCanMutate, Principal, publicUserSelect, recordScope } from '../common/security';
import {
  EntityKind,
  entitySchemas,
  listSchema,
  stages,
  statuses,
  taskStatuses,
} from '../common/validation';

type Client = Prisma.TransactionClient;
export interface CRMRecord {
  id: string;
  organizationId: string;
  ownerId?: string;
  assigneeId?: string;
  status?: string;
  stage?: string;
  title?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  convertedAt?: Date | null;
  convertedContactId?: string | null;
  convertedCompanyId?: string | null;
  convertedDealId?: string | null;
  [key: string]: unknown;
}
// All dynamic CRUD calls share this narrow structural interface. Prisma's generated
// delegates are intentionally erased here; validation and tenant policy stay centralized.
interface CRMDelegate {
  findFirst(query: Record<string, unknown>): Promise<CRMRecord | null>;
  findMany(query: Record<string, unknown>): Promise<CRMRecord[]>;
  count(query: Record<string, unknown>): Promise<number>;
  create(query: Record<string, unknown>): Promise<CRMRecord>;
  update(query: Record<string, unknown>): Promise<CRMRecord>;
  delete(query: Record<string, unknown>): Promise<CRMRecord>;
}
export const delegate = (client: Client, kind: EntityKind): CRMDelegate =>
  client[kind] as unknown as CRMDelegate;
const relationIncludes = (kind: EntityKind, user: Principal) =>
  kind === 'task'
    ? {
        assignee: { select: publicUserSelect },
        ...(user.role === 'SALES_REP'
          ? Object.fromEntries(
              ['lead', 'contact', 'company', 'deal'].map((relation) => [
                relation,
                { where: { ...recordScope(user), archivedAt: null }, select: { id: true } },
              ]),
            )
          : {}),
      }
    : {
        owner: { select: publicUserSelect },
        ...(kind === 'contact' || kind === 'deal'
          ? {
              company:
                user.role === 'SALES_REP'
                  ? { where: { ...recordScope(user), archivedAt: null } }
                  : true,
            }
          : {}),
        ...(kind === 'deal'
          ? {
              contact:
                user.role === 'SALES_REP'
                  ? { where: { ...recordScope(user), archivedAt: null } }
                  : true,
            }
          : {}),
        ...(kind === 'lead' && user.role === 'SALES_REP'
          ? Object.fromEntries(
              ['convertedContact', 'convertedCompany', 'convertedDeal'].map((relation) => [
                relation,
                { where: { ...recordScope(user), archivedAt: null }, select: { id: true } },
              ]),
            )
          : {}),
        ...(kind === 'company'
          ? {
              _count: {
                select: {
                  contacts: { where: { ...recordScope(user), archivedAt: null } },
                  deals: { where: { ...recordScope(user), archivedAt: null } },
                },
              },
            }
          : {}),
      };
function visibleRecord(row: CRMRecord, user: Principal) {
  if (user.role !== 'SALES_REP') return row;
  const result = { ...row };
  for (const relation of [
    'lead',
    'contact',
    'company',
    'deal',
    'convertedContact',
    'convertedCompany',
    'convertedDeal',
  ]) {
    if (Object.hasOwn(result, relation) && !result[relation]) result[`${relation}Id`] = null;
    // These lightweight includes only authorize links; they are not new API content.
    if (relation.startsWith('converted') || Object.hasOwn(row, 'assigneeId'))
      delete result[relation];
  }
  return result;
}
const labels = (row: CRMRecord) => row.title ?? row.name ?? `${row.firstName} ${row.lastName}`;

export function validateStageTransition(current: string, next: string, reason?: string | null) {
  if (current === next) return;
  if (current === 'WON' || current === 'LOST')
    throw new ConflictException(
      'Closed deals cannot be reopened. Create a new opportunity instead.',
    );
  if (next === 'LOST' && !reason?.trim())
    throw new BadRequestException('Provide a reason when marking a deal as lost.');
}

@Injectable()
export class CrmService {
  constructor(private readonly db: PrismaService) {}
  async record(client: Client, kind: EntityKind, id: string, user: Principal, details = false) {
    const include = {
      ...relationIncludes(kind, user),
      ...(details && kind === 'company'
        ? {
            contacts: {
              where: { ...recordScope(user), archivedAt: null },
              include: { owner: { select: publicUserSelect } },
            },
            deals: {
              where: { ...recordScope(user), archivedAt: null },
              include: { owner: { select: publicUserSelect } },
            },
          }
        : {}),
      ...(details && kind === 'contact'
        ? {
            deals: {
              where: { ...recordScope(user), archivedAt: null },
              include: { owner: { select: publicUserSelect } },
            },
          }
        : {}),
    };
    const row = await delegate(client, kind).findFirst({
      where: {
        id,
        ...recordScope(user, kind === 'task'),
        ...(kind !== 'task' ? { archivedAt: null } : {}),
      },
      include,
    });
    if (!row) throw new NotFoundException('Record not found.');
    return row;
  }
  async get(kind: EntityKind, id: string, user: Principal) {
    return visibleRecord(await this.record(this.db, kind, id, user, true), user);
  }
  async list(kind: EntityKind, query: unknown, user: Principal) {
    const args = listSchema.parse(query);
    const allowed: Record<EntityKind, string[]> = {
      lead: [
        'createdAt',
        'updatedAt',
        'firstName',
        'lastName',
        'companyName',
        'status',
        'priority',
      ],
      contact: ['createdAt', 'updatedAt', 'firstName', 'lastName'],
      company: ['createdAt', 'updatedAt', 'name', 'industry'],
      deal: ['createdAt', 'updatedAt', 'title', 'value', 'stage', 'expectedCloseDate'],
      task: ['createdAt', 'updatedAt', 'title', 'dueDate', 'priority', 'status'],
    };
    if (!allowed[kind].includes(args.sortBy))
      throw new BadRequestException('Unsupported sort field.');
    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
      ...(kind !== 'task' ? { archivedAt: null } : {}),
    };
    const searchFields =
      kind === 'lead'
        ? ['firstName', 'lastName', 'email', 'companyName']
        : kind === 'contact'
          ? ['firstName', 'lastName', 'email']
          : kind === 'company'
            ? ['name', 'industry']
            : ['title'];
    if (args.search)
      where.OR = searchFields.map((field) => ({
        [field]: { contains: args.search, mode: 'insensitive' },
      }));
    if (args.ownerId && kind !== 'task') where.ownerId = args.ownerId;
    if (args.assigneeId && kind === 'task') where.assigneeId = args.assigneeId;
    // Ownership is authoritative even if a client submits another owner's filter.
    Object.assign(where, recordScope(user, kind === 'task'));
    if (args.companyId && ['contact', 'deal', 'task'].includes(kind))
      where.companyId = args.companyId;
    if (args.contactId && ['deal', 'task'].includes(kind)) where.contactId = args.contactId;
    if (args.priority && ['lead', 'task'].includes(kind)) where.priority = args.priority;
    if (args.source && kind === 'lead') where.source = args.source;
    if (args.stage && kind === 'deal') where.stage = args.stage;
    if (args.status && kind === 'lead') where.status = z.enum(statuses).parse(args.status);
    if (args.status && kind === 'task') where.status = z.enum(taskStatuses).parse(args.status);
    if (kind === 'task') {
      if (args.view === 'completed') where.AND = [{ status: 'COMPLETED' }];
      if (args.view === 'overdue' || args.view === 'upcoming') {
        where.AND = [{ status: { not: 'COMPLETED' } }];
        where.dueDate = args.view === 'overdue' ? { lt: new Date() } : { gte: new Date() };
      }
    }
    if (kind === 'deal' && (args.from || args.to)) {
      const from = args.from ? new Date(args.from) : undefined;
      const to = args.to ? new Date(`${args.to.slice(0, 10)}T23:59:59.999Z`) : undefined;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())))
        throw new BadRequestException('Invalid date filter.');
      where.expectedCloseDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
    }
    const [data, total] = await Promise.all([
      delegate(this.db, kind).findMany({
        where,
        include: relationIncludes(kind, user),
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
        orderBy: [{ [args.sortBy]: args.sortOrder }, { id: 'asc' }],
      }),
      delegate(this.db, kind).count({ where }),
    ]);
    return {
      data: data.map((row) => visibleRecord(row, user)),
      meta: {
        page: args.page,
        pageSize: args.pageSize,
        total,
        totalPages: Math.ceil(total / args.pageSize),
      },
    };
  }
  async validateRelations(
    client: Client,
    data: Record<string, unknown>,
    user: Principal,
    previous?: CRMRecord,
  ) {
    for (const key of ['ownerId', 'assigneeId']) {
      if (!data[key]) continue;
      const owner = await client.user.findFirst({
        where: { id: data[key] as string, organizationId: user.organizationId, active: true },
      });
      if (!owner) throw new NotFoundException('Assigned team member is unavailable.');
      if (user.role === 'SALES_REP' && owner.id !== user.id)
        throw new ForbiddenException('You may only assign records to yourself.');
    }
    for (const kind of ['lead', 'contact', 'company', 'deal'] as const) {
      const id = data[`${kind}Id`];
      if (id && id !== previous?.[`${kind}Id`]) await this.record(client, kind, String(id), user);
    }
    if (data.companyId && data.contactId) {
      const contact = await client.contact.findFirst({
        where: { id: String(data.contactId), organizationId: user.organizationId },
      });
      if (contact?.companyId && contact.companyId !== data.companyId)
        throw new BadRequestException('The contact belongs to a different company.');
    }
  }
  async activity(
    client: Client,
    user: Principal,
    kind: EntityKind,
    row: CRMRecord,
    type: string,
    title: string,
  ) {
    const related =
      kind === 'task'
        ? Object.fromEntries(
            ['leadId', 'contactId', 'companyId', 'dealId']
              .filter((key) => typeof row[key] === 'string')
              .map((key) => [key, row[key]]),
          )
        : {};
    return client.activity.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        [`${kind}Id`]: row.id,
        ...related,
        type,
        title,
      },
    });
  }
  private assertTaskRelations(data: Record<string, unknown>) {
    if (['leadId', 'contactId', 'companyId', 'dealId'].filter((key) => data[key]).length > 1)
      throw new BadRequestException('A task may be linked to one CRM record.');
  }
  async create(kind: EntityKind, input: unknown, user: Principal) {
    const data = entitySchemas[kind].parse(input) as Record<string, unknown>;
    data[kind === 'task' ? 'assigneeId' : 'ownerId'] ??= user.id;
    if (kind === 'lead' && data.status === 'CONVERTED')
      throw new BadRequestException('Use the lead conversion workflow.');
    if (kind === 'task') {
      this.assertTaskRelations(data);
      if (data.status === 'COMPLETED') data.completedAt = new Date();
    }
    if (kind === 'deal' && data.stage === 'LOST' && !data.lostReason)
      throw new BadRequestException('Provide a lost reason.');
    if (kind === 'deal' && ['WON', 'LOST'].includes(String(data.stage))) data.closedAt = new Date();
    return this.db.$transaction(async (tx) => {
      await this.validateRelations(tx, data, user);
      const row = await delegate(tx, kind).create({
        data: { ...data, organizationId: user.organizationId },
        include: relationIncludes(kind, user),
      });
      await this.activity(
        tx,
        user,
        kind,
        row,
        `${kind.toUpperCase()}_CREATED`,
        `Created ${kind}: ${labels(row)}`,
      );
      if (kind === 'task') await this.taskNotification(tx, row, user);
      return visibleRecord(row, user);
    });
  }
  async update(kind: EntityKind, id: string, input: unknown, user: Principal) {
    const data = entitySchemas[kind].partial().parse(input) as Record<string, unknown>;
    if (Object.keys(data).length === 0)
      throw new BadRequestException('Provide at least one field to update.');
    return this.db.$transaction(
      async (tx) => {
        const row = await this.record(tx, kind, id, user);
        assertCanMutate(user, row);
        if (kind === 'lead' && (row.status === 'CONVERTED' || data.status === 'CONVERTED'))
          throw new ConflictException('Converted leads cannot be edited. Use the linked contact.');
        await this.validateRelations(tx, { ...row, ...data }, user, row);
        if (kind === 'task') this.assertTaskRelations({ ...row, ...data });
        if (kind === 'deal' && data.stage) {
          validateStageTransition(
            row.stage!,
            String(data.stage),
            data.lostReason as string | undefined,
          );
          if (data.stage !== row.stage && ['WON', 'LOST'].includes(String(data.stage)))
            data.closedAt = new Date();
          if (data.stage !== 'LOST') data.lostReason = null;
        }
        if (kind === 'task' && data.status)
          data.completedAt = data.status === 'COMPLETED' ? new Date() : null;
        const updated = await delegate(tx, kind).update({
          where: { id, organizationId: user.organizationId },
          data,
          include: relationIncludes(kind, user),
        });
        const completed =
          kind === 'task' && data.status === 'COMPLETED' && row.status !== 'COMPLETED';
        const changedStage = kind === 'deal' && data.stage && data.stage !== row.stage;
        await this.activity(
          tx,
          user,
          kind,
          updated,
          completed
            ? 'TASK_COMPLETED'
            : changedStage
              ? 'DEAL_STAGE_CHANGED'
              : `${kind.toUpperCase()}_UPDATED`,
          completed
            ? `Completed task: ${labels(updated)}`
            : changedStage
              ? `${labels(updated)} moved to ${String(data.stage).toLowerCase()}`
              : `Updated ${kind}: ${labels(updated)}`,
        );
        if (kind === 'task' && data.assigneeId && data.assigneeId !== row.assigneeId)
          await this.taskNotification(tx, updated, user);
        return visibleRecord(updated, user);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async remove(kind: EntityKind, id: string, user: Principal) {
    return this.db.$transaction(async (tx) => {
      const row = await this.record(tx, kind, id, user);
      assertCanMutate(user, row, true, kind === 'task');
      await this.activity(
        tx,
        user,
        kind,
        row,
        `${kind.toUpperCase()}_${kind === 'task' ? 'DELETED' : 'ARCHIVED'}`,
        `${kind === 'task' ? 'Deleted' : 'Archived'} ${kind}: ${labels(row)}`,
      );
      if (kind === 'task')
        await delegate(tx, kind).delete({ where: { id, organizationId: user.organizationId } });
      else
        await delegate(tx, kind).update({
          where: { id, organizationId: user.organizationId },
          data: { archivedAt: new Date() },
        });
      return { message: kind === 'task' ? 'Task deleted.' : 'Record archived.' };
    });
  }
  private async taskNotification(client: Client, row: CRMRecord, user: Principal) {
    await client.notification.create({
      data: {
        userId: row.assigneeId!,
        organizationId: user.organizationId,
        title: 'Task assigned to you',
        body: String(row.title),
        href: '/tasks',
      },
    });
  }
  async convert(id: string, input: unknown, user: Principal) {
    const data = z
      .object({
        createDeal: z.boolean().default(false),
        dealTitle: z.string().trim().min(1).max(200).optional(),
        dealValue: z.coerce.number().min(0).max(999999999999.99).default(0),
      })
      .strict()
      .parse(input);
    return this.db.$transaction(async (tx) => {
      // Row lock serializes retries so two simultaneous requests cannot duplicate conversion.
      await tx.$queryRaw`SELECT id FROM "Lead" WHERE id = ${id} AND "organizationId" = ${user.organizationId} FOR UPDATE`;
      const lead = await this.record(tx, 'lead', id, user);
      assertCanMutate(user, lead);
      if (lead.convertedAt)
        return {
          lead: visibleRecord(lead, user),
          contact: lead.convertedContactId
            ? await tx.contact.findFirst({
                where: { id: lead.convertedContactId, ...recordScope(user), archivedAt: null },
              })
            : null,
          company: lead.convertedCompanyId
            ? await tx.company.findFirst({
                where: { id: lead.convertedCompanyId, ...recordScope(user), archivedAt: null },
              })
            : null,
          deal: lead.convertedDealId
            ? await tx.deal.findFirst({
                where: { id: lead.convertedDealId, ...recordScope(user), archivedAt: null },
              })
            : null,
        };
      const existingContact = lead.email
        ? await tx.contact.findFirst({
            where: {
              organizationId: user.organizationId,
              archivedAt: null,
              email: { equals: lead.email, mode: 'insensitive' },
            },
          })
        : null;
      const existingCompany = existingContact?.companyId
        ? await tx.company.findFirst({
            where: {
              id: existingContact.companyId,
              organizationId: user.organizationId,
              archivedAt: null,
            },
          })
        : null;
      if (user.role === 'SALES_REP' && existingContact && existingContact.ownerId !== user.id)
        throw new ConflictException(
          'A manager must convert this lead because its contact belongs to another team member.',
        );
      const company =
        existingCompany ??
        (lead.companyName
          ? ((await tx.company.findFirst({
              where: {
                organizationId: user.organizationId,
                archivedAt: null,
                name: { equals: lead.companyName, mode: 'insensitive' },
              },
            })) ??
            (await tx.company.create({
              data: {
                organizationId: user.organizationId,
                name: lead.companyName,
                ownerId: lead.ownerId!,
              },
            })))
          : null);
      if (user.role === 'SALES_REP' && company && company.ownerId !== user.id)
        throw new ConflictException(
          'A manager must convert this lead because its company belongs to another team member.',
        );
      const contact =
        existingContact ??
        (await tx.contact.create({
          data: {
            organizationId: user.organizationId,
            firstName: lead.firstName!,
            lastName: lead.lastName!,
            email: lead.email,
            phone: lead.phone,
            jobTitle: lead.title,
            companyId: company?.id,
            ownerId: lead.ownerId!,
          },
        }));
      const deal = data.createDeal
        ? await tx.deal.create({
            data: {
              organizationId: user.organizationId,
              title: data.dealTitle ?? `${lead.companyName ?? lead.firstName} opportunity`,
              value: data.dealValue,
              ownerId: lead.ownerId!,
              contactId: contact.id,
              companyId: company?.id,
            },
          })
        : null;
      const updated = await tx.lead.update({
        where: { id, organizationId: user.organizationId },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          convertedContactId: contact.id,
          convertedCompanyId: company?.id,
          convertedDealId: deal?.id,
        },
        include: {
          owner: { select: publicUserSelect },
          ...(user.role === 'SALES_REP'
            ? Object.fromEntries(
                ['convertedContact', 'convertedCompany', 'convertedDeal'].map((relation) => [
                  relation,
                  { where: { ...recordScope(user), archivedAt: null }, select: { id: true } },
                ]),
              )
            : {}),
        },
      });
      await tx.activity.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.id,
          leadId: id,
          contactId: contact.id,
          companyId: company?.id,
          dealId: deal?.id,
          type: 'LEAD_CONVERTED',
          title: `Converted ${lead.firstName} ${lead.lastName} into a contact${deal ? ' and opportunity' : ''}`,
        },
      });
      return { lead: visibleRecord(updated, user), contact, company, deal };
    });
  }
  stage(id: string, input: unknown, user: Principal) {
    const data = z
      .object({ stage: z.enum(stages), lostReason: z.string().trim().max(2000).optional() })
      .strict()
      .parse(input);
    return this.update('deal', id, data, user);
  }
}
