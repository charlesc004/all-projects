'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/states';
function monthLabel(value: string) {
  if (/^\d{4}-\d{2}/.test(value))
    return new Date(`${value.slice(0, 7)}-15T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
    });
  return value;
}
export function SalesChart({
  data,
  bars = false,
}: {
  data: {
    month: string;
    revenue: number;
  }[];
  bars?: boolean;
}) {
  if (!data.length || data.every((p) => !p.revenue))
    return (
      <EmptyState
        title="Your revenue story starts here"
        description="Won deals in this period will appear on this chart."
      />
    );
  const common = (
    <>
      <CartesianGrid vertical={false} stroke="#eff0f5" strokeDasharray="3 4" />
      <XAxis
        dataKey="month"
        tickFormatter={monthLabel}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 9, fill: '#667085' }}
        dy={10}
      />
      <YAxis
        tickFormatter={(v) => formatCurrency(v, true)}
        axisLine={false}
        tickLine={false}
        tick={{ fontSize: 9, fill: '#667085' }}
        tickCount={5}
        width={55}
      />
      <Tooltip
        content={({ active, payload, label: tooltipLabel }) =>
          active && payload?.length ? (
            <div className={ui['chart-tooltip']}>
              {String(tooltipLabel)}
              <strong>{formatCurrency(Number(payload[0].value))} revenue</strong>
            </div>
          ) : null
        }
        cursor={bars ? { fill: '#f7f5ff' } : false}
      />
    </>
  );
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={160}>
      {bars ? (
        <BarChart data={data} margin={{ top: 18, right: 15, bottom: 14, left: 0 }}>
          {common}
          <Bar
            dataKey="revenue"
            fill="#a191d7"
            radius={[4, 4, 0, 0]}
            maxBarSize={34}
            isAnimationActive={false}
          />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 18, right: 15, bottom: 14, left: 0 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b1a1e1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#b1a1e1" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          {common}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#a08ad9"
            fill="url(#revenue-fill)"
            strokeWidth={2.2}
            isAnimationActive={false}
            activeDot={{ r: 4, stroke: '#fff', strokeWidth: 3, fill: '#a08ad9' }}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}
