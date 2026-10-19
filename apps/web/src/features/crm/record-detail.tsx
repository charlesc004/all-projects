'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowUpRight,
  Archive,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  Pencil,
  Phone,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldsForm } from '@/components/forms/record-form';
import {
  Activity,
  CrmRecord,
  fields,
  FormField,
  label,
  Note,
  recordName,
  Resource,
  singular,
} from './types';
import {
  ArchiveDialog,
  ErrorState,
  initialLetters,
  LoadingRows,
  RecordDialog,
  StatusBadge,
  useCrmInvalidation,
} from './common';
import { StageDialog } from './stage-dialog';
import styles from './modules.styles';
const noteFields: FormField[] = [
  { key: 'body', label: 'Add a note', type: 'textarea', required: true },
];
const conversionFields: FormField[] = [
  { key: 'dealTitle', label: 'Deal title', required: true },
  { key: 'dealValue', label: 'Deal value (USD)', type: 'number', required: true },
];
export function RecordDetail({
  resource,
  id,
}: {
  resource: Exclude<Resource, 'tasks'>;
  id: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const invalidate = useCrmInvalidation();
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState<CrmRecord>();
  const [converting, setConverting] = useState(false);
  const [stage, setStage] = useState<string>();
  const [createDeal, setCreateDeal] = useState(true);
  const [noteKey, setNoteKey] = useState(0);
  const entityType = singular[resource];
  const query = useQuery({
    queryKey: [resource, id],
    queryFn: () => api.get<CrmRecord>(`/${resource}/${id}`),
  });
  const notes = useQuery({
    queryKey: ['notes', resource, id],
    queryFn: () => api.get<Note[]>(`/notes?entityType=${entityType}&entityId=${id}`),
  });
  const activities = useQuery({
    queryKey: ['activities', resource, id],
    queryFn: () => api.get<Activity[]>(`/activities?entityType=${entityType}&entityId=${id}`),
  });
  const note = useMutation({
    mutationFn: (body: string) => api.post('/notes', { body, [`${entityType}Id`]: id }),
    onSuccess: () => {
      void invalidate();
      setNoteKey((key) => key + 1);
      toast.success('Note added');
    },
  });
  const conversion = useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.post<{
        contact: CrmRecord;
        company?: CrmRecord;
        deal?: CrmRecord;
      }>(`/leads/${id}/convert`, {
        createDeal,
        ...(createDeal ? { dealTitle: values.dealTitle, dealValue: Number(values.dealValue) } : {}),
      }),
    onSuccess: (result) => {
      void invalidate();
      setConverting(false);
      toast.success('Lead converted successfully', {
        description: `${recordName(result.contact)} is now a contact.`,
      });
    },
  });
  if (query.isPending) return <LoadingRows />;
  if (query.isError)
    return (
      <div className={ui.card}>
        <ErrorState retry={() => query.refetch()} />
      </div>
    );
  const record = query.data;
  const canArchive = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canMutate =
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || record.ownerId === user?.id;
  const canEdit = canMutate && !(resource === 'leads' && record.status === 'CONVERTED');
  const detailFields = fields[resource].filter(
    (field) => !['firstName', 'lastName', 'name', 'title', 'ownerId'].includes(field.key),
  );
  return (
    <>
      <Link className={styles.back} href={`/${resource}`}>
        <ArrowLeft size={13} />
        Back to {resource}
      </Link>
      <div className={ui['page-header']}>
        <div className={styles.person}>
          <span className={cn(styles.avatar, 'w-[49px]! h-[49px]! text-[length:16px]!')}>
            {initialLetters(recordName(record))}
          </span>
          <div>
            <h1 className={ui['page-title']}>{recordName(record)}</h1>
            <p className={ui['page-description']}>
              {record.title && resource === 'leads'
                ? `${record.title}${record.companyName ? ` at ${record.companyName}` : ''}`
                : record.jobTitle || record.industry || `${label(entityType)} details`}
            </p>
          </div>
        </div>
        <div className={styles.pageActions}>
          {resource === 'leads' && canEdit && (
            <Button onClick={() => setConverting(true)}>
              <CheckCircle2 size={15} />
              Convert lead
            </Button>
          )}
          {resource === 'deals' && canMutate && !['WON', 'LOST'].includes(record.stage || '') && (
            <Button onClick={() => setStage(record.stage || 'QUALIFICATION')}>Update stage</Button>
          )}
          {resource === 'deals' && canMutate && !['WON', 'LOST'].includes(record.stage || '') && (
            <>
              <Button variant="outline" onClick={() => setStage('WON')}>
                Mark won
              </Button>
              <Button variant="outline" onClick={() => setStage('LOST')}>
                Mark lost
              </Button>
            </>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              Edit
            </Button>
          )}
          {canArchive && (
            <Button variant="outline" onClick={() => setArchiving(record)}>
              <Archive size={14} />
              Archive
            </Button>
          )}
        </div>
      </div>
      {record.status === 'CONVERTED' && (
        <div className={styles.banner}>
          <CheckCircle2 size={14} className={'inline! [vertical-align:middle]! mr-[8px]!'} />
          This lead has been converted.{' '}
          {record.convertedContactId && (
            <Link className={styles.primary} href={`/contacts/${record.convertedContactId}`}>
              View contact →
            </Link>
          )}{' '}
          {record.convertedDealId && (
            <Link className={styles.primary} href={`/deals/${record.convertedDealId}`}>
              View deal →
            </Link>
          )}
        </div>
      )}
      {!canMutate && (
        <div className={styles.banner}>
          This record is assigned to another team member. Your role allows you to view it.
        </div>
      )}
      <div className={styles.detailGrid}>
        <div className={ui.card}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <FileText size={15} />
              Overview
            </h2>
            <div className={styles.details}>
              {detailFields.map((field) => {
                const value = record[field.key as keyof CrmRecord];
                return (
                  <div key={field.key}>
                    <div className={styles.detailLabel}>{field.label}</div>
                    <div className={styles.detailValue}>
                      {field.key === 'status' ||
                      field.key === 'priority' ||
                      field.key === 'stage' ? (
                        <StatusBadge value={String(value || '')} />
                      ) : field.key === 'companyId' ? (
                        record.company ? (
                          <Link className={styles.primary} href={`/companies/${record.company.id}`}>
                            {record.company.name}
                          </Link>
                        ) : (
                          '—'
                        )
                      ) : field.key === 'contactId' ? (
                        record.contact ? (
                          <Link className={styles.primary} href={`/contacts/${record.contact.id}`}>
                            {recordName(record.contact)}
                          </Link>
                        ) : (
                          '—'
                        )
                      ) : field.type === 'date' ? (
                        value ? (
                          formatDate(String(value))
                        ) : (
                          '—'
                        )
                      ) : field.key === 'value' ? (
                        formatCurrency(Number(value || 0))
                      ) : field.key === 'email' && value ? (
                        <a className={styles.primary} href={`mailto:${value}`}>
                          <Mail size={12} className={'inline! mr-[5px]!'} />
                          {String(value)}
                        </a>
                      ) : field.key === 'phone' && value ? (
                        <a className={styles.primary} href={`tel:${value}`}>
                          <Phone size={12} className={'inline! mr-[5px]!'} />
                          {String(value)}
                        </a>
                      ) : field.key === 'website' && value ? (
                        <a
                          href={
                            /^https?:\/\//i.test(String(value)) ? String(value) : `https://${value}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className={styles.primary}
                        >
                          {String(value)}
                          <ArrowUpRight size={12} className={'inline! ml-[4px]!'} />
                        </a>
                      ) : field.options ? (
                        value ? (
                          label(String(value))
                        ) : (
                          '—'
                        )
                      ) : typeof value === 'string' || typeof value === 'number' ? (
                        value || '—'
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                );
              })}
              {record.lostReason && (
                <div className={styles.fullWidth}>
                  <div className={styles.detailLabel}>Lost reason</div>
                  <div className={styles.detailValue}>{record.lostReason}</div>
                </div>
              )}
            </div>
          </section>
          {record.contacts && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Users size={15} />
                Contacts <span className={styles.count}>{record.contacts.length}</span>
              </h2>
              {record.contacts.length ? (
                record.contacts.map((contact) => (
                  <div key={contact.id} className={styles.related}>
                    <Link className={styles.primary} href={`/contacts/${contact.id}`}>
                      {recordName(contact)}
                    </Link>
                    <span className={styles.muted}>{contact.email}</span>
                  </div>
                ))
              ) : (
                <p className={styles.message}>No contacts are associated with this company.</p>
              )}
            </section>
          )}
          {record.deals && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Building2 size={15} />
                Associated deals <span className={styles.count}>{record.deals.length}</span>
              </h2>
              {record.deals.length ? (
                record.deals.map((deal) => (
                  <div key={deal.id} className={styles.related}>
                    <Link className={styles.primary} href={`/deals/${deal.id}`}>
                      {deal.title}
                    </Link>
                    <span>{formatCurrency(Number(deal.value || 0))}</span>
                    <StatusBadge value={deal.stage} />
                  </div>
                ))
              ) : (
                <p className={styles.message}>No deals are associated with this {entityType}.</p>
              )}
            </section>
          )}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <FileText size={15} />
              Notes <span className={styles.count}>{notes.data?.length || 0}</span>
            </h2>
            {canMutate && (
              <div className={styles.noteForm}>
                <FieldsForm
                  key={noteKey}
                  formFields={noteFields}
                  onSubmit={(values) => note.mutate(values.body)}
                  pending={note.isPending}
                  error={note.error?.message}
                  submitLabel="Add note"
                />
              </div>
            )}
            {notes.isPending ? (
              <LoadingRows />
            ) : notes.isError ? (
              <ErrorState retry={() => notes.refetch()} />
            ) : !notes.data.length ? (
              <p className={styles.message}>
                Capture useful context, meeting notes, and next steps here.
              </p>
            ) : (
              notes.data.map((entry) => (
                <article className={styles.note} key={entry.id}>
                  <div className={styles.meta}>
                    <strong>{entry.author?.name || 'Team member'}</strong>
                    <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
                  </div>
                  <p>{entry.body}</p>
                </article>
              ))
            )}
          </section>
        </div>
        <aside>
          <section className={ui.card}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Record information</h2>
              <div className={styles.details}>
                <div className={styles.fullWidth}>
                  <div className={styles.detailLabel}>Owner</div>
                  <div className={styles.person}>
                    <span className={styles.avatar}>
                      {initialLetters(record.owner?.name || 'Unassigned')}
                    </span>
                    <div>
                      <div className={styles.detailValue}>{record.owner?.name || 'Unassigned'}</div>
                      <div className={styles.secondary}>{record.owner?.email}</div>
                    </div>
                  </div>
                </div>
                <div className={styles.fullWidth}>
                  <div className={styles.detailLabel}>Created</div>
                  <div className={styles.detailValue}>{formatDate(record.createdAt)}</div>
                </div>
                <div className={styles.fullWidth}>
                  <div className={styles.detailLabel}>Last updated</div>
                  <div className={styles.detailValue}>
                    {record.updatedAt ? formatDate(record.updatedAt) : '—'}
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Clock3 size={15} />
                Activity history
              </h2>
              {activities.isPending ? (
                <LoadingRows />
              ) : activities.isError ? (
                <ErrorState retry={() => activities.refetch()} />
              ) : !activities.data.length ? (
                <p className={styles.message}>
                  Activity will appear here as your team works on this record.
                </p>
              ) : (
                <div className={styles.timeline}>
                  {activities.data.map((activity) => (
                    <article className={styles.event} key={activity.id}>
                      <h4>{activity.title}</h4>
                      {activity.description && <p>{activity.description}</p>}
                      <p>{activity.actor?.name}</p>
                      <time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
      <RecordDialog resource={resource} record={record} open={editing} onOpenChange={setEditing} />
      <ArchiveDialog
        resource={resource}
        record={archiving}
        onClose={() => setArchiving(undefined)}
        onSuccess={() => router.push(`/${resource}`)}
      />
      <Dialog
        open={converting}
        onOpenChange={(value) => {
          if (!conversion.isPending) {
            setConverting(value);
            conversion.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert lead</DialogTitle>
            <DialogDescription>
              Create a contact and link their company. Existing matching records will be reused to
              prevent duplicates.
            </DialogDescription>
          </DialogHeader>
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={createDeal}
              onChange={(e) => setCreateDeal(e.target.checked)}
            />{' '}
            Also create a sales opportunity
          </label>
          <FieldsForm
            key={String(createDeal)}
            formFields={createDeal ? conversionFields : []}
            initial={{
              dealTitle: `${record.companyName || recordName(record)} — New opportunity`,
              dealValue: '0',
            }}
            onSubmit={(values) => conversion.mutate(values)}
            pending={conversion.isPending}
            error={conversion.error?.message}
            submitLabel="Convert lead"
          />
        </DialogContent>
      </Dialog>
      <StageDialog deal={record} stage={stage} onClose={() => setStage(undefined)} />
    </>
  );
}
