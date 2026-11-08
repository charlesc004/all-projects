import 'dotenv/config';
import {
  PrismaClient,
  DealStage,
  LeadSource,
  LeadStatus,
  Priority,
  TaskStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();
const reference = new Date(`${process.env.SEED_REFERENCE_DATE ?? '2026-10-18'}T12:00:00.000Z`);
if (Number.isNaN(reference.getTime())) throw new Error('SEED_REFERENCE_DATE must be YYYY-MM-DD.');
if (process.env.NODE_ENV === 'production')
  throw new Error('Demo data must not be seeded in production.');
const day = (offset: number) => new Date(reference.getTime() + offset * 86400000);
const companyNames = [
  'Arcwell Technologies',
  'Northstar Collective',
  'Verdant Labs',
  'Cobalt Works',
  'Summit & Field',
  'Brightline Studio',
  'Atlas Harbor',
  'Lumen Ventures',
  'Evergrove Systems',
  'Meridian Cloud',
];
const people = [
  ['Avery', 'Morgan'],
  ['Jordan', 'Blake'],
  ['Riley', 'Chen'],
  ['Casey', 'Patel'],
  ['Quinn', 'Rivera'],
  ['Alex', 'Hart'],
  ['Taylor', 'Brooks'],
  ['Jamie', 'Reed'],
  ['Sam', 'Ellis'],
  ['Drew', 'Hayes'],
  ['Robin', 'Cole'],
  ['Cameron', 'Wells'],
  ['Charlie', 'Lane'],
  ['Emery', 'Stone'],
  ['Skyler', 'Park'],
  ['Sage', 'Bennett'],
  ['Finley', 'Ross'],
  ['Rowan', 'Clarke'],
  ['Dakota', 'Pierce'],
  ['Reese', 'Warren'],
  ['Blair', 'Foster'],
  ['Jules', 'Marin'],
  ['Parker', 'West'],
  ['River', 'Sloan'],
];
const titles = [
  'Head of Operations',
  'VP of Growth',
  'Founder & CEO',
  'Sales Director',
  'Product Lead',
  'Finance Director',
];
const stageValues = Object.values(DealStage);
const sourceValues = Object.values(LeadSource);
const orgId = 'nexus-demo-org';
const owners = ['nexus-demo-admin', 'nexus-demo-manager', 'nexus-demo-sales'];

async function main() {
  const passwordHash = await hash('NexusDemo!2026', 12);
  await db.$transaction(
    async (tx) => {
      await tx.organization.upsert({
        where: { id: orgId },
        create: {
          id: orgId,
          name: 'Nexus Studio',
          website: 'https://nexus.example.test',
          industry: 'Technology',
          currency: 'USD',
        },
        update: { name: 'Nexus Studio' },
      });
      // Repeatable by resetting only the deliberately identified demo tenant.
      await tx.notification.deleteMany({ where: { organizationId: orgId } });
      await tx.activity.deleteMany({ where: { organizationId: orgId } });
      await tx.note.deleteMany({ where: { organizationId: orgId } });
      await tx.task.deleteMany({ where: { organizationId: orgId } });
      await tx.lead.deleteMany({ where: { organizationId: orgId } });
      await tx.deal.deleteMany({ where: { organizationId: orgId } });
      await tx.contact.deleteMany({ where: { organizationId: orgId } });
      await tx.company.deleteMany({ where: { organizationId: orgId } });
      await tx.refreshToken.deleteMany({ where: { user: { organizationId: orgId } } });
      for (const [index, role] of (['ADMIN', 'MANAGER', 'SALES_REP'] as const).entries()) {
        const email = ['admin@nexus.demo', 'manager@nexus.demo', 'sales@nexus.demo'][index];
        await tx.user.upsert({
          where: { id: owners[index] },
          create: {
            id: owners[index],
            organizationId: orgId,
            email,
            name: ['Alex Morgan', 'Jordan Lee', 'Sam Taylor'][index],
            passwordHash,
            role,
          },
          update: { passwordHash, role, active: true, email },
        });
      }
      for (let i = 0; i < companyNames.length; i++)
        await tx.company.create({
          data: {
            id: `demo-company-${i + 1}`,
            organizationId: orgId,
            name: companyNames[i],
            ownerId: owners[i % 3],
            website: `https://${companyNames[i].toLowerCase().replace(/[^a-z]/g, '')}.example.test`,
            industry: [
              'Software',
              'Consulting',
              'Healthcare',
              'Manufacturing',
              'Professional Services',
            ][i % 5],
            size: ['11–50', '51–200', '201–500'][i % 3],
            phone: `+1 202-555-01${String(i).padStart(2, '0')}`,
            address: `${110 + i * 12} Innovation Way, Demo City, DC 20001`,
            createdAt: day(-170 + i * 8),
          },
        });
      for (let i = 0; i < 18; i++)
        await tx.contact.create({
          data: {
            id: `demo-contact-${i + 1}`,
            organizationId: orgId,
            firstName: people[i][0],
            lastName: people[i][1],
            email: `${people[i][0].toLowerCase()}.${people[i][1].toLowerCase()}@company${(i % 10) + 1}.example.test`,
            phone: `+1 202-555-02${String(i).padStart(2, '0')}`,
            jobTitle: titles[i % titles.length],
            companyId: `demo-company-${(i % 10) + 1}`,
            ownerId: owners[i % 3],
            createdAt: day(-150 + i * 7),
          },
        });
      for (let i = 0; i < 18; i++) {
        const stage = stageValues[i % 6];
        const createdAt = day(-165 + i * 8);
        await tx.deal.create({
          data: {
            id: `demo-deal-${i + 1}`,
            organizationId: orgId,
            title: `${companyNames[i % 10]} · ${['Enterprise rollout', 'Growth workspace', 'Annual partnership'][Math.floor(i / 6)]}`,
            value: [
              24000, 18500, 42000, 32000, 56000, 12500, 28000, 16500, 38000, 64000, 22500, 9500,
              36000, 48000, 27500, 72000, 45000, 18000,
            ][i],
            stage,
            companyId: `demo-company-${(i % 10) + 1}`,
            contactId: `demo-contact-${i + 1}`,
            ownerId: owners[(i + Math.floor(i / 6)) % 3],
            createdAt,
            expectedCloseDate: day(i % 6 >= 4 ? -135 + i * 8 : 5 + i * 3),
            closedAt: stage === 'WON' || stage === 'LOST' ? day(-135 + i * 8) : null,
            lostReason:
              stage === 'LOST'
                ? [
                    'Budget moved to next quarter',
                    'Selected an incumbent solution',
                    'Project priorities changed',
                  ][Math.floor(i / 6)]
                : null,
          },
        });
      }
      for (let i = 0; i < 24; i++) {
        const converted = i < 4;
        await tx.lead.create({
          data: {
            id: `demo-lead-${i + 1}`,
            organizationId: orgId,
            firstName: people[i][0],
            lastName: people[i][1],
            email: `${people[i][0].toLowerCase()}.${people[i][1].toLowerCase()}@prospect.example.test`,
            phone: `+1 202-555-03${String(i).padStart(2, '0')}`,
            companyName: companyNames[i % 10],
            title: titles[i % titles.length],
            source: sourceValues[i % sourceValues.length],
            status: converted
              ? 'CONVERTED'
              : (['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'] as LeadStatus[])[i % 4],
            priority: (['HIGH', 'MEDIUM', 'LOW'] as Priority[])[i % 3],
            ownerId: owners[i % 3],
            createdAt: day(-92 + i * 4),
            convertedAt: converted ? day(-10 + i) : null,
            convertedContactId: converted ? `demo-contact-${i + 1}` : null,
            convertedCompanyId: converted ? `demo-company-${i + 1}` : null,
          },
        });
      }
      const taskTitles = [
        'Send partnership proposal',
        'Follow up on discovery call',
        'Prepare enterprise demo',
        'Review contract with legal',
        'Schedule onboarding session',
        'Share pricing comparison',
        'Confirm decision timeline',
        'Update account strategy',
        'Send quarterly check-in',
        'Review sales forecast',
        'Prepare product workshop',
        'Collect stakeholder feedback',
      ];
      for (let i = 0; i < 12; i++)
        await tx.task.create({
          data: {
            id: `demo-task-${i + 1}`,
            organizationId: orgId,
            title: taskTitles[i],
            description: [
              'Capture next steps and share a short recap with the team.',
              'Confirm requirements, decision makers, and success criteria.',
              'Keep the customer informed of the latest project progress.',
            ][i % 3],
            dueDate: day(i - 3),
            status: (['TODO', 'IN_PROGRESS', 'TODO', 'COMPLETED'] as TaskStatus[])[i % 4],
            completedAt: i % 4 === 3 ? day(-1) : null,
            priority: (['HIGH', 'MEDIUM', 'LOW'] as Priority[])[i % 3],
            assigneeId: owners[i % 3],
            ...(i % 2 === 0 ? { dealId: `demo-deal-${i + 1}` } : { leadId: `demo-lead-${i + 1}` }),
            createdAt: day(-12 + i),
          },
        });
      const noteBodies = [
        'Strong fit for a team workspace. They want to consolidate three existing tools before the next quarter.',
        'Discovery complete. The primary decision criteria are implementation time, reporting, and support.',
        'Next step: share a tailored proposal and confirm the procurement timeline.',
        'The team is growing quickly. Invite the operations lead to the next product walkthrough.',
      ];
      for (let i = 0; i < 12; i++)
        await tx.note.create({
          data: {
            id: `demo-note-${i + 1}`,
            organizationId: orgId,
            authorId: owners[i % 3],
            body: noteBodies[i % 4],
            ...(i < 6 ? { leadId: `demo-lead-${i + 1}` } : { dealId: `demo-deal-${i - 5}` }),
            createdAt: day(-8 + i / 2),
          },
        });
      for (let i = 0; i < 24; i++)
        await tx.activity.create({
          data: {
            id: `demo-activity-${i + 1}`,
            organizationId: orgId,
            actorId: owners[i % 3],
            type: ['LEAD_CREATED', 'DEAL_STAGE_CHANGED', 'NOTE_ADDED', 'TASK_COMPLETED'][i % 4],
            title: [
              `Added ${people[i][0]} ${people[i][1]} as a new lead`,
              `${companyNames[i % 10]} moved to ${stageValues[i % 6].toLowerCase()}`,
              `Added a discovery note for ${people[i][0]}`,
              `Completed follow-up with ${companyNames[i % 10]}`,
            ][i % 4],
            ...(i % 2 === 0
              ? { leadId: `demo-lead-${i + 1}` }
              : { dealId: `demo-deal-${(i % 18) + 1}` }),
            createdAt: day(-7 + i / 4),
          },
        });
      for (let i = 0; i < 9; i++)
        await tx.notification.create({
          data: {
            id: `demo-notification-${i + 1}`,
            organizationId: orgId,
            userId: owners[i % 3],
            title: ['Task assigned to you', 'Upcoming follow-up', 'A deal is ready for review'][
              i % 3
            ],
            body: taskTitles[i],
            href: i % 3 === 2 ? '/deals' : '/tasks',
            readAt: i > 5 ? day(-1) : null,
            createdAt: day(-3 + i / 4),
          },
        });
    },
    { timeout: 60000 },
  );
  console.log(
    'Nexus demo seeded: 3 users, 10 companies, 18 contacts, 24 leads, 18 deals, 12 tasks.',
  );
  console.log(
    'Local demo accounts: admin@nexus.demo | manager@nexus.demo | sales@nexus.demo / NexusDemo!2026',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
