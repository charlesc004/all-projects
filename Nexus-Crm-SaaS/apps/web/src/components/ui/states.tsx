'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './button';
export function ErrorState({ error, retry }: { error?: Error | null; retry?: () => void }) {
  return (
    <div className={cn(ui['empty-state'], ui['error-state'])}>
      <AlertCircle size={28} />
      <h3>We couldn’t load this information</h3>
      <p>{error?.message || 'Please try again in a moment.'}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          <RefreshCw size={15} />
          Try again
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  title = 'Nothing here yet',
  description = 'New records will appear here.',
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={ui['empty-state']}>
      <div className={ui['empty-icon']}>
        <Inbox size={23} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function PageSkeleton() {
  return (
    <div aria-label="Loading page" role="status">
      <div className={cn(ui.skeleton, 'w-[240px]! h-[30px]! mb-[12px]!')} />
      <div className={cn(ui.skeleton, 'w-[360px]! h-[14px]! mb-[32px]!')} />
      <div className={ui['metrics-grid']}>
        {[1, 2, 3, 4].map((x) => (
          <div className={cn(ui.skeleton, 'h-[135px]!')} key={x} />
        ))}
      </div>
      <div className={cn(ui.skeleton, 'h-[330px]! mt-[24px]!')} />
    </div>
  );
}
