'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
export type DateRange = {
  from: string;
  to: string;
  label: string;
};
function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function defaultRange(): DateRange {
  const now = new Date();
  return {
    from: iso(new Date(now.getFullYear(), now.getMonth() - 5, 1)),
    to: iso(now),
    label: 'Last 6 months',
  };
}
export function rangeQuery(range: DateRange) {
  return `from=${range.from}&to=${range.to}`;
}
export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const today = new Date();
  const options: DateRange[] = [
    {
      from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: iso(today),
      label: 'This month',
    },
    {
      from: iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)),
      to: iso(today),
      label: 'Last 30 days',
    },
    defaultRange(),
    { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today), label: 'This year' },
  ];
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={ui['date-trigger']} variant="outline">
            <CalendarDays size={14} />
            {value.label}
            <ChevronDown size={12} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={ui['range-menu']}>
          {options.map((option) => (
            <DropdownMenuItem key={option.label} onSelect={() => onChange(option)}>
              {option.label}
              {value.label === option.label && <Check size={12} className={'ml-auto!'} />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onSelect={() => {
              setFrom(value.from);
              setTo(value.to);
              setCustom(true);
            }}
          >
            Custom date range…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={custom} onOpenChange={setCustom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A little more perspective.</DialogTitle>
            <DialogDescription>
              Choose a period for your revenue and sales activity.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onChange({
                from,
                to,
                label: `${formatDate(from, { month: 'short', day: 'numeric' })} – ${formatDate(to, { month: 'short', day: 'numeric' })}`,
              });
              setCustom(false);
            }}
          >
            <div className={'grid! grid-cols-[1fr_1fr]! gap-[15px]!'}>
              <div>
                <label className={ui['form-label']} htmlFor="range-from">
                  From
                </label>
                <input
                  className={ui.input}
                  id="range-from"
                  type="date"
                  value={from}
                  max={to}
                  required
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className={ui['form-label']} htmlFor="range-to">
                  To
                </label>
                <input
                  className={ui.input}
                  id="range-to"
                  type="date"
                  value={to}
                  min={from}
                  max={iso(today)}
                  required
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCustom(false)}>
                Cancel
              </Button>
              <Button type="submit">Apply date range</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
