import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import request from 'supertest';

const csrf = { 'x-nexus-csrf': '1', Origin: 'http://localhost:3000' };
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const password = 'RoleAccess!2026';
let app: INestApplication;
let db: PrismaClient;
let organizationId: string;
let adminId: string;
let managerId: string;
let salesId: string;
let peerId: string;
let admin: ReturnType<typeof request.agent>;
let manager: ReturnType<typeof request.agent>;
let sales: ReturnType<typeof request.agent>;
let peer: ReturnType<typeof request.agent>;
const own: Record<string, string> = {};
const other: Record<string, string> = {};
let linkedDeal: string;
let linkedTask: string;

beforeAll(async () => {
  if (!process.env.DATABASE_URL_TEST || process.env.DATABASE_URL !== process.env.DATABASE_URL_TEST)
    throw new Error('Use npm run test:integration with a dedicated test database.');
  const { createApp } = await import('../src/app');
  app = await createApp();
  await app.init();
  db = new PrismaClient();
  organizationId = (await db.organization.create({ data: { name: `Role access ${suffix}` } })).id;
  const passwordHash = await hash(password, 10);
  const ids: string[] = [];
  const agents: ReturnType<typeof request.agent>[] = [];
  for (const [name, role] of [
    ['admin', 'ADMIN'],
    ['manager', 'MANAGER'],
    ['sales', 'SALES_REP'],
    ['peer', 'SALES_REP'],
  ] as const) {
    const user = await db.user.create({
      data: {
        name,
        role,
        organizationId,
        passwordHash,
        email: `${name}-${suffix}@example.test`,
      },
    });
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .set(csrf)
      .send({ email: user.email, password })
      .expect(200);
    ids.push(user.id);
    agents.push(agent);
  }
  [adminId, managerId, salesId, peerId] = ids;
  [admin, manager, sales, peer] = agents;
  for (const [ownerId, records, name] of [
    [salesId, own, 'Own'],
    [peerId, other, 'Peer private'],
  ] as const) {
    for (const [resource, data] of [
      ['companies', { name: `${name} company`, ownerId }],
      [
        'contacts',
        { firstName: name, lastName: 'Contact', email: `${ownerId}-contact@example.test`, ownerId },
      ],
      [
        'leads',
        { firstName: name, lastName: 'Lead', email: `${ownerId}-lead@example.test`, ownerId },
      ],
      ['deals', { title: `${name} deal`, value: ownerId === salesId ? 100 : 900, ownerId }],
      [
        'tasks',
        {
          title: `${name} task`,
          assigneeId: ownerId,
          dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        },
      ],
    ] as const) {
      const response = await admin.post(`/api/v1/${resource}`).set(csrf).send(data).expect(201);
      records[resource] = response.body.id;
    }
  }
  await admin
    .patch(`/api/v1/contacts/${own.contacts}`)
    .set(csrf)
    .send({ companyId: own.companies })
    .expect(200);
  await admin
    .patch(`/api/v1/contacts/${other.contacts}`)
    .set(csrf)
    .send({ companyId: other.companies })
    .expect(200);
  await admin
    .post('/api/v1/contacts')
    .set(csrf)
    .send({
      firstName: 'Peer private',
      lastName: 'Shared company contact',
      companyId: own.companies,
      ownerId: peerId,
    })
    .expect(201);
  await admin
    .patch(`/api/v1/deals/${own.deals}`)
    .set(csrf)
    .send({ companyId: own.companies, contactId: own.contacts })
    .expect(200);
  await admin
    .patch(`/api/v1/deals/${other.deals}`)
    .set(csrf)
    .send({ companyId: own.companies, contactId: own.contacts })
    .expect(200);
  const deal = await admin
    .post('/api/v1/deals')
    .set(csrf)
    .send({
      title: 'Own deal with restricted relations',
      ownerId: salesId,
      value: 200,
      companyId: other.companies,
      contactId: other.contacts,
    })
    .expect(201);
  linkedDeal = deal.body.id;
  const task = await admin
    .post('/api/v1/tasks')
    .set(csrf)
    .send({
      title: 'Own assigned task on a restricted deal',
      assigneeId: salesId,
      dealId: other.deals,
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .expect(201);
  linkedTask = task.body.id;
  await admin
    .patch(`/api/v1/deals/${own.deals}/stage`)
    .set(csrf)
    .send({ stage: 'WON' })
    .expect(200);
  await admin
    .patch(`/api/v1/deals/${other.deals}/stage`)
    .set(csrf)
    .send({ stage: 'WON' })
    .expect(200);
  // A conversion event can link an inaccessible lead to a shared, accessible company.
  await db.activity.create({
    data: {
      organizationId,
      actorId: peerId,
      leadId: other.leads,
      companyId: own.companies,
      type: 'LEAD_CONVERTED',
      title: 'Peer private conversion',
    },
  });
}, 60_000);

afterAll(async () => {
  if (db && organizationId) {
    const where = { organizationId };
    await db.notification.deleteMany({ where });
    await db.activity.deleteMany({ where });
    await db.note.deleteMany({ where });
    await db.task.deleteMany({ where });
    await db.lead.deleteMany({ where });
    await db.deal.deleteMany({ where });
    await db.contact.deleteMany({ where });
    await db.company.deleteMany({ where });
    await db.refreshToken.deleteMany({ where: { user: { organizationId } } });
    await db.user.deleteMany({ where });
    await db.organization.delete({ where: { id: organizationId } });
  }
  await db?.$disconnect();
  await app?.close();
});

it('limits each sales user to their own records even with forged owner filters', async () => {
  for (const resource of ['leads', 'contacts', 'companies', 'deals', 'tasks']) {
    const field = resource === 'tasks' ? 'assigneeId' : 'ownerId';
    const result = await sales.get(`/api/v1/${resource}?${field}=${peerId}`).expect(200);
    expect(result.body.data.length).toBeGreaterThan(0);
    expect(result.body.data.every((row: Record<string, string>) => row[field] === salesId)).toBe(
      true,
    );
    expect(result.body.data.map((row: { id: string }) => row.id)).toContain(own[resource]);
    await sales.get(`/api/v1/${resource}/${other[resource]}`).expect(404);
    const change = ['leads', 'contacts'].includes(resource)
      ? { firstName: 'Denied' }
      : resource === 'companies'
        ? { name: 'Denied' }
        : { title: 'Denied' };
    await sales.patch(`/api/v1/${resource}/${other[resource]}`).set(csrf).send(change).expect(404);
    await sales.delete(`/api/v1/${resource}/${other[resource]}`).set(csrf).expect(404);
    const reverse = await peer.get(`/api/v1/${resource}`).expect(200);
    expect(reverse.body.data.every((row: Record<string, string>) => row[field] === peerId)).toBe(
      true,
    );
  }
  await sales
    .patch(`/api/v1/leads/${other.leads}`)
    .set(csrf)
    .send({ firstName: 'Denied' })
    .expect(404);
  await sales
    .patch(`/api/v1/deals/${other.deals}/stage`)
    .set(csrf)
    .send({ stage: 'LOST', lostReason: 'Denied' })
    .expect(404);
  await sales.post(`/api/v1/leads/${other.leads}/convert`).set(csrf).send({}).expect(404);
  await sales.delete(`/api/v1/leads/${own.leads}`).set(csrf).expect(403);
  await sales.patch(`/api/v1/leads/${own.leads}`).set(csrf).send({ ownerId: peerId }).expect(403);
});

it('scopes related records, counts and links without breaking assigned task completion', async () => {
  const company = await sales.get(`/api/v1/companies/${own.companies}`).expect(200);
  expect(company.body.contacts.map((row: { id: string }) => row.id)).toEqual([own.contacts]);
  expect(company.body.deals.map((row: { id: string }) => row.id)).toEqual([own.deals]);
  expect(company.body._count).toEqual({ contacts: 1, deals: 1 });
  const contact = await sales.get(`/api/v1/contacts/${own.contacts}`).expect(200);
  expect(contact.body.deals.map((row: { id: string }) => row.id)).toEqual([own.deals]);
  const deal = await sales.get(`/api/v1/deals/${linkedDeal}`).expect(200);
  expect(deal.body).toMatchObject({
    company: null,
    contact: null,
    companyId: null,
    contactId: null,
  });
  const task = await sales.get(`/api/v1/tasks/${linkedTask}`).expect(200);
  expect(task.body.dealId).toBeNull();
  const completed = await sales
    .patch(`/api/v1/tasks/${linkedTask}`)
    .set(csrf)
    .send({ status: 'COMPLETED' })
    .expect(200);
  expect(completed.body.dealId).toBeNull();
  expect((await db.task.findUniqueOrThrow({ where: { id: linkedTask } })).dealId).toBe(other.deals);
  await sales
    .post('/api/v1/deals')
    .set(csrf)
    .send({ title: 'Denied relation', value: 10, companyId: other.companies })
    .expect(404);
});

it('scopes dashboard totals, pipeline, revenue, tasks and activity to the sales user', async () => {
  const range = `from=${encodeURIComponent(new Date(Date.now() - 86_400_000).toISOString())}&to=${encodeURIComponent(new Date(Date.now() + 86_400_000).toISOString())}`;
  const summary = await sales.get(`/api/v1/dashboard/summary?${range}`).expect(200);
  expect(summary.body.metrics).toMatchObject({
    totalLeads: 1,
    totalContacts: 1,
    wonRevenue: 100,
    wonDeals: 1,
    pipelineValue: 200,
    openDeals: 1,
  });
  expect(
    summary.body.recentLeads.every((row: { ownerId: string }) => row.ownerId === salesId),
  ).toBe(true);
  expect(
    summary.body.upcomingTasks.every((row: { assigneeId: string }) => row.assigneeId === salesId),
  ).toBe(true);
  expect(JSON.stringify(summary.body)).not.toContain('Peer private');
  const all = await manager.get(`/api/v1/dashboard/summary?${range}`).expect(200);
  expect(all.body.metrics).toMatchObject({ totalLeads: 2, totalContacts: 3, wonRevenue: 1000 });
});

it('blocks private notes and filters activity on shared records', async () => {
  for (const path of ['notes', 'activities'])
    await sales.get(`/api/v1/${path}?entityType=lead&entityId=${other.leads}`).expect(404);
  await sales
    .post('/api/v1/notes')
    .set(csrf)
    .send({ leadId: other.leads, body: 'Denied' })
    .expect(404);
  const activities = await sales
    .get(`/api/v1/activities?entityType=company&entityId=${own.companies}`)
    .expect(200);
  expect(JSON.stringify(activities.body)).not.toContain('Peer private conversion');
});

it('does not reuse another sales user’s contact during lead conversion', async () => {
  await sales
    .patch(`/api/v1/leads/${own.leads}`)
    .set(csrf)
    .send({ email: `${peerId}-contact@example.test` })
    .expect(200);
  await sales
    .post(`/api/v1/leads/${own.leads}/convert`)
    .set(csrf)
    .send({ createDeal: true })
    .expect(409);
  expect((await db.lead.findUniqueOrThrow({ where: { id: own.leads } })).convertedAt).toBeNull();
  await manager.post(`/api/v1/leads/${own.leads}/convert`).set(csrf).send({}).expect(201);
  const converted = await sales.get(`/api/v1/leads/${own.leads}`).expect(200);
  expect(converted.body).toMatchObject({ convertedContactId: null, convertedCompanyId: null });
  const repeated = await sales
    .post(`/api/v1/leads/${own.leads}/convert`)
    .set(csrf)
    .send({})
    .expect(201);
  expect(repeated.body.contact).toBeNull();
  expect(repeated.body.company).toBeNull();
  expect(repeated.body.lead).toMatchObject({ convertedContactId: null, convertedCompanyId: null });
});

it('preserves manager team access and reserves account and organization changes for admins', async () => {
  for (const resource of ['leads', 'contacts', 'companies', 'deals', 'tasks']) {
    await manager.get(`/api/v1/${resource}/${own[resource]}`).expect(200);
    await manager.get(`/api/v1/${resource}/${other[resource]}`).expect(200);
  }
  expect(
    (await sales.get('/api/v1/users').expect(200)).body.map((row: { id: string }) => row.id),
  ).toEqual([salesId]);
  expect((await manager.get('/api/v1/users').expect(200)).body).toHaveLength(4);
  await manager.get('/api/v1/reports/sales').expect(200);
  await manager.get('/api/v1/reports/export').expect(200);
  await sales.get('/api/v1/reports/sales').expect(403);
  await sales.get('/api/v1/reports/export').expect(403);
  await sales.get('/api/v1/settings/organization').expect(403);
  for (const agent of [sales, manager]) {
    await agent
      .patch('/api/v1/settings/organization')
      .set(csrf)
      .send({ name: 'Denied' })
      .expect(403);
    await agent.patch(`/api/v1/users/${salesId}`).set(csrf).send({ role: 'ADMIN' }).expect(403);
    await agent.post('/api/v1/users').set(csrf).send({}).expect(403);
  }
  await admin
    .patch('/api/v1/settings/organization')
    .set(csrf)
    .send({ name: 'Admin organization' })
    .expect(200);
  await manager
    .patch(`/api/v1/leads/${other.leads}`)
    .set(csrf)
    .send({ firstName: 'Manager edited' })
    .expect(200);
  await admin.get(`/api/v1/leads/${other.leads}`).expect(200);
  expect(adminId).toBeTruthy();
});

it('applies role changes immediately to an existing authenticated session', async () => {
  await admin.patch(`/api/v1/users/${managerId}`).set(csrf).send({ role: 'SALES_REP' }).expect(200);
  await manager.get('/api/v1/reports/sales').expect(403);
  await manager.get(`/api/v1/leads/${own.leads}`).expect(404);
  expect((await manager.get('/api/v1/leads').expect(200)).body.data).toEqual([]);
});
