'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  EmptyState,
  ErrorState,
  LoadingRows,
  useCrmInvalidation,
  useFilters,
  usePageBounds,
} from './common';
import { PageResult } from './types';
import styles from './modules.styles';
type Notification = {
  id: string;
  title: string;
  message?: string;
  body?: string;
  readAt?: string | null;
  isRead?: boolean;
  createdAt: string;
  link?: string;
  taskId?: string;
};
export function NotificationsPage() {
  const { params, update } = useFilters();
  const invalidate = useCrmInvalidation();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = useQuery({
    queryKey: ['notifications', page, params.get('unread')],
    queryFn: () =>
      api.get<PageResult<Notification>>(
        `/notifications?page=${page}&pageSize=15${params.get('unread') === 'true' ? '&unread=true' : ''}`,
      ),
  });
  usePageBounds(page, query.data?.meta.totalPages, update);
  const read = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      void invalidate();
      toast.success('All notifications marked as read');
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <h1 className={ui['page-title']}>Notifications</h1>
          <p className={ui['page-description']}>Stay in the loop on everything that matters.</p>
        </div>
        <Button
          variant="outline"
          disabled={readAll.isPending || query.isPending}
          onClick={() => readAll.mutate()}
        >
          <CheckCheck size={15} />
          {readAll.isPending ? 'Marking…' : 'Mark all as read'}
        </Button>
      </div>
      <section className={ui.card}>
        <div className={styles.tabs} role="tablist" aria-label="Notification filters">
          <button
            role="tab"
            aria-selected={params.get('unread') !== 'true'}
            className={cn(styles.tab, params.get('unread') !== 'true' ? styles.activeTab : '')}
            onClick={() => update('unread', '')}
          >
            All notifications
          </button>
          <button
            role="tab"
            aria-selected={params.get('unread') === 'true'}
            className={cn(styles.tab, params.get('unread') === 'true' ? styles.activeTab : '')}
            onClick={() => update('unread', 'true')}
          >
            Unread
          </button>
        </div>
        {query.isPending ? (
          <LoadingRows />
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : !query.data.data.length ? (
          <EmptyState
            title="You're up to date"
            description="New assignments and important updates will appear here."
          />
        ) : (
          <>
            {query.data.data.map((entry) => {
              const unread = !entry.readAt && !entry.isRead;
              const link =
                entry.link?.startsWith('/') && !entry.link.startsWith('//')
                  ? entry.link
                  : entry.taskId
                    ? '/tasks'
                    : undefined;
              return (
                <article
                  key={entry.id}
                  className={cn(styles.notification, unread ? styles.unread : '')}
                >
                  <div className={styles.notificationIcon}>
                    <Bell size={18} />
                  </div>
                  <div className={styles.notificationContent}>
                    <h3>
                      {entry.title}
                      {unread && (
                        <span
                          aria-label="Unread"
                          className={
                            'inline-block! w-[6px]! h-[6px]! ml-[9px]! rounded-full! bg-[#8f7bdd]!'
                          }
                        />
                      )}
                    </h3>
                    <p>{entry.message || entry.body}</p>
                    <div className={styles.meta}>
                      <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                      {link && (
                        <Link href={link} className={styles.primary}>
                          View record →
                        </Link>
                      )}
                    </div>
                  </div>
                  {unread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={read.isPending}
                      onClick={() => read.mutate(entry.id)}
                    >
                      <Check size={14} />
                      Mark read
                    </Button>
                  )}
                </article>
              );
            })}
            <div className={styles.pagination}>
              <span>{query.data.meta.total} notifications</span>
              <div className={styles.pager}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => update('page', String(page - 1))}
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <span>
                  Page {page} of {Math.max(1, query.data.meta.totalPages)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= query.data.meta.totalPages}
                  onClick={() => update('page', String(page + 1))}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
