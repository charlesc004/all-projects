import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import request from 'supertest';

const password = 'Integration!2026';
const csrf = { 'x-nexus-csrf': '1', Origin: 'http://localhost:3000' };
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let app: INestApplication;
let db: PrismaClient;
let tenantA: string;
let tenantB: string;
let adminId: string;
let salesId: string;
let foreignOwner: string;
let admin: ReturnType<typeof request.agent>;
let sales: ReturnType<typeof request.agent>;
let other: ReturnType<typeof request.agent>;
let leadId: string;
let foreignLeadId: string;
let dealId: string;
let taskId: string;

beforeAll(async () => {
  if (
    !process.env.DATABASE_URL_TEST ||
    process.env.DATABASE_URL !== process.env.DATABASE_URL_TEST
  ) {
    throw new Error(
      'Run npm run test:integration from the root with a dedicated DATABASE_URL_TEST.',
    );
  }
  const { createApp } = await import('../src/app');
  app = await createApp();
  await app.init();
  db = new PrismaClient();
  tenantA = (await db.organization.create({ data: { name: `Integration A ${suffix}` } })).id;
  tenantB = (await db.organization.create({ data: { name: `Integration B ${suffix}` } })).id;
  const passwordHash = await hash(password, 10);
  adminId = (
    await db.user.create({
      data: {
        email: `admin-${suffix}@example.test`,
        name: 'Integration Admin',
        role: 'ADMIN',
        organizationId: tenantA,
        passwordHash,
      },
    })
  ).id;
  salesId = (
    await db.user.create({
      data: {
        email: `sales-${suffix}@example.test`,
        name: 'Integration Sales',
        role: 'SALES_REP',
        organizationId: tenantA,
        passwordHash,
      },
    })
  ).id;
  foreignOwner = (
    await db.user.create({
      data: {
        email: `other-${suffix}@example.test`,
        name: 'Other Admin',
        role: 'ADMIN',
        organizationId: tenantB,
        passwordHash,
      },
    })
  ).id;
  admin = request.agent(app.getHttpServer());
  sales = request.agent(app.getHttpServer());
  other = request.agent(app.getHttpServer());
  for (const [agent, email] of [
    [admin, `admin-${suffix}@example.test`],
    [sales, `sales-${suffix}@example.test`],
    [other, `other-${suffix}@example.test`],
  ] as const) {
    await agent.post('/api/v1/auth/login').set(csrf).send({ email, password }).expect(200);
  }
}, 60_000);

afterAll(async () => {
  if (db && tenantA && tenantB) {
    const organizationId = { in: [tenantA, tenantB] };
    // Remove only records belonging to this run's two unique tenants.
    await db.notification.deleteMany({ where: { organizationId } });
    await db.activity.deleteMany({ where: { organizationId } });
    await db.note.deleteMany({ where: { organizationId } });
    await db.task.deleteMany({ where: { organizationId } });
    await db.lead.deleteMany({ where: { organizationId } });
    await db.deal.deleteMany({ where: { organizationId } });
    await db.contact.deleteMany({ where: { organizationId } });
    await db.company.deleteMany({ where: { organizationId } });
    await db.refreshToken.deleteMany({ where: { user: { organizationId } } });
    await db.user.deleteMany({ where: { organizationId } });
    await db.organization.deleteMany({ where: { id: organizationId } });
  }
  await db?.$disconnect();
  await app?.close();
});

describe('real PostgreSQL API boundaries and business workflows', () => {
  it('requires authentication, validates input, and rejects missing CSRF headers', async () => {
    await request(app.getHttpServer()).get('/api/v1/leads').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalid', password: 'x' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set({ ...csrf, Origin: 'https://untrusted.example.test' })
      .send({ email: `admin-${suffix}@example.test`, password })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(csrf)
      .send({ email: 'invalid', password: 'x' })
      .expect(400);
    const invalid = await admin
      .post('/api/v1/leads')
      .set(csrf)
      .send({ firstName: '', lastName: 'Test', email: 'not-an-email' });
    expect(invalid.status).toBe(400);
    expect(invalid.body).not.toHaveProperty('stack');
  });

  it('returns generic login errors and safe public user fields', async () => {
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(csrf)
      .send({ email: 'missing@example.test', password });
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(csrf)
      .send({ email: `admin-${suffix}@example.test`, password: 'wrong-password' });
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toEqual(unknown.body.message);
    const me = await admin.get('/api/v1/auth/me').expect(200);
    expect(me.body.user.id).toBe(adminId);
    expect(me.body.user).not.toHaveProperty('passwordHash');
    expect(me.body.user).not.toHaveProperty('refreshTokens');
  });

  it('creates tenant-scoped leads and activity records in one operation', async () => {
    const created = await admin
      .post('/api/v1/leads')
      .set(csrf)
      .send({
        firstName: 'Mara',
        lastName: 'Ashford',
        email: `mara-${suffix}@example.test`,
        companyName: `Ashford ${suffix}`,
        source: 'REFERRAL',
        priority: 'HIGH',
        ownerId: adminId,
      })
      .expect(201);
    leadId = created.body.id;
    expect(created.body.organizationId).toBe(tenantA);
    const activity = await db.activity.findFirst({ where: { organizationId: tenantA, leadId } });
    expect(activity).not.toBeNull();
    const foreign = await other
      .post('/api/v1/leads')
      .set(csrf)
      .send({ firstName: 'Private', lastName: 'Tenant', ownerId: foreignOwner })
      .expect(201);
    foreignLeadId = foreign.body.id;
  });

  it('isolates list, guessed IDs, mutations, relationships, and notes by organization', async () => {
    const list = await admin.get('/api/v1/leads?pageSize=100').expect(200);
    expect(
      list.body.data.every((lead: { organizationId: string }) => lead.organizationId === tenantA),
    ).toBe(true);
    expect(list.body.data.some((lead: { id: string }) => lead.id === foreignLeadId)).toBe(false);
    await admin.get(`/api/v1/leads/${foreignLeadId}`).expect(404);
    await admin
      .patch(`/api/v1/leads/${foreignLeadId}`)
      .set(csrf)
      .send({ firstName: 'Stolen' })
      .expect(404);
    await admin.delete(`/api/v1/leads/${foreignLeadId}`).set(csrf).expect(404);
    await admin
      .post('/api/v1/leads')
      .set(csrf)
      .send({ firstName: 'Bad', lastName: 'Owner', ownerId: foreignOwner })
      .expect(404);
    await admin
      .post('/api/v1/notes')
      .set(csrf)
      .send({ body: 'Cannot write foreign notes', leadId: foreignLeadId })
      .expect(404);
  });

  it('enforces role restrictions on reports, team changes, and other owners', async () => {
    await sales.get('/api/v1/reports/sales').expect(403);
    await sales.get('/api/v1/reports/export').expect(403);
    await sales.patch(`/api/v1/users/${salesId}`).set(csrf).send({ role: 'ADMIN' }).expect(403);
    await sales
      .patch(`/api/v1/leads/${leadId}`)
      .set(csrf)
      .send({ firstName: 'Forbidden' })
      .expect(404);
    await sales
      .post('/api/v1/leads')
      .set(csrf)
      .send({ firstName: 'Assigned', lastName: 'Away', ownerId: adminId })
      .expect(403);
    expect((await db.user.findUniqueOrThrow({ where: { id: salesId } })).role).toBe('SALES_REP');
  });

  it('supports lead search, filters, allowlisted sorting, and bounded pagination', async () => {
    const result = await admin
      .get(
        '/api/v1/leads?search=Mara&status=NEW&priority=HIGH&sortBy=firstName&sortOrder=asc&pageSize=5',
      )
      .expect(200);
    expect(result.body.data).toHaveLength(1);
    expect(result.body.meta).toMatchObject({ page: 1, pageSize: 5, total: 1, totalPages: 1 });
    await admin.get('/api/v1/leads?sortBy=passwordHash').expect(400);
    const oversized = await admin.get('/api/v1/leads?pageSize=100000');
    expect([200, 400]).toContain(oversized.status);
    if (oversized.status === 200) expect(oversized.body.meta.pageSize).toBeLessThanOrEqual(100);
  });

  it('converts a lead transactionally without creating duplicate contacts or deals', async () => {
    await admin
      .post(`/api/v1/leads/${leadId}/convert`)
      .set(csrf)
      .send({ createDeal: true, dealTitle: 'Ashford expansion', dealValue: 15000 })
      .expect(201);
    const converted = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
    expect(converted.status).toBe('CONVERTED');
    expect(converted.convertedContactId).toBeTruthy();
    expect(converted.convertedCompanyId).toBeTruthy();
    expect(converted.convertedDealId).toBeTruthy();
    dealId = converted.convertedDealId!;
    const before = await db.contact.count({ where: { organizationId: tenantA } });
    const repeated = await admin
      .post(`/api/v1/leads/${leadId}/convert`)
      .set(csrf)
      .send({ createDeal: true, dealValue: 15000 });
    expect([200, 201, 409]).toContain(repeated.status);
    expect(await db.contact.count({ where: { organizationId: tenantA } })).toBe(before);
    expect(await db.deal.count({ where: { organizationId: tenantA } })).toBe(1);
  });

  it('persists deal stages, requires lost reason, and prevents reopening closed deals', async () => {
    await admin
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(csrf)
      .send({ stage: 'PROPOSAL' })
      .expect(200);
    expect((await db.deal.findUniqueOrThrow({ where: { id: dealId } })).stage).toBe('PROPOSAL');
    await admin
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(csrf)
      .send({ stage: 'LOST' })
      .expect(400);
    await admin.patch(`/api/v1/deals/${dealId}/stage`).set(csrf).send({ stage: 'WON' }).expect(200);
    const won = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
    expect(won.closedAt).not.toBeNull();
    await admin
      .patch(`/api/v1/deals/${dealId}/stage`)
      .set(csrf)
      .send({ stage: 'DISCOVERY' })
      .expect(409);
  });

  it('creates assignments, completes and reopens tasks with backend-generated events', async () => {
    const task = await admin
      .post('/api/v1/tasks')
      .set(csrf)
      .send({
        title: 'Integration follow-up',
        assigneeId: salesId,
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        dealId,
      })
      .expect(201);
    taskId = task.body.id;
    expect(
      await db.notification.count({ where: { userId: salesId, organizationId: tenantA } }),
    ).toBeGreaterThan(0);
    await sales
      .patch(`/api/v1/tasks/${taskId}`)
      .set(csrf)
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect((await db.task.findUniqueOrThrow({ where: { id: taskId } })).completedAt).not.toBeNull();
    expect(await db.activity.count({ where: { organizationId: tenantA, taskId } })).toBeGreaterThan(
      0,
    );
    await sales.patch(`/api/v1/tasks/${taskId}`).set(csrf).send({ status: 'TODO' }).expect(200);
    expect((await db.task.findUniqueOrThrow({ where: { id: taskId } })).completedAt).toBeNull();
  });

  it('adds record notes and tenant-scoped activity timelines', async () => {
    await admin
      .post('/api/v1/notes')
      .set(csrf)
      .send({ body: 'Agreed next steps for the opportunity.', leadId })
      .expect(201);
    const notes = await admin.get(`/api/v1/notes?entityType=lead&entityId=${leadId}`).expect(200);
    expect(notes.body).toHaveLength(1);
    const activities = await admin
      .get(`/api/v1/activities?entityType=lead&entityId=${leadId}`)
      .expect(200);
    expect(activities.body.length).toBeGreaterThan(0);
  });

  it('computes dashboard/report totals from the same persisted records', async () => {
    const from = new Date(Date.now() - 86_400_000).toISOString();
    const to = new Date(Date.now() + 86_400_000).toISOString();
    const range = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const summary = await admin.get(`/api/v1/dashboard/summary?${range}`).expect(200);
    expect(summary.body.metrics).toMatchObject({
      totalLeads: 1,
      totalContacts: 1,
      openDeals: 0,
      wonRevenue: 15000,
      wonDeals: 1,
      conversionRate: 100,
    });
    const report = await admin.get(`/api/v1/reports/sales?${range}`).expect(200);
    expect(report.body.stats).toMatchObject({
      wonRevenue: 15000,
      wonDeals: 1,
      lostDeals: 0,
      winRate: 100,
    });
    const foreignSummary = await other.get(`/api/v1/dashboard/summary?${range}`).expect(200);
    expect(foreignSummary.body.metrics.wonRevenue).toBe(0);
    const csv = await admin.get(`/api/v1/reports/export?${range}`).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text).not.toContain('Private Tenant');
  });

  it('scopes notification read state to its recipient', async () => {
    const notifications = await sales.get('/api/v1/notifications').expect(200);
    const notificationId = notifications.body.data[0]?.id;
    expect(notificationId).toBeTruthy();
    await other
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set(csrf)
      .send({})
      .expect(404);
    await sales
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set(csrf)
      .send({})
      .expect(200);
    expect(
      (await db.notification.findUniqueOrThrow({ where: { id: notificationId } })).readAt,
    ).not.toBeNull();
  });

  it('reuses the existing contact and company when another lead has the same email', async () => {
    const duplicate = await admin
      .post('/api/v1/leads')
      .set(csrf)
      .send({
        firstName: 'Mara',
        lastName: 'Ashford',
        email: `mara-${suffix}@example.test`,
        companyName: `Ashford ${suffix}`,
      })
      .expect(201);
    await admin
      .post(`/api/v1/leads/${duplicate.body.id}/convert`)
      .set(csrf)
      .send({ createDeal: false })
      .expect(201);
    expect(await db.contact.count({ where: { organizationId: tenantA } })).toBe(1);
    expect(await db.company.count({ where: { organizationId: tenantA } })).toBe(1);
    const original = await db.lead.findUniqueOrThrow({ where: { id: leadId } });
    const second = await db.lead.findUniqueOrThrow({ where: { id: duplicate.body.id } });
    expect(second.convertedContactId).toBe(original.convertedContactId);
  });

  it('does not permit removing the last administrator or injecting tenant/role fields', async () => {
    await admin.patch(`/api/v1/users/${adminId}`).set(csrf).send({ role: 'SALES_REP' }).expect(409);
    await admin
      .post('/api/v1/leads')
      .set(csrf)
      .send({ firstName: 'Injected', lastName: 'Tenant', organizationId: tenantB })
      .expect(400);
    await sales
      .patch('/api/v1/settings/profile')
      .set(csrf)
      .send({ name: 'Sales', role: 'ADMIN' })
      .expect(400);
    expect((await db.user.findUniqueOrThrow({ where: { id: salesId } })).role).toBe('SALES_REP');
  });

  it('archives records and excludes them from normal lists', async () => {
    await admin.delete(`/api/v1/leads/${leadId}`).set(csrf).expect(200);
    await admin.get(`/api/v1/leads/${leadId}`).expect(404);
    expect((await db.lead.findUniqueOrThrow({ where: { id: leadId } })).archivedAt).not.toBeNull();
  });

  it('rotates refresh tokens and revokes the token family on replay', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(csrf)
      .send({ email: `admin-${suffix}@example.test`, password })
      .expect(200);
    const cookies = login.headers['set-cookie'] as unknown as string[];
    expect(
      cookies.every((cookie) => cookie.includes('HttpOnly') && cookie.includes('SameSite=Lax')),
    ).toBe(true);
    const oldRefresh = cookies.find((cookie) => cookie.startsWith('nexus_refresh='))!.split(';')[0];
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(csrf)
      .set('Cookie', oldRefresh)
      .send({})
      .expect(200);
    const newRefresh = (refreshed.headers['set-cookie'] as unknown as string[])
      .find((cookie) => cookie.startsWith('nexus_refresh='))!
      .split(';')[0];
    expect(newRefresh).not.toBe(oldRefresh);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(csrf)
      .set('Cookie', oldRefresh)
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(csrf)
      .set('Cookie', newRefresh)
      .send({})
      .expect(401);
  });
});
