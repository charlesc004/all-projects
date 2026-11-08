'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Archive, CalendarDays, LayoutGrid, List, Pencil, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArchiveDialog,
  EmptyState,
  ErrorState,
  initialLetters,
  LoadingRows,
  RecordDialog,
  SearchInput,
  useFilters,
} from './common';
import { CrmRecord, dealStages, label, PageResult, Person } from './types';
import { StageDialog } from './stage-dialog';
import styles from './modules.styles';
function StageSelect({
  deal,
  editable,
  onChange,
}: {
  deal: CrmRecord;
  editable: boolean;
  onChange: (stage: string) => void;
}) {
  return (
    <select
      className={cn(ui.select, styles.stageSelect)}
      aria-label={`Change stage for ${deal.title}`}
      value={deal.stage}
      disabled={deal.stage === 'WON' || deal.stage === 'LOST' || !editable}
      title={
        !editable
          ? 'Only the owner or a manager can move this deal'
          : ['WON', 'LOST'].includes(deal.stage || '')
            ? 'Closed deals cannot be reopened'
            : 'Change stage'
      }
      onChange={(e) => onChange(e.target.value)}
    >
      {dealStages.map((stage) => (
        <option key={stage} value={stage}>
          {label(stage)}
        </option>
      ))}
    </select>
  );
}
export function DealsPage() {
  const { user } = useAuth();
  const { params, update } = useFilters();
  const [editing, setEditing] = useState<CrmRecord>();
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<CrmRecord>();
  const [transition, setTransition] = useState<{
    deal: CrmRecord;
    stage: string;
  }>();
  const view = params.get('layout') || 'board';
  const queryParams = new URLSearchParams(params.toString());
  queryParams.delete('layout');
  queryParams.set('pageSize', '100');
  const query = useQuery({
    queryKey: ['deals', 'pipeline', queryParams.toString()],
    queryFn: async () => {
      const records: CrmRecord[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        queryParams.set('page', String(page));
        const response = await api.get<PageResult<CrmRecord>>(`/deals?${queryParams}`);
        records.push(...response.data);
        totalPages = response.meta.totalPages;
        page++;
      } while (page <= totalPages);
      return records;
    },
  });
  const users = useQuery({
    queryKey: ['options', 'users'],
    queryFn: () => api.get<Person[]>('/users'),
    staleTime: 60000,
  });
  const records = query.data || [];
  const open = records.filter((deal) => !['WON', 'LOST'].includes(deal.stage || ''));
  const total = open.reduce((sum, deal) => sum + Number(deal.value), 0);
  const canArchive = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canMutate = (deal: CrmRecord) =>
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || deal.ownerId === user?.id;
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <h1 className={ui['page-title']}>
            {user?.role === 'SALES_REP' ? 'My pipeline' : 'Sales pipeline'}{' '}
            <span className={styles.count}>{records.length} deals</span>
          </h1>
          <p className={ui['page-description']}>Keep every opportunity moving forward.</p>
        </div>
        <div className={styles.pageActions}>
          <div className={styles.stats}>
            <div>
              <div className={styles.statLabel}>Open pipeline</div>
              <div className={styles.statValue}>
                {query.isPending ? '—' : formatCurrency(total)}
              </div>
            </div>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} />
            Add deal
          </Button>
        </div>
      </div>
      <div className={cn(ui.card, 'mb-[22px]!')}>
        <div className={cn(styles.toolbar, 'border-b-0!')}>
          <SearchInput
            value={params.get('search') || ''}
            onChange={(value) => update('search', value)}
            placeholder="Search deals…"
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
          <select
            className={cn(ui.select, styles.filter)}
            aria-label="Filter by stage"
            value={params.get('stage') || ''}
            onChange={(e) => update('stage', e.target.value)}
          >
            <option value="">All stages</option>
            {dealStages.map((stage) => (
              <option key={stage} value={stage}>
                {label(stage)}
              </option>
            ))}
          </select>
          <input
            className={cn(ui.input, styles.filter)}
            type="date"
            aria-label="Close date from"
            title="Expected close date from"
            value={params.get('from') || ''}
            onChange={(e) => update('from', e.target.value)}
          />
          <input
            className={cn(ui.input, styles.filter)}
            type="date"
            aria-label="Close date to"
            title="Expected close date to"
            value={params.get('to') || ''}
            min={params.get('from') || undefined}
            onChange={(e) => update('to', e.target.value)}
          />
          <div className={styles.toolbarRight}>
            <Button
              size="icon"
              variant={view === 'board' ? 'secondary' : 'ghost'}
              aria-label="Board view"
              onClick={() => update('layout', 'board')}
            >
              <LayoutGrid size={16} />
            </Button>
            <Button
              size="icon"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              aria-label="List view"
              onClick={() => update('layout', 'list')}
            >
              <List size={16} />
            </Button>
          </div>
        </div>
      </div>
      {query.isPending ? (
        <div className={ui.card}>
          <LoadingRows />
        </div>
      ) : query.isError ? (
        <div className={ui.card}>
          <ErrorState retry={() => query.refetch()} />
        </div>
      ) : records.length === 0 ? (
        <div className={ui.card}>
          <EmptyState
            title="Your next opportunity starts here"
            description="Add a deal or adjust your filters to see your pipeline."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus size={15} />
                Add deal
              </Button>
            }
          />
        </div>
      ) : view === 'board' ? (
        <div className={styles.board}>
          {dealStages.map((stage, index) => {
            const stageDeals = records.filter((deal) => deal.stage === stage);
            return (
              <section key={stage} className={styles.column} aria-label={`${label(stage)} stage`}>
                <div className={styles.columnHeader}>
                  <span className={'flex! gap-[7px]! items-center!'}>
                    <span
                      className={cn(
                        'w-[6px]! h-[6px]!',
                        [
                          'bg-[#b0a7e6]!',
                          'bg-[#9db5eb]!',
                          'bg-[#e5bd87]!',
                          'bg-[#ce9ed9]!',
                          'bg-[#7bc6ad]!',
                          'bg-[#e4a2a4]!',
                        ][index],
                        'rounded-full!',
                      )}
                    />
                    {label(stage)}
                  </span>
                  <span>{stageDeals.length}</span>
                </div>
                <div className={styles.columnTotal}>
                  {formatCurrency(stageDeals.reduce((sum, deal) => sum + Number(deal.value), 0))}
                </div>
                {stageDeals.map((deal) => (
                  <article key={deal.id} className={styles.dealCard}>
                    <div className={'flex! justify-between! gap-[5px]!'}>
                      <h3>
                        <Link className={styles.primary} href={`/deals/${deal.id}`}>
                          {deal.title}
                        </Link>
                      </h3>
                      <button
                        className={styles.iconButton}
                        aria-label={`Edit ${deal.title}`}
                        disabled={!canMutate(deal)}
                        title={
                          !canMutate(deal)
                            ? 'Only the owner or a manager can edit this deal'
                            : 'Edit deal'
                        }
                        onClick={() => setEditing(deal)}
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                    <div className={styles.secondary}>
                      {deal.company?.name ||
                        (deal.contact
                          ? `${deal.contact.firstName} ${deal.contact.lastName}`
                          : 'Independent opportunity')}
                    </div>
                    <div className={styles.dealValue}>{formatCurrency(Number(deal.value))}</div>
                    <div className={styles.dealFooter}>
                      <span className={'flex! gap-[5px]! items-center!'}>
                        <CalendarDays size={12} />
                        {deal.expectedCloseDate
                          ? formatDate(deal.expectedCloseDate)
                          : 'No close date'}
                      </span>
                      <span
                        className={cn(
                          styles.avatar,
                          'w-[23px]! h-[23px]! rounded-full! text-[length:8px]!',
                        )}
                        title={deal.owner?.name}
                      >
                        {initialLetters(deal.owner?.name || 'U')}
                      </span>
                    </div>
                    <StageSelect
                      deal={deal}
                      editable={canMutate(deal)}
                      onChange={(stage) => setTransition({ deal, stage })}
                    />
                    {deal.stage === 'LOST' && deal.lostReason && (
                      <p className={cn(styles.secondary, 'leading-[1.6]!')}>{deal.lostReason}</p>
                    )}
                  </article>
                ))}
                {stageDeals.length === 0 && (
                  <p className={cn(styles.message, 'text-center! py-[22px]! px-0!')}>
                    No deals in this stage
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <section className={ui.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Value</th>
                  <th>Stage</th>
                  <th>Expected close</th>
                  <th>Owner</th>
                  <th>
                    <span className={ui['sr-only']}>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link className={styles.primary} href={`/deals/${deal.id}`}>
                        {deal.title}
                      </Link>
                      <div className={styles.secondary}>{deal.company?.name}</div>
                    </td>
                    <td>{formatCurrency(Number(deal.value))}</td>
                    <td>
                      <StageSelect
                        deal={deal}
                        editable={canMutate(deal)}
                        onChange={(stage) => setTransition({ deal, stage })}
                      />
                    </td>
                    <td>{deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : '—'}</td>
                    <td>{deal.owner?.name || 'Unassigned'}</td>
                    <td>
                      <div className={styles.cellActions}>
                        <button
                          className={styles.iconButton}
                          aria-label={`Edit ${deal.title}`}
                          disabled={!canMutate(deal)}
                          title={
                            !canMutate(deal)
                              ? 'Only the owner or a manager can edit this deal'
                              : 'Edit deal'
                          }
                          onClick={() => setEditing(deal)}
                        >
                          <Pencil size={14} />
                        </button>
                        {canArchive && (
                          <button
                            className={styles.iconButton}
                            aria-label={`Archive ${deal.title}`}
                            onClick={() => setArchiving(deal)}
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
        </section>
      )}
      <RecordDialog
        resource="deals"
        record={editing}
        open={creating || !!editing}
        onOpenChange={(value) => {
          if (!value) {
            setCreating(false);
            setEditing(undefined);
          }
        }}
      />
      <ArchiveDialog resource="deals" record={archiving} onClose={() => setArchiving(undefined)} />
      <StageDialog
        deal={transition?.deal}
        stage={transition?.stage}
        onClose={() => setTransition(undefined)}
      />
    </>
  );
}
