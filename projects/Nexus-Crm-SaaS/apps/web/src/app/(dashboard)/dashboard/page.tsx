'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardSummary } from '@nexus/shared';
import {
  ArrowRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  CircleDollarSign,
  ContactRound,
  Plus,
  Sun,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate, initials, label, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { DataBar } from '@/components/charts/data-bar';
import { ErrorState, PageSkeleton, EmptyState } from '@/components/ui/states';
import { SalesChart } from '@/components/charts/sales-chart';
import { DateRangePicker, defaultRange, rangeQuery } from '@/components/dashboard/date-range';
const stageClasses: Record<string, string> = {
  QUALIFICATION: 'bg-[#a795d9]',
  DISCOVERY: 'bg-[#b8a8e4]',
  PROPOSAL: 'bg-[#c8bced]',
  NEGOTIATION: 'bg-[#ded5f4]',
  WON: 'bg-[#91c3ad]',
  LOST: 'bg-[#e9b8b8]',
};
const statusColors: Record<string, BadgeVariant> = {
  NEW: 'blue',
  CONTACTED: 'default',
  QUALIFIED: 'success',
  UNQUALIFIED: 'secondary',
  CONVERTED: 'success',
};
export default function DashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['dashboard', range.from, range.to],
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary?${rangeQuery(range)}`),
  });
  const complete = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}`, { status: 'COMPLETED' }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['dashboard'] });
      client.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('One more thing, done. Task completed.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const data = query.data;
  const metrics = data.metrics;
  const pipeline = data.pipeline.filter((p) => !['WON', 'LOST'].includes(p.stage));
  const pipelineCount = pipeline.reduce((sum, p) => sum + p.count, 0);
  const cards = [
    {
      label: 'Won revenue',
      value: formatCurrency(metrics.wonRevenue),
      icon: CircleDollarSign,
      color: '',
      detail: `${metrics.wonDeals} deals won in selected period`,
    },
    {
      label: 'Open pipeline',
      value: formatCurrency(metrics.pipelineValue),
      icon: Wallet,
      color: 'blue',
      detail: `${metrics.openDeals} opportunities in progress`,
    },
    {
      label: 'Total leads',
      value: metrics.totalLeads.toLocaleString(),
      icon: ContactRound,
      color: 'orange',
      detail: `${metrics.totalContacts} contacts ${user?.role === 'SALES_REP' ? 'assigned to you' : 'in your workspace'}`,
    },
    {
      label: 'Lead conversion',
      value: `${Number(metrics.conversionRate).toFixed(1)}%`,
      icon: ChartNoAxesCombined,
      color: 'green',
      detail: 'Converted ÷ leads created in period',
    },
  ];
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <div className={ui['dashboard-eyebrow']}>
            <Sun size={13} className={ui['sun-icon']} />
            {user?.role === 'SALES_REP'
              ? 'YOUR RECORDS, AT A GLANCE'
              : 'YOUR WORKSPACE, AT A GLANCE'}
          </div>
          <h1 className={ui['dashboard-title']}>A clearer view. A stronger connection.</h1>
          <p className={ui['dashboard-subtitle']}>
            Welcome back, {user?.name.split(' ')[0]}. Here’s where your relationships are taking
            you.
          </p>
        </div>
        <div className={ui['page-actions']}>
          <DateRangePicker value={range} onChange={setRange} />
          <Button asChild className={ui['dashboard-quick-add']}>
            <Link href="/leads?create=true">
              <Plus size={14} />
              Add new lead
            </Link>
          </Button>
        </div>
      </div>
      <section className={ui['metrics-grid']} aria-label="Workspace metrics">
        {cards.map((card) => (
          <div className={cn(ui.card, ui['metric-card'])} key={card.label}>
            <div className={ui['metric-heading']}>
              <span>{card.label}</span>
              <span className={cn(ui['metric-icon'], card.color && `nexus-${card.color}`)}>
                <card.icon size={15} />
              </span>
            </div>
            <p className={ui['metric-number']}>{card.value}</p>
            <p className={ui['metric-footer']}>
              {card.label === 'Won revenue' && (
                <TrendingUp size={10} className={'text-[#96b2a2]!'} />
              )}
              {card.detail}
            </p>
          </div>
        ))}
      </section>
      <div className={ui['dashboard-top-grid']}>
        <section className={cn(ui.card, ui['chart-card'])}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>Sales performance</h2>
              <p className={ui['card-description']}>A little progress. A bigger picture.</p>
              <div className={ui['chart-summary']}>
                <strong>{formatCurrency(metrics.wonRevenue)}</strong>
                <span>total won revenue</span>
              </div>
            </div>
            <div className={ui['chart-legend']}>
              <i className={ui['legend-dot']} />
              Won revenue
            </div>
          </div>
          <div className={ui['chart-area']}>
            <SalesChart data={data.salesPerformance} />
          </div>
          <div className={ui['chart-footer']}>
            <span>
              {formatDate(range.from)} – {formatDate(range.to)}
            </span>
            {user?.role !== 'SALES_REP' ? (
              <Link className={ui['section-link']} href="/reports">
                Explore reports
                <ArrowUpRight size={11} />
              </Link>
            ) : (
              <span>Based on closed, won deals</span>
            )}
          </div>
        </section>
        <section className={ui.card}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>Your pipeline, in focus</h2>
              <p className={ui['card-description']}>Every stage brings you a little closer.</p>
            </div>
            <Button variant="ghost" size="icon" asChild aria-label="View deal pipeline">
              <Link href="/deals">
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
          <div className={cn(ui['card-content'], 'pt-0!')}>
            <div className={ui['pipeline-total']}>
              <strong>{formatCurrency(metrics.pipelineValue)}</strong>
              <span>across {metrics.openDeals} open deals</span>
            </div>
            {pipelineCount ? (
              <>
                <div className={ui['pipeline-stacked']} aria-hidden="true">
                  {pipeline.map((p) => (
                    <DataBar
                      key={p.stage}
                      value={p.count}
                      total={pipelineCount}
                      minPercent={1}
                      className={cn('min-w-[2px] rounded-[2px]', stageClasses[p.stage])}
                    />
                  ))}
                </div>
                <div className={ui['pipeline-rows']}>
                  {pipeline.map((p) => (
                    <Link
                      href={`/deals?stage=${p.stage}`}
                      className={ui['pipeline-row']}
                      key={p.stage}
                    >
                      <i className={cn(ui['pipeline-dot'], stageClasses[p.stage])} />
                      <span>{label(p.stage)}</span>
                      <strong>{formatCurrency(p.value)}</strong>
                      <small>{p.count} deals</small>
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                title="Make room for opportunity"
                description="Open deals will appear in your pipeline here."
              />
            )}
          </div>
        </section>
      </div>
      <div className={ui['dashboard-bottom-grid']}>
        <section className={cn(ui.card, ui['recent-leads-table'])}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>New faces. New possibilities.</h2>
              <p className={ui['card-description']}>
                Your most recent connections, all in one place.
              </p>
            </div>
            <Link href="/leads" className={ui['section-link']}>
              All leads
              <ArrowUpRight size={12} />
            </Link>
          </div>
          {data.recentLeads.length ? (
            <div className={ui['table-wrap']}>
              <table className={ui['data-table']}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th aria-label="View lead" />
                  </tr>
                </thead>
                <tbody>
                  {data.recentLeads.slice(0, 4).map((lead, index) => (
                    <tr key={lead.id}>
                      <td>
                        <Link href={`/leads/${lead.id}`} className={ui['person-cell']}>
                          <span
                            className={cn(
                              ui.avatar,
                              ['bg-[#f1eaf8]!', 'bg-[#f8efdf]!', 'bg-[#eaf1ef]!', 'bg-[#eeecfa]!'][
                                index % 4
                              ],
                              [
                                'text-[#71528b]!',
                                'text-[#796137]!',
                                'text-[#47695b]!',
                                'text-[#6d548e]!',
                              ][index % 4],
                            )}
                          >
                            {initials(`${lead.firstName} ${lead.lastName}`)}
                          </span>
                          <span>
                            <strong>
                              {lead.firstName} {lead.lastName}
                            </strong>
                            <small>{lead.email}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{lead.companyName || '—'}</td>
                      <td>
                        <Badge variant={statusColors[lead.status] || 'secondary'}>
                          {label(lead.status)}
                        </Badge>
                      </td>
                      <td>{formatDate(lead.createdAt, { month: 'short', day: 'numeric' })}</td>
                      <td>
                        <Link
                          href={`/leads/${lead.id}`}
                          aria-label={`View ${lead.firstName} ${lead.lastName}`}
                        >
                          <ChevronRight size={13} className={'text-[#afb4c1]!'} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Every connection starts somewhere"
              description="Add your first lead to start building your pipeline."
            />
          )}
        </section>
        <section className={ui.card}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>A few things for your day</h2>
              <p className={ui['card-description']}>Small steps. Meaningful momentum.</p>
            </div>
            <Link href="/tasks?create=true" className={ui['section-link']} aria-label="Add task">
              <Plus size={15} />
            </Link>
          </div>
          <div className={ui['task-list']}>
            {data.upcomingTasks.length ? (
              data.upcomingTasks.slice(0, 3).map((task) => {
                const overdue = !!task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div className={ui['task-item']} key={task.id}>
                    <input
                      className={ui['task-check']}
                      type="checkbox"
                      checked={false}
                      aria-label={`Complete ${task.title}`}
                      disabled={complete.isPending}
                      onChange={() => complete.mutate(task.id)}
                    />
                    <div>
                      <Link href="/tasks">
                        <h4>{task.title}</h4>
                      </Link>
                      <div className={ui['task-meta']}>
                        <span className={overdue ? ui.overdue : ''}>
                          {overdue ? 'Overdue · ' : ''}
                          {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
                        </span>
                        <span>·</span>
                        <span>{label(task.priority)} priority</span>
                      </div>
                    </div>
                    <span title={task.assignee?.name} className={cn(ui.avatar, ui['avatar-small'])}>
                      {initials(task.assignee?.name)}
                    </span>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="A little breathing room"
                description="No upcoming tasks. Your next steps are up to you."
              />
            )}
          </div>
          <div className={ui['task-list-footer']}>
            <span>{data.upcomingTasks.length} upcoming tasks</span>
            <Link href="/tasks" className={ui['section-link']}>
              View all tasks
              <ArrowRight size={11} />
            </Link>
          </div>
        </section>
      </div>
      <section className={cn(ui.card, ui['activity-card'])}>
        <div className={ui['card-header']}>
          <div>
            <h2 className={ui['card-title']}>
              {user?.role === 'SALES_REP'
                ? 'Updates to your records'
                : 'The latest around your workspace'}
            </h2>
            <p className={ui['card-description']}>
              Your team’s momentum, one connection at a time.
            </p>
          </div>
          <span className={cn(ui['text-muted'], 'text-[length:9px]!')}>RECENT ACTIVITY</span>
        </div>
        {data.recentActivities.length ? (
          <div className={ui['activities-strip']}>
            {data.recentActivities.slice(0, 3).map((activity, index) => (
              <div className={ui['activity-mini']} key={activity.id}>
                <span className={ui['activity-mini-icon']}>
                  {index === 0 ? (
                    <Check size={15} />
                  ) : index === 1 ? (
                    <Target size={15} />
                  ) : (
                    <ContactRound size={15} />
                  )}
                </span>
                <div>
                  <p>{activity.description}</p>
                  <small>
                    {activity.actor?.name ? `${activity.actor.name} · ` : ''}
                    {timeAgo(activity.createdAt)}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your story is just beginning"
            description="Workspace activity will appear as your team gets to work."
          />
        )}
      </section>
    </>
  );
}
