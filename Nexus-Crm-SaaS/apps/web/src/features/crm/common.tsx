'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useCallback, useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Inbox, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RecordForm } from '@/components/forms/record-form';
import { CrmRecord, label, Resource, singular } from './types';
import styles from './modules.styles';
export function useFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const update = useCallback(
    (key: string, value: string) => {
      if (window.location.pathname !== pathname) return;
      const params = new URLSearchParams(window.location.search);
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== 'page') params.delete('page');
      // Next.js synchronizes native history with useSearchParams without starting a route transition.
      window.history.replaceState(null, '', `${pathname}${params.size ? `?${params}` : ''}`);
    },
    [pathname],
  );
  return { params: searchParams, update };
}
export function usePageBounds(
  page: number,
  totalPages: number | undefined,
  update: (key: string, value: string) => void,
) {
  useEffect(() => {
    if (totalPages !== undefined && page > Math.max(1, totalPages))
      update('page', String(Math.max(1, totalPages)));
  }, [page, totalPages, update]);
}
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);
  const [previous, setPrevious] = useState(value);
  const pathname = usePathname();
  if (value !== previous) {
    setPrevious(value);
    setLocal(value);
  }
  useEffect(() => {
    if (local === value) return;
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    const cancelOnNavigation = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const link =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (link && link.target !== '_blank' && !link.hasAttribute('download')) cancel();
    };
    const timeout = setTimeout(() => {
      if (!cancelled && window.location.pathname === pathname) onChange(local);
    }, 350);
    document.addEventListener('click', cancelOnNavigation, true);
    window.addEventListener('popstate', cancel);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', cancelOnNavigation, true);
      window.removeEventListener('popstate', cancel);
    };
  }, [local, value, onChange, pathname]);
  return (
    <div className={styles.search}>
      <Search size={16} />
      <input
        className={ui.input}
        aria-label={placeholder}
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}
export function StatusBadge({ value = '' }: { value?: string }) {
  const color = ['WON', 'COMPLETED', 'QUALIFIED'].includes(value)
    ? styles.green
    : ['LOST', 'UNQUALIFIED', 'HIGH'].includes(value)
      ? styles.red
      : ['CONTACTED', 'IN_PROGRESS', 'PROPOSAL', 'CONVERTED'].includes(value)
        ? styles.purple
        : ['MEDIUM', 'NEGOTIATION', 'DISCOVERY'].includes(value)
          ? styles.orange
          : styles.blue;
  return <span className={cn(styles.pill, color)}>{label(value)}</span>;
}
export function LoadingRows() {
  return (
    <div className={styles.loading} aria-label="Loading records" role="status">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className={styles.skeletonLine} />
      ))}
    </div>
  );
}
export function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div role="alert" className={styles.errorBox}>
      <p>We couldn&apos;t load this information. Please try again.</p>
      <Button variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
export function EmptyState({
  title = 'Nothing here yet',
  description = 'Records will appear here when you add them.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <Inbox size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function useCrmInvalidation() {
  const client = useQueryClient();
  return () =>
    client.invalidateQueries({
      predicate: (query) => !['auth'].includes(String(query.queryKey[0])),
    });
}
export function RecordDialog({
  resource,
  record,
  open,
  onOpenChange,
}: {
  resource: Resource;
  record?: CrmRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invalidate = useCrmInvalidation();
  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      record ? api.patch(`/${resource}/${record.id}`, payload) : api.post(`/${resource}`, payload),
    onSuccess: () => {
      void invalidate();
      toast.success(`${label(singular[resource])} ${record ? 'updated' : 'created'}`);
      onOpenChange(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) {
          mutation.reset();
          onOpenChange(value);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {record ? 'Edit' : 'New'} {singular[resource]}
          </DialogTitle>
          <DialogDescription>
            {record
              ? 'Keep your records accurate and up to date.'
              : 'Add the details below to keep your team in sync.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <RecordForm
            key={record?.id || 'create'}
            resource={resource}
            record={record}
            onSubmit={(values) => mutation.mutate(values)}
            pending={mutation.isPending}
            error={mutation.error?.message}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
export function ArchiveDialog({
  resource,
  record,
  onClose,
  onSuccess,
}: {
  resource: Resource;
  record?: CrmRecord;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const invalidate = useCrmInvalidation();
  const isTask = resource === 'tasks';
  const mutation = useMutation({
    mutationFn: () => api.delete(`/${resource}/${record?.id}`),
    onSuccess: () => {
      void invalidate();
      toast.success(isTask ? 'Task deleted' : `${label(singular[resource])} archived`);
      onClose();
      onSuccess?.();
    },
  });
  return (
    <Dialog
      open={!!record}
      onOpenChange={(value) => {
        if (!value && !mutation.isPending) {
          mutation.reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isTask ? 'Delete task?' : `Archive ${singular[resource]}?`}</DialogTitle>
          <DialogDescription>
            {isTask
              ? 'This task will be permanently deleted.'
              : 'This record will be hidden from active lists. Its history will be preserved.'}
          </DialogDescription>
        </DialogHeader>
        {mutation.isError && (
          <p className={styles.formError} role="alert">
            {mutation.error.message}
          </p>
        )}
        <div className={styles.pageActions}>
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <Loader2 size={15} />
            ) : isTask ? (
              <Trash2 size={15} />
            ) : (
              <Archive size={15} />
            )}
            {isTask ? 'Delete task' : 'Archive record'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function initialLetters(value: string) {
  return value
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
