import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { activityScope, Principal, publicUserSelect, recordScope } from '../common/security';
import { dateRange, sources, stages, statuses } from '../common/validation';

export function monthlyRevenue(
  rows: { closedAt: Date | null; value: { toNumber(): number } | number }[],
  from: Date,
  to: Date,
) {
  const buckets = new Map<string, number>();
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= to) {
    buckets.set(cursor.toISOString().slice(0, 7), 0);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const row of rows) {
    if (!row.closedAt || row.closedAt < from || row.closedAt > to) continue;
    const key = row.closedAt.toISOString().slice(0, 7);
    buckets.set(
      key,
      (buckets.get(key) ?? 0) + (typeof row.value === 'number' ? row.value : row.value.toNumber()),
    );
  }
  return [...buckets].map(([month, revenue]) => ({
    month,
    revenue: Math.round(revenue * 100) / 100,
  }));
}
export function conversionPercentage(converted: number, total: number) {
  return total ? Math.round((converted / total) * 1000) / 10 : 0;
}
export function csvCell(value: string | number) {
  let text = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService) {}
  private async aggregates(user: Principal, query: unknown) {
    const period = dateRange(query);
    const base = { ...recordScope(user), archivedAt: null };
    const closeWindow = { gte: period.from, lte: period.to };
    const [pipelineGroups, closed, leadGroups, sourceGroups, members, teamGroups] =
      await Promise.all([
        this.db.deal.groupBy({
          by: ['stage'],
          where: base,
          _count: { id: true },
          _sum: { value: true },
        }),
        this.db.deal.findMany({
          where: { ...base, stage: { in: ['WON', 'LOST'] }, closedAt: closeWindow },
          select: { closedAt: true, value: true, stage: true, ownerId: true },
        }),
        this.db.lead.groupBy({
          by: ['status'],
          where: { ...base, createdAt: closeWindow },
          _count: { id: true },
        }),
        this.db.lead.groupBy({
          by: ['source'],
          where: { ...base, createdAt: closeWindow },
          _count: { id: true },
        }),
        this.db.user.findMany({
          where: {
            organizationId: user.organizationId,
            ...(user.role === 'SALES_REP' ? { id: user.id } : {}),
          },
          select: publicUserSelect,
          orderBy: { name: 'asc' },
        }),
        this.db.deal.groupBy({ by: ['ownerId'], where: base, _count: { id: true } }),
      ]);
    const won = closed.filter((deal) => deal.stage === 'WON');
    const lostDeals = closed.length - won.length;
    const pipeline = stages.map((stage) => {
      const group = pipelineGroups.find((row) => row.stage === stage);
      return { stage, count: group?._count.id ?? 0, value: group?._sum.value?.toNumber() ?? 0 };
    });
    const teamPerformance = members.map((member) => {
      const wins = won.filter((deal) => deal.ownerId === member.id);
      return {
        id: member.id,
        name: member.name,
        wonRevenue: wins.reduce((sum, deal) => sum + deal.value.toNumber(), 0),
        wonDeals: wins.length,
        totalDeals: teamGroups.find((row) => row.ownerId === member.id)?._count.id ?? 0,
      };
    });
    return {
      period,
      pipeline,
      won,
      leadGroups,
      report: {
        revenueOverTime: monthlyRevenue(won, period.from, period.to),
        leadsBySource: sources.map((source) => ({
          source,
          count: sourceGroups.find((row) => row.source === source)?._count.id ?? 0,
        })),
        leadsByStatus: statuses.map((status) => ({
          status,
          count: leadGroups.find((row) => row.status === status)?._count.id ?? 0,
        })),
        dealsByStage: pipeline,
        teamPerformance,
        stats: {
          wonRevenue: won.reduce((sum, deal) => sum + deal.value.toNumber(), 0),
          wonDeals: won.length,
          lostDeals,
          winRate: conversionPercentage(won.length, closed.length),
        },
      },
    };
  }
  async sales(user: Principal, query: unknown) {
    return (await this.aggregates(user, query)).report;
  }
  async dashboard(user: Principal, query: unknown) {
    const aggregate = await this.aggregates(user, query);
    const base = { ...recordScope(user), archivedAt: null };
    const [totalLeads, totalContacts, recentActivities, upcomingTasks, recentLeads] =
      await Promise.all([
        this.db.lead.count({ where: base }),
        this.db.contact.count({ where: base }),
        this.db.activity.findMany({
          where: activityScope(user),
          include: { actor: { select: publicUserSelect } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        this.db.task.findMany({
          where: {
            organizationId: user.organizationId,
            status: { not: 'COMPLETED' },
            dueDate: { gte: new Date() },
            ...(user.role === 'SALES_REP' ? { assigneeId: user.id } : {}),
          },
          include: { assignee: { select: publicUserSelect } },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          take: 5,
        }),
        this.db.lead.findMany({
          where: base,
          include: { owner: { select: publicUserSelect } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);
    const openPipeline = aggregate.pipeline.filter(
      (row) => row.stage !== 'WON' && row.stage !== 'LOST',
    );
    const periodLeads = aggregate.leadGroups.reduce((sum, row) => sum + row._count.id, 0);
    const converted =
      aggregate.leadGroups.find((row) => row.status === 'CONVERTED')?._count.id ?? 0;
    return {
      metrics: {
        totalLeads,
        totalContacts,
        openDeals: openPipeline.reduce((sum, row) => sum + row.count, 0),
        pipelineValue: openPipeline.reduce((sum, row) => sum + row.value, 0),
        wonRevenue: aggregate.report.stats.wonRevenue,
        wonDeals: aggregate.report.stats.wonDeals,
        conversionRate: conversionPercentage(converted, periodLeads),
      },
      salesPerformance: aggregate.report.revenueOverTime,
      pipeline: aggregate.pipeline,
      recentActivities,
      upcomingTasks,
      recentLeads,
      period: { from: aggregate.period.from.toISOString(), to: aggregate.period.to.toISOString() },
    };
  }
  async export(user: Principal, query: unknown) {
    const report = await this.sales(user, query);
    const rows: (string | number)[][] = [['Section', 'Name', 'Count', 'Value (USD)']];
    for (const item of report.revenueOverTime) rows.push(['Revenue', item.month, '', item.revenue]);
    for (const item of report.leadsBySource)
      rows.push(['Lead source', item.source, item.count, '']);
    for (const item of report.leadsByStatus)
      rows.push(['Lead status', item.status, item.count, '']);
    for (const item of report.dealsByStage)
      rows.push(['Pipeline', item.stage, item.count, item.value]);
    for (const item of report.teamPerformance.slice(0, 10000))
      rows.push(['Team performance', item.name, item.wonDeals, item.wonRevenue]);
    return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  }
}
