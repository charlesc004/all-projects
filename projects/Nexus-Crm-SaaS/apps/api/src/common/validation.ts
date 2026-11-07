import { z } from 'zod';

export const sources = ['WEBSITE', 'REFERRAL', 'LINKEDIN', 'EVENT', 'OUTBOUND', 'OTHER'] as const;
export const priorities = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const stages = [
  'QUALIFICATION',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const;
export const taskStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const;
const text = (max = 255) => z.string().trim().max(max).nullable().optional();
const required = z.string().trim().min(1).max(200);
const id = z.string().min(1).max(100);
const optionalId = id.nullable().optional();
const email = z
  .union([z.string().trim().email().max(254), z.literal(''), z.null()])
  .optional()
  .transform((value) => value?.toLowerCase() || null);
const date = z
  .union([
    z.string().datetime({ offset: true }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.literal(''),
    z.null(),
  ])
  .optional()
  .refine(
    (value) =>
      !value ||
      (!Number.isNaN(new Date(value).getTime()) &&
        (value.length !== 10 || new Date(value).toISOString().slice(0, 10) === value)),
    'Invalid date',
  )
  .transform((value) => (value ? new Date(value) : null));
const website = z
  .union([
    z
      .string()
      .url()
      .max(500)
      .refine((value) => /^https?:\/\//i.test(value), 'Use an http or https URL'),
    z.literal(''),
    z.null(),
  ])
  .optional();
const related = {
  leadId: optionalId,
  contactId: optionalId,
  companyId: optionalId,
  dealId: optionalId,
};

export const entitySchemas = {
  lead: z
    .object({
      firstName: required,
      lastName: required,
      email,
      phone: text(50),
      companyName: text(200),
      title: text(200),
      source: z.enum(sources).default('WEBSITE'),
      status: z.enum(statuses).default('NEW'),
      priority: z.enum(priorities).default('MEDIUM'),
      ownerId: id.optional(),
    })
    .strict(),
  contact: z
    .object({
      firstName: required,
      lastName: required,
      email,
      phone: text(50),
      jobTitle: text(200),
      companyId: optionalId,
      ownerId: id.optional(),
    })
    .strict(),
  company: z
    .object({
      name: required,
      website,
      industry: text(150),
      size: text(100),
      phone: text(50),
      address: text(1000),
      ownerId: id.optional(),
    })
    .strict(),
  deal: z
    .object({
      title: required,
      value: z.coerce.number().min(0).max(999999999999.99),
      stage: z.enum(stages).default('QUALIFICATION'),
      expectedCloseDate: date,
      companyId: optionalId,
      contactId: optionalId,
      ownerId: id.optional(),
      lostReason: text(2000),
    })
    .strict(),
  task: z
    .object({
      title: required,
      description: text(5000),
      dueDate: date,
      priority: z.enum(priorities).default('MEDIUM'),
      status: z.enum(taskStatuses).default('TODO'),
      assigneeId: id.optional(),
      ...related,
    })
    .strict(),
};
export type EntityKind = keyof typeof entitySchemas;
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    sortBy: z.string().max(40).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    status: z.string().max(40).optional(),
    source: z.enum(sources).optional(),
    priority: z.enum(priorities).optional(),
    stage: z.enum(stages).optional(),
    ownerId: id.optional(),
    assigneeId: id.optional(),
    companyId: id.optional(),
    contactId: id.optional(),
    view: z.enum(['all', 'upcoming', 'overdue', 'completed']).optional(),
    from: z.string().max(40).optional(),
    to: z.string().max(40).optional(),
  })
  .strict();
export const noteSchema = z
  .object({ body: z.string().trim().min(1).max(10000), ...related })
  .strict();
export const entityQuerySchema = z
  .object({ entityType: z.enum(['lead', 'contact', 'company', 'deal']), entityId: id })
  .strict();
export function dateRange(query: unknown) {
  const queryDate = z
    .union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
    .refine(
      (value) =>
        !Number.isNaN(new Date(value).getTime()) &&
        (value.length !== 10 || new Date(value).toISOString().slice(0, 10) === value),
      'Invalid date',
    );
  const input = z
    .object({ from: queryDate.optional(), to: queryDate.optional() })
    .strict()
    .parse(query);
  const to = input.to
    ? new Date(input.to.length === 10 ? `${input.to}T23:59:59.999Z` : input.to)
    : new Date();
  const from = input.from
    ? new Date(input.from.length === 10 ? `${input.from}T00:00:00.000Z` : input.from)
    : new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 5, 1));
  z.boolean()
    .refine(Boolean, 'Date range must be valid, ordered, and no longer than 5 years.')
    .parse(
      !Number.isNaN(from.getTime()) &&
        !Number.isNaN(to.getTime()) &&
        from <= to &&
        to.getTime() - from.getTime() <= 5 * 366 * 86400000,
    );
  return { from, to };
}
