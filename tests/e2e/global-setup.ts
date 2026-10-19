import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';

/** Browser fixtures live in a unique tenant and never reset the demonstration data. */
export default async function globalSetup() {
  config({ quiet: true });
  if (process.env.E2E_EMAIL) return;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Run browser fixtures only against a local development database.');
  }
  const db = new PrismaClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const organization = await db.organization.create({ data: { name: `Nexus E2E ${suffix}` } });
  try {
    const user = await db.user.create({
      data: {
        organizationId: organization.id,
        email: `e2e-${suffix}@example.test`,
        name: 'E2E Administrator',
        passwordHash: await hash('NexusDemo!2026', 10),
        role: 'ADMIN',
      },
    });
    process.env.E2E_EMAIL = user.email;
  } catch (error) {
    await db.organization.delete({ where: { id: organization.id } });
    await db.$disconnect();
    throw error;
  }
  return async () => {
    const where = { organizationId: organization.id };
    try {
      await db.notification.deleteMany({ where });
      await db.activity.deleteMany({ where });
      await db.note.deleteMany({ where });
      await db.task.deleteMany({ where });
      await db.lead.deleteMany({ where });
      await db.deal.deleteMany({ where });
      await db.contact.deleteMany({ where });
      await db.company.deleteMany({ where });
      await db.refreshToken.deleteMany({ where: { user: where } });
      await db.user.deleteMany({ where });
      await db.organization.delete({ where: { id: organization.id } });
    } finally {
      await db.$disconnect();
    }
  };
}
