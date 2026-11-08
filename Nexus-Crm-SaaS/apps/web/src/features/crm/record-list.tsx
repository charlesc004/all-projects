'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Pencil,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArchiveDialog,
  EmptyState,
  ErrorState,
  initialLetters,
  LoadingRows,
  RecordDialog,
  SearchInput,
  StatusBadge,
  useFilters,
  usePageBounds,
} from './common';
import { CrmRecord, label, leadStatuses, PageResult, Person, recordName, singular } from './types';
import styles from './modules.styles';
const descriptions: Record<string, string> = {
  leads: 'Turn new connections into lasting relationships.',
  contacts: 'The people behind your next great opportunity.',
  companies: 'A complete view of every company you work with.',
};
function SortHeader({
  field,
  children,
  sortBy,
  sortOrder,
  onSort,
}: {
  field: string;
  children: React.ReactNode;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
}) {
  return (
    <button className={styles.sort} onClick={() => onSort(field)}>
      {children}
      {sortBy === field ? (
        sortOrder === 'asc' ? (
          <ArrowUp size={11} />
        ) : (
          <ArrowDown size={11} />
        )
      ) : (
        <ArrowUpDown size={11} />
      )}
    </button>
  );
}
export function RecordList({ resource }: { resource: 'leads' | 'contacts' | 'companies' }) {
  const { user } = useAuth();
  const { params, update } = useFilters();
  const [editing, setEditing] = useState<CrmRecord | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [archiving, setArchiving] = useState<CrmRecord | undefined>();
  const [exporting, setExporting] = useState(false);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sortBy = params.get('sortBy') || 'createdAt';
  const sortOrder = params.get('sortOrder') || 'desc';
  const queryString = new URLSearchParams(params.toString());
  queryString.delete('create');
  queryString.set('page', String(page));
  queryString.set('pageSize', '10');
  const query = useQuery({
    queryKey: [resource, queryString.toString()],
    queryFn: () => api.get<PageResult<CrmRecord>>(`/${resource}?${queryString}`),
  });
  usePageBounds(page, query.data?.meta.totalPages, update);
  const users = useQuery({
    queryKey: ['options', 'users'],
    queryFn: () => api.get<Person[]>('/users'),
    staleTime: 60000,
  });
  const companies = useQuery({
    queryKey: ['options', 'companies'],
    queryFn: async () => (await api.get<PageResult<CrmRecord>>('/companies?pageSize=100')).data,
    enabled: resource === 'contacts',
    staleTime: 60000,
  });
  const canArchive = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  function sort(field: string) {
    const next = new URLSearchParams(params.toString());
    next.set('sortBy', field);
    next.set('sortOrder', sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
    next.delete('page');
    window.history.replaceState(null, '', `?${next}`);
    // Next.js synchronizes native history with useSearchParams.
  }
  async function exportRecords() {
    setExporting(true);
    try {
      const all: CrmRecord[] = [];
      let exportPage = 1;
      let pages = 1;
      do {
        const exportParams = new URLSearchParams(params.toString());
        exportParams.delete('create');
        exportParams.set('pageSize', '100');
        exportParams.set('page', String(exportPage));
        const batch = await api.get<PageResult<CrmRecord>>(`/${resource}?${exportParams}`);
        all.push(...batch.data);
        pages = batch.meta.totalPages;
        exportPage++;
      } while (exportPage <= pages && all.length < 10000);
      const columns =
        resource === 'companies'
          ? ['name', 'website', 'industry', 'size', 'phone']
          : resource === 'leads'
            ? [
                'firstName',
                'lastName',
                'email',
                'phone',
                'companyName',
                'status',
                'source',
                'priority',
              ]
            : ['firstName', 'lastName', 'email', 'phone', 'jobTitle'];
      const safe = (value: unknown) => {
        const raw = String(value ?? '');
        return `"${(/^(?:[\s]*[=+@\-]|[\t\r])/.test(raw) ? "'" : '') + raw.replace(/"/g, '""')}"`;
      };
      const csv = [
        columns.map(label).map(safe).join(','),
        ...all.map((record) =>
          columns.map((key) => safe(record[key as keyof CrmRecord])).join(','),
        ),
      ].join('\r\n');
      const url = URL.createObjectURL(
        new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexus-${resource}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(
        `${all.length} ${resource} exported${all.length >= 10000 ? ' (10,000 record limit)' : ''}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <h1 className={ui['page-title']}>
            {user?.role === 'SALES_REP' ? `My ${resource}` : label(resource)}{' '}
            <span className={styles.count}>{query.data?.meta.total ?? '…'} total</span>
          </h1>
          <p className={ui['page-description']}>{descriptions[resource]}</p>
        </div>
        <div className={styles.pageActions}>
          <Button variant="outline" onClick={exportRecords} disabled={exporting}>
            <Download size={15} />
            {exporting ? 'Exporting…' : 'Export'}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            Add {singular[resource]}
          </Button>
        </div>
      </div>
      <section className={ui.card}>
        {resource === 'leads' && (
          <div className={styles.tabs} role="tablist" aria-label="Lead status">
            <button
              role="tab"
              aria-selected={!params.get('status')}
              className={cn(styles.tab, !params.get('status') ? styles.activeTab : '')}
              onClick={() => update('status', '')}
            >
              All leads
            </button>
            {leadStatuses.map((status) => (
              <button
                key={status}
                role="tab"
                aria-selected={params.get('status') === status}
                className={cn(styles.tab, params.get('status') === status ? styles.activeTab : '')}
                onClick={() => update('status', status)}
              >
                {label(status)}
              </button>
            ))}
          </div>
        )}
        <div className={styles.toolbar}>
          <SearchInput
            value={params.get('search') || ''}
            onChange={(value) => update('search', value)}
            placeholder={`Search ${resource}…`}
          />
          {user?.role !== 'SALES_REP' && (
            <select
              className={cn(ui.select, styles.filter)}
              aria-label="Filter by owner"
              value={params.get('ownerId') || ''}
              onChange={(e) => update('ownerId', e.target.value)}
            >
              <option value="">All owners</option>
              {users.data?.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          )}
          {resource === 'leads' && (
            <select
              className={cn(ui.select, styles.filter)}
              aria-label="Filter by priority"
              value={params.get('priority') || ''}
              onChange={(e) => update('priority', e.target.value)}
            >
              <option value="">All priorities</option>
              {['HIGH', 'MEDIUM', 'LOW'].map((v) => (
                <option key={v} value={v}>
                  {label(v)}
                </option>
              ))}
            </select>
          )}
          {resource === 'contacts' && (
            <select
              className={cn(ui.select, styles.filter)}
              aria-label="Filter by company"
              value={params.get('companyId') || ''}
              onChange={(e) => update('companyId', e.target.value)}
            >
              <option value="">All companies</option>
              {companies.data?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
          {params.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                window.history.replaceState(null, '', window.location.pathname);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        {query.isPending ? (
          <LoadingRows />
        ) : query.isError ? (
          <ErrorState retry={() => query.refetch()} />
        ) : !query.data.data.length ? (
          <EmptyState
            title={`No ${resource} found`}
            description={
              params.size
                ? 'Try a different search or update your filters.'
                : `Add your first ${singular[resource]} to get started.`
            }
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                Add {singular[resource]}
              </Button>
            }
          />
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>
                      <SortHeader
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={sort}
                        field={resource === 'companies' ? 'name' : 'firstName'}
                      >
                        {resource === 'companies' ? 'Company' : 'Name'}
                      </SortHeader>
                    </th>
                    <th>{resource === 'companies' ? 'Industry' : 'Company'}</th>
                    {resource === 'leads' && (
                      <>
                        <th>Status</th>
                        <th>Priority</th>
                      </>
                    )}
                    {resource === 'contacts' && <th>Job title</th>}
                    {resource === 'companies' && <th>Size</th>}
                    <th>Owner</th>
                    <th>
                      <SortHeader
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        onSort={sort}
                        field="createdAt"
                      >
                        Created
                      </SortHeader>
                    </th>
                    <th>
                      <span className={ui['sr-only']}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.data.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className={styles.person}>
                          <span className={styles.avatar}>
                            {initialLetters(recordName(record))}
                          </span>
                          <div>
                            <Link className={styles.primary} href={`/${resource}/${record.id}`}>
                              {recordName(record)}
                            </Link>
                            <div className={styles.secondary}>
                              {resource === 'companies'
                                ? record.website?.replace(/^https?:\/\//, '') || record.phone || '—'
                                : record.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {resource === 'companies' ? (
                          record.industry || '—'
                        ) : record.company ? (
                          <Link className={styles.primary} href={`/companies/${record.company.id}`}>
                            {record.company.name}
                          </Link>
                        ) : (
                          record.companyName || <span className={styles.muted}>—</span>
                        )}
                      </td>
                      {resource === 'leads' && (
                        <>
                          <td>
                            <StatusBadge value={record.status} />
                          </td>
                          <td>
                            <StatusBadge value={record.priority} />
                          </td>
                        </>
                      )}
                      {resource === 'contacts' && <td>{record.jobTitle || '—'}</td>}
                      {resource === 'companies' && <td>{record.size || '—'}</td>}
                      <td>
                        <span className={styles.nowrap}>{record.owner?.name || 'Unassigned'}</span>
                      </td>
                      <td>
                        <span className={styles.nowrap}>{formatDate(record.createdAt)}</span>
                      </td>
                      <td>
                        <div className={styles.cellActions}>
                          <Link
                            href={`/${resource}/${record.id}`}
                            className={styles.iconButton}
                            aria-label={`View ${recordName(record)}`}
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            className={styles.iconButton}
                            aria-label={`Edit ${recordName(record)}`}
                            disabled={
                              (user?.role === 'SALES_REP' && record.ownerId !== user.id) ||
                              record.status === 'CONVERTED'
                            }
                            title={
                              record.status === 'CONVERTED'
                                ? 'Converted leads are managed through their contact'
                                : user?.role === 'SALES_REP' && record.ownerId !== user.id
                                  ? 'Only the owner or a manager can edit this record'
                                  : 'Edit record'
                            }
                            onClick={() => setEditing(record)}
                          >
                            <Pencil size={14} />
                          </button>
                          {canArchive && (
                            <button
                              className={styles.iconButton}
                              aria-label={`Archive ${recordName(record)}`}
                              onClick={() => setArchiving(record)}
                            >
                              <Archive size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.pagination}>
              <span>
                Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, query.data.meta.total)} of{' '}
                {query.data.meta.total} {resource}
              </span>
              <div className={styles.pager}>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Previous page"
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
                  aria-label="Next page"
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
        resource={resource}
        open={createOpen || params.get('create') === 'true' || !!editing}
        record={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditing(undefined);
            if (params.has('create')) update('create', '');
          }
        }}
      />
      <ArchiveDialog
        resource={resource}
        record={archiving}
        onClose={() => setArchiving(undefined)}
      />
    </>
  );
}
