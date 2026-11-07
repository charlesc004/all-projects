'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SalesReport } from '@nexus/shared';
import {
  ArrowDownToLine,
  ChartColumnIncreasing,
  CircleDollarSign,
  Percent,
  Trophy,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, initials, label } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ErrorState, EmptyState, PageSkeleton } from '@/components/ui/states';
import { DateRangePicker, defaultRange, rangeQuery } from '@/components/dashboard/date-range';
import { SalesChart } from '@/components/charts/sales-chart';
import { DataBar } from '@/components/charts/data-bar';
export default function ReportsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const [exporting, setExporting] = useState(false);
  const query = useQuery({
    queryKey: ['reports', range.from, range.to],
    enabled: !!user && user.role !== 'SALES_REP',
    queryFn: () => api.get<SalesReport>(`/reports/sales?${rangeQuery(range)}`),
  });
  if (user?.role === 'SALES_REP')
    return (
      <EmptyState
        title="A view for your team leaders"
        description="Organization reports are available to managers and administrators. Your dashboard shows your assigned records and personal progress."
      />
    );
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const report = query.data;
  const sourceTotal = report.leadsBySource.reduce((s, v) => s + v.count, 0);
  const statusTotal = report.leadsByStatus.reduce((s, v) => s + v.count, 0);
  const pipelineMax = Math.max(...report.dealsByStage.map((d) => d.value), 1);
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <div className={ui['dashboard-eyebrow']}>
            <ChartColumnIncreasing size={13} />
            THE BIGGER PICTURE
          </div>
          <h1 className={ui['page-title']}>Progress, with perspective.</h1>
          <p className={ui['page-description']}>
            Understand what’s working. Find your next opportunity to grow.
          </p>
        </div>
        <div className={ui['page-actions']}>
          <DateRangePicker value={range} onChange={setRange} />
          <Button
            variant="outline"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                await api.download(
                  `/reports/export?${rangeQuery(range)}`,
                  `nexus-sales-${range.from}-to-${range.to}.csv`,
                );
                toast.success('Your sales report is ready.');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Export failed.');
              } finally {
                setExporting(false);
              }
            }}
          >
            <ArrowDownToLine size={14} />
            {exporting ? 'Exporting…' : 'Export report'}
          </Button>
        </div>
      </div>
      <div className={ui['metrics-grid']}>
        {[
          {
            title: 'Won revenue',
            value: formatCurrency(report.stats.wonRevenue),
            icon: CircleDollarSign,
            note: 'Closed and won in this period',
          },
          {
            title: 'Deals won',
            value: report.stats.wonDeals,
            icon: Trophy,
            note: 'New chapters, successfully started',
          },
          {
            title: 'Deals lost',
            value: report.stats.lostDeals,
            icon: XCircle,
            note: 'Opportunities to learn and grow',
          },
          {
            title: 'Win rate',
            value: `${Number(report.stats.winRate).toFixed(1)}%`,
            icon: Percent,
            note: 'Won ÷ closed deals in this period',
          },
        ].map((card) => (
          <div className={cn(ui.card, ui['metric-card'])} key={card.title}>
            <div className={ui['metric-heading']}>
              {card.title}
              <span className={ui['metric-icon']}>
                <card.icon size={15} />
              </span>
            </div>
            <p className={ui['metric-number']}>{card.value}</p>
            <p className={ui['metric-footer']}>{card.note}</p>
          </div>
        ))}
      </div>
      <div className={ui['report-grid']}>
        <section className={ui.card}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>Revenue over time</h2>
              <p className={ui['card-description']}>The results of relationships well built.</p>
            </div>
            <div className={ui['chart-legend']}>
              <i className={ui['legend-dot']} />
              Won revenue
            </div>
          </div>
          <div className={cn(ui['card-content'], ui['report-chart'])}>
            <SalesChart data={report.revenueOverTime} bars />
          </div>
        </section>
        <section className={ui.card}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>Where connections begin</h2>
              <p className={ui['card-description']}>Leads by source in your selected period.</p>
            </div>
          </div>
          <div className={cn(ui['card-content'], 'pt-[28px]!')}>
            {sourceTotal ? (
              report.leadsBySource.map((source, index) => (
                <div className={ui['report-source-row']} key={source.source}>
                  <span className={ui['source-label']}>{label(source.source)}</span>
                  <div className={ui['source-track']}>
                    <DataBar
                      className={cn(
                        ui['source-fill'],
                        ['bg-[#a18dd5]!', 'bg-[#b5a4df]!', 'bg-[#c4b7e5]!', 'bg-[#d2c8ec]!'][
                          index % 4
                        ],
                      )}
                      value={source.count}
                      total={sourceTotal}
                    />
                  </div>
                  <strong className={'font-medium! text-muted-foreground!'}>{source.count}</strong>
                  <small className={cn(ui['text-muted'], 'w-[30px]! text-right!')}>
                    {Math.round((source.count / sourceTotal) * 100)}%
                  </small>
                </div>
              ))
            ) : (
              <EmptyState
                title="Every source has a story"
                description="Create leads to see where your connections come from."
              />
            )}
          </div>
        </section>
      </div>
      <div className={ui['report-grid']}>
        <section className={ui.card}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>People behind the progress</h2>
              <p className={ui['card-description']}>
                Team performance across closed and open opportunities.
              </p>
            </div>
          </div>
          <div className={cn(ui['table-wrap'], 'mt-[22px]!')}>
            <table className={ui['data-table']}>
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Total deals</th>
                  <th>Deals won</th>
                  <th className={ui['text-right']}>Won revenue</th>
                </tr>
              </thead>
              <tbody>
                {report.teamPerformance.map((member, index) => (
                  <tr key={member.id}>
                    <td>
                      <span className={ui['person-cell']}>
                        <span
                          className={cn(
                            ui.avatar,
                            ['bg-[#ede8f8]!', 'bg-[#eaf2ee]!', 'bg-[#fbf0e3]!'][index % 3],
                          )}
                        >
                          {initials(member.name)}
                        </span>
                        <strong>{member.name}</strong>
                      </span>
                    </td>
                    <td>{member.totalDeals}</td>
                    <td>{member.wonDeals}</td>
                    <td className={cn(ui['text-right'], 'font-semibold! text-[#6d628f]!')}>
                      {formatCurrency(member.wonRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!report.teamPerformance.length && (
              <EmptyState
                title="No team results yet"
                description="Deal activity for your selected period will appear here."
              />
            )}
          </div>
        </section>
        <section className={ui.card}>
          <div className={ui['card-header']}>
            <div>
              <h2 className={ui['card-title']}>Your pipeline, by stage</h2>
              <p className={ui['card-description']}>Value and volume in every chapter.</p>
            </div>
          </div>
          <div className={ui['card-content']}>
            {report.dealsByStage.map((stage, index) => (
              <div className={cn(ui['report-source-row'], 'gap-[4px]!')} key={stage.stage}>
                <span className={cn(ui['source-label'], 'min-w-[90px]!')}>
                  {label(stage.stage)}
                </span>
                <div className={cn(ui['source-track'], 'my-0! mx-[8px]!')}>
                  <DataBar
                    className={cn(
                      ui['source-fill'],
                      [
                        'bg-[#a18dd5]!',
                        'bg-[#b5a4df]!',
                        'bg-[#c4b7e5]!',
                        'bg-[#d2c8ec]!',
                        'bg-[#98bea9]!',
                        'bg-[#d8a9ac]!',
                      ][index],
                    )}
                    value={stage.value}
                    total={pipelineMax}
                  />
                </div>
                <strong className={'font-medium! text-muted-foreground! min-w-[56px]! text-right!'}>
                  {formatCurrency(stage.value, true)}
                </strong>
                <small className={cn(ui['text-muted'], 'w-[24px]! text-right!')}>
                  {stage.count}
                </small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className={ui.card}>
        <div className={ui['card-header']}>
          <div>
            <h2 className={ui['card-title']}>From first hello to lasting connection</h2>
            <p className={ui['card-description']}>
              Lead status distribution for records created in the selected period.
            </p>
          </div>
        </div>
        <div className={cn(ui['card-content'], 'flex! gap-[15px]! flex-wrap!')}>
          {report.leadsByStatus.map((status) => (
            <div
              key={status.status}
              className={
                'flex-1! min-w-[115px]! bg-[#faf9fd]! border! border-solid! border-[#eeeaf7]! rounded-[8px]! p-[16px]!'
              }
            >
              <span className={'text-[length:10px]! text-[#695780]!'}>{label(status.status)}</span>
              <p className={'text-[length:23px]! mt-[10px]! text-[#76658d]!'}>
                {status.count}
                <small className={'text-[length:10px]! ml-[9px]! text-[#695780]!'}>
                  {statusTotal ? Math.round((status.count / statusTotal) * 100) : 0}%
                </small>
              </p>
            </div>
          ))}
        </div>
      </section>
      <p className={cn(ui['period-note'], 'mt-[17px]!')}>
        Revenue uses the date a deal was won. Win rate is won deals divided by all closed deals
        within the selected period. Lead reports use the lead creation date. Archived records are
        excluded.
      </p>
    </>
  );
}
