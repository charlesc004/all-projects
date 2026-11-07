'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArchiveDialog,
  EmptyState,
  ErrorState,
  LoadingRows,
  RecordDialog,
  SearchInput,
  StatusBadge,
  useCrmInvalidation,
  useFilters,
  usePageBounds,
} from './common';
import { CrmRecord, label, PageResult, Person, priorities, taskStatuses } from './types';
import styles from './modules.styles';
const views = ['all', 'upcoming', 'overdue', 'completed'];
function RelatedLink({ task }: { task: CrmRecord }) {
  const relation = task.leadId
    ? ['leads', task.leadId]
    : task.contactId
      ? ['contacts', task.contactId]
      : task.companyId
        ? ['companies', task.companyId]
        : task.dealId
          ? ['deals', task.dealId]
          : undefined;
  return relation ? (
    <Link className={styles.secondary} href={`/${relation[0]}/${relation[1]}`}>
      View related {relation[0] === 'companies' ? 'company' : relation[0].slice(0, -1)}
    </Link>
  ) : null;
}
export function TasksPage() {
  const { user } = useAuth();
  const { params, update } = useFilters();
  const invalidate = useCrmInvalidation();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CrmRecord>();
  const [deleting, setDeleting] = useState<CrmRecord>();
  const view = params.get('view') || 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const queryParams = new URLSearchParams(params.toString());
  queryParams.delete('create');
  queryParams.set('page', String(page));
  queryParams.set('pageSize', '10');
  if (!params.has('sortBy')) {
    queryParams.set('sortBy', 'dueDate');
    queryParams.set('sortOrder', 'asc');
  }
  const query = useQuery({
    queryKey: ['tasks', queryParams.toString()],
    queryFn: () => api.get<PageResult<CrmRecord>>(`/tasks?${queryParams}`),
  });
  usePageBounds(page, query.data?.meta.totalPages, update);
  const users = useQuery({
    queryKey: ['options', 'users'],
    queryFn: () => api.get<Person[]>('/users'),
    staleTime: 60000,
  });
  const complete = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}`, { status }),
    onSuccess: (_, variables) => {
      void invalidate();
      toast.success(variables.status === 'COMPLETED' ? 'Task completed' : 'Task reopened');
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <h1 className={ui['page-title']}>
            {user?.role === 'SALES_REP' ? 'My tasks' : 'Tasks'}{' '}
            <span className={styles.count}>{query.data?.meta.total ?? '…'} total</span>
          </h1>
          <p className={ui['page-description']}>Make room for your most important work.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          Create task
        </Button>
      </div>
      <section className={ui.card}>
        <div className={styles.tabs} role="tablist" aria-label="Task views">
          {views.map((entry) => (
            <button
              key={entry}
              role="tab"
              aria-selected={entry === view}
              className={cn(styles.tab, entry === view ? styles.activeTab : '')}
              onClick={() => update('view', entry)}
            >
              {entry === 'all' ? 'All tasks' : label(entry)}
            </button>
          ))}
        </div>
        <div className={styles.toolbar}>
          <SearchInput
            value={params.get('search') || ''}
            onChange={(value) => update('search', value)}
            placeholder="Search tasks…"
          />
          <select
            className={cn(ui.select, styles.filter)}
            aria-label="Filter by status"
            value={params.get('status') || ''}
            onChange={(e) => update('status', e.target.value)}
          >
            <option value="">All statuses</option>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
          <select
            className={cn(ui.select, styles.filter)}
            aria-label="Filter by priority"
            value={params.get('priority') || ''}
            onChange={(e) => update('priority', e.target.value)}
          >
            <option value="">All priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {label(priority)}
              </option>
            ))}
          </select>
          {user?.role !== 'SALES_REP' && (
            <select
              className={cn(ui.select, styles.filter)}
              aria-label="Filter by assignee"
              value={params.get('assigneeId') || ''}
              onChange={(e) => update('assigneeId', e.target.value)}
            >
              <option value="">All assignees</option>
              {users.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {query.isPending ? (
          <LoadingRows />
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : !query.data.data.length ? (
          <EmptyState
            title={
              view === 'completed'
                ? 'No completed tasks yet'
                : view === 'overdue'
                  ? 'You’re all caught up'
                  : 'A clear space for what’s next'
            }
            description={
              view === 'overdue'
                ? 'There are no overdue tasks matching your filters.'
                : 'Create a task or adjust your filters to get started.'
            }
            action={
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} />
                Create task
              </Button>
            }
          />
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Due date</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Assignee</th>
                    <th>
                      <span className={ui['sr-only']}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((task) => {
                    const canMutate =
                      user?.role === 'ADMIN' ||
                      user?.role === 'MANAGER' ||
                      task.assigneeId === user?.id;
                    const done = task.status === 'COMPLETED';
                    const overdue =
                      !done &&
                      !!task.dueDate &&
                      new Date(task.dueDate).getTime() < query.dataUpdatedAt;
                    return (
                      <tr key={task.id}>
                        <td>
                          <div className={styles.person}>
                            <button
                              className={cn(styles.taskCheck, done ? styles.checked : '')}
                              aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
                              aria-pressed={done}
                              disabled={complete.isPending || !canMutate}
                              title={
                                !canMutate
                                  ? 'Only the assignee or a manager can update this task'
                                  : 'Toggle completion'
                              }
                              onClick={() =>
                                complete.mutate({
                                  id: task.id,
                                  status: done ? 'TODO' : 'COMPLETED',
                                })
                              }
                            >
                              {done && <Check size={13} />}
                            </button>
                            <div>
                              <button
                                className={cn(
                                  styles.primary,
                                  done ? styles.taskTitleDone : '',
                                  'bg-transparent! border-0! p-0! text-left! cursor-pointer! [font:inherit] font-semibold!',
                                )}
                                disabled={!canMutate}
                                title={
                                  !canMutate
                                    ? 'Only the assignee or a manager can edit this task'
                                    : 'Edit task'
                                }
                                onClick={() => setEditing(task)}
                              >
                                {task.title}
                              </button>
                              {task.description && (
                                <div
                                  className={cn(
                                    styles.secondary,
                                    'max-w-[330px]! overflow-hidden! [text-overflow:ellipsis]! whitespace-nowrap!',
                                  )}
                                >
                                  {task.description}
                                </div>
                              )}
                              <RelatedLink task={task} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={cn(styles.nowrap, overdue ? styles.overdue : '')}>
                            {task.dueDate ? formatDate(task.dueDate) : 'No due date'}
                            {overdue && (
                              <div className={cn(styles.secondary, 'text-inherit!')}>Overdue</div>
                            )}
                          </span>
                        </td>
                        <td>
                          <StatusBadge value={task.priority} />
                        </td>
                        <td>
                          <StatusBadge value={task.status} />
                        </td>
                        <td>{task.assignee?.name || 'Unassigned'}</td>
                        <td>
                          <div className={styles.cellActions}>
                            <button
                              className={styles.iconButton}
                              aria-label={`Edit ${task.title}`}
                              disabled={!canMutate}
                              title={
                                !canMutate
                                  ? 'Only the assignee or a manager can edit this task'
                                  : 'Edit task'
                              }
                              onClick={() => setEditing(task)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={styles.iconButton}
                              aria-label={`Delete ${task.title}`}
                              disabled={!canMutate}
                              title={
                                !canMutate
                                  ? 'Only the assignee or a manager can delete this task'
                                  : 'Delete task'
                              }
                              onClick={() => setDeleting(task)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, query.data.meta.total)} of{' '}
                {query.data.meta.total} tasks
              </span>
              <div className={styles.pager}>
                <Button
                  variant="outline"
                  size="sm"
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
                  variant="outline"
                  size="sm"
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
      <RecordDialog
        resource="tasks"
        record={editing}
        open={creating || params.get('create') === 'true' || !!editing}
        onOpenChange={(value) => {
          if (!value) {
            setCreating(false);
            setEditing(undefined);
            if (params.has('create')) update('create', '');
          }
        }}
      />
      <ArchiveDialog resource="tasks" record={deleting} onClose={() => setDeleting(undefined)} />
    </>
  );
}
