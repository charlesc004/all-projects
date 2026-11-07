'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useMemo } from 'react';
import { Control, useForm, UseFormRegisterReturn, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  CrmRecord,
  FormField,
  PageResult,
  Person,
  Resource,
  fields,
  label,
  recordName,
} from '@/features/crm/types';
import styles from '@/features/crm/modules.styles';
export type FormValues = Record<string, string>;
export function FieldsForm({
  formFields,
  initial,
  onSubmit,
  pending,
  submitLabel = 'Save changes',
  error,
  children,
}: {
  formFields: FormField[];
  initial?: FormValues;
  onSubmit: (values: FormValues) => void;
  pending?: boolean;
  submitLabel?: string;
  error?: string;
  children?: React.ReactNode;
}) {
  const schema = useMemo(() => {
    const shape: Record<string, z.ZodType<string>> = {};
    for (const field of formFields) {
      let rule = z.string().trim();
      if (field.required) rule = rule.min(field.minLength || 1, `${field.label} is required`);
      let typed: z.ZodType<string> = rule;
      if (field.type === 'email')
        typed = rule.refine(
          (v) => !v || z.string().email().safeParse(v).success,
          'Enter a valid email address',
        );
      if (field.type === 'number')
        typed = rule.refine(
          (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
          'Enter a positive amount',
        );
      if (field.key === 'website')
        typed = rule.refine(
          (v) => !v || z.string().url().safeParse(v).success,
          'Enter a full URL, including https://',
        );
      if (field.type === 'password' && field.minLength)
        typed = rule
          .min(field.minLength, `Use at least ${field.minLength} characters`)
          .refine(
            (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v),
            'Include uppercase, lowercase, and a number',
          );
      shape[field.key] = typed;
    }
    return z.object(shape).superRefine((values, context) => {
      if ('assigneeId' in shape) {
        const selected = ['leadId', 'contactId', 'companyId', 'dealId'].filter(
          (key) => values[key],
        );
        if (selected.length > 1)
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [selected[selected.length - 1]],
            message: 'Choose only one related CRM record. Clear the other selections.',
          });
      }
    });
  }, [formFields]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial });
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className={styles.dialogBody}>
        <div className={styles.formGrid}>
          {formFields.map((field) => (
            <div key={field.key} className={field.type === 'textarea' ? styles.fullWidth : ''}>
              <label className={ui['form-label']} htmlFor={`field-${field.key}`}>
                {field.label}
                {field.required && <span aria-hidden="true"> *</span>}
              </label>
              {field.type === 'select' ? (
                <RelationSelect
                  field={field}
                  registration={register(field.key)}
                  control={control}
                  invalid={!!errors[field.key]}
                />
              ) : field.type === 'textarea' ? (
                <textarea
                  id={`field-${field.key}`}
                  className={cn(ui.input, styles.select)}
                  rows={3}
                  {...register(field.key)}
                  aria-invalid={!!errors[field.key]}
                />
              ) : (
                <input
                  id={`field-${field.key}`}
                  className={cn(ui.input, styles.select)}
                  type={field.type || 'text'}
                  min={field.type === 'number' ? 0 : undefined}
                  step={field.type === 'number' ? '0.01' : undefined}
                  placeholder={field.placeholder}
                  {...register(field.key)}
                  aria-invalid={!!errors[field.key]}
                  autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                />
              )}
              {errors[field.key] && (
                <p className={styles.formError}>{errors[field.key]?.message}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      {error && (
        <p role="alert" className={styles.formError}>
          {error}
        </p>
      )}
      <div className={styles.settingsFooter}>
        {children}
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={15} className={'animate-spin'} />}
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
function RelationSelect({
  field,
  registration,
  control,
  invalid,
}: {
  field: FormField;
  registration: UseFormRegisterReturn;
  control: Control<FormValues>;
  invalid: boolean;
}) {
  const value = useWatch({ control, name: field.key }) || '';
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['options', field.relation],
    queryFn: async () =>
      field.relation === 'users'
        ? api.get<Person[]>('/users')
        : (
            await api.get<PageResult<CrmRecord>>(
              `/${field.relation}?pageSize=100&sortBy=createdAt&sortOrder=desc`,
            )
          ).data,
    enabled: !!field.relation,
    staleTime: 60000,
  });
  return (
    <>
      <select
        id={`field-${field.key}`}
        className={cn(ui.select, styles.select)}
        {...registration}
        value={value}
        aria-invalid={invalid}
        disabled={!!field.relation && query.isPending}
      >
        <option value="">
          {field.relation && query.isPending ? 'Loading…' : `Select ${field.label.toLowerCase()}`}
        </option>
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {label(option)}
          </option>
        ))}
        {query.data
          ?.filter(
            (entry) =>
              field.relation !== 'users' || user?.role !== 'SALES_REP' || entry.id === user.id,
          )
          .map((entry) => (
            <option key={entry.id} value={entry.id}>
              {recordName(entry)}
            </option>
          ))}
      </select>
      {query.isError && (
        <p className={styles.formError}>
          Could not load {field.label.toLowerCase()} options.{' '}
          <button type="button" onClick={() => query.refetch()}>
            Retry
          </button>
        </p>
      )}
    </>
  );
}
export function RecordForm({
  resource,
  record,
  onSubmit,
  pending,
  error,
}: {
  resource: Resource;
  record?: CrmRecord;
  onSubmit: (payload: Record<string, unknown>) => void;
  pending?: boolean;
  error?: string;
}) {
  const { user } = useAuth();
  const formFields = useMemo(
    () =>
      fields[resource].filter(
        (field) =>
          !(record && resource === 'deals' && field.key === 'stage') &&
          !(record?.status === 'CONVERTED' && field.key === 'status'),
      ),
    [resource, record],
  );
  const initial: FormValues = {};
  const defaults: FormValues = {
    status: resource === 'tasks' ? 'TODO' : 'NEW',
    priority: 'MEDIUM',
    source: 'WEBSITE',
    stage: 'QUALIFICATION',
    ownerId: user?.id || '',
    assigneeId: user?.id || '',
    value: '0',
  };
  for (const field of formFields) {
    const value = record?.[field.key as keyof CrmRecord];
    initial[field.key] =
      value != null
        ? field.type === 'date'
          ? String(value).slice(0, 10)
          : String(value)
        : record
          ? ''
          : defaults[field.key] || '';
  }
  return (
    <FieldsForm
      formFields={formFields}
      initial={initial}
      pending={pending}
      error={error}
      submitLabel={
        record
          ? 'Save changes'
          : `Create ${resource === 'companies' ? 'company' : resource.slice(0, -1)}`
      }
      onSubmit={(values) => {
        const payload: Record<string, unknown> = {};
        for (const field of formFields) {
          const value = values[field.key];
          if (field.type === 'number') payload[field.key] = Number(value);
          else if (field.type === 'date')
            payload[field.key] = value ? new Date(`${value}T12:00:00`).toISOString() : null;
          else if (field.relation) payload[field.key] = value || null;
          else payload[field.key] = value || (field.required ? '' : null);
        }
        onSubmit(payload);
      }}
    />
  );
}
