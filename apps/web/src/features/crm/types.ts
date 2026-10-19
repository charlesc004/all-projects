import {
  DEAL_STAGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
  PRIORITIES,
  TASK_STATUSES,
  type Paginated,
  type User,
} from '@nexus/shared';

export type Resource = 'leads' | 'contacts' | 'companies' | 'deals' | 'tasks';
export type Person = Pick<User, 'id' | 'name' | 'email' | 'role'>;
export type Relation = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  title?: string | null;
};
export interface CrmRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  title?: string | null;
  name?: string;
  jobTitle?: string | null;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  source?: string;
  status?: string;
  priority?: string;
  stage?: string;
  value?: number | string;
  expectedCloseDate?: string | null;
  dueDate?: string | null;
  description?: string | null;
  lostReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  ownerId?: string;
  assigneeId?: string;
  companyId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  owner?: Person;
  assignee?: Person;
  company?: Relation | null;
  contact?: Relation | null;
  contacts?: CrmRecord[];
  deals?: CrmRecord[];
  convertedAt?: string | null;
  convertedContactId?: string | null;
  convertedCompanyId?: string | null;
  convertedDealId?: string | null;
}
export type PageResult<T> = Paginated<T>;
export type Note = { id: string; body: string; author?: Person; createdAt: string };
export type Activity = {
  id: string;
  title: string;
  description?: string;
  type: string;
  actor?: Person;
  createdAt: string;
};
export type FormField = {
  key: string;
  label: string;
  type?: 'email' | 'number' | 'date' | 'textarea' | 'select' | 'password';
  required?: boolean;
  options?: readonly string[];
  relation?: Resource | 'users';
  placeholder?: string;
  minLength?: number;
};
export const priorities = PRIORITIES;
export const leadStatuses = LEAD_STATUSES;
export const dealStages = DEAL_STAGES;
export const sources = LEAD_SOURCES;
export const taskStatuses = TASK_STATUSES;
export const label = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const recordName = (record: Relation | CrmRecord) =>
  record.name ||
  [record.firstName, record.lastName].filter(Boolean).join(' ') ||
  record.title ||
  'Untitled';
export const singular: Record<Resource, string> = {
  leads: 'lead',
  contacts: 'contact',
  companies: 'company',
  deals: 'deal',
  tasks: 'task',
};
const owner: FormField = {
  key: 'ownerId',
  label: 'Owner',
  type: 'select',
  relation: 'users',
  required: true,
};
const company: FormField = {
  key: 'companyId',
  label: 'Company',
  type: 'select',
  relation: 'companies',
};
const contact: FormField = {
  key: 'contactId',
  label: 'Contact',
  type: 'select',
  relation: 'contacts',
};
export const fields: Record<Resource, FormField[]> = {
  leads: [
    { key: 'firstName', label: 'First name', required: true },
    { key: 'lastName', label: 'Last name', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'companyName', label: 'Company name' },
    { key: 'title', label: 'Job title' },
    { key: 'source', label: 'Source', type: 'select', options: sources, required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: leadStatuses.filter((s) => s !== 'CONVERTED'),
      required: true,
    },
    { key: 'priority', label: 'Priority', type: 'select', options: priorities, required: true },
    owner,
  ],
  contacts: [
    { key: 'firstName', label: 'First name', required: true },
    { key: 'lastName', label: 'Last name', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'phone', label: 'Phone' },
    { key: 'jobTitle', label: 'Job title' },
    company,
    owner,
  ],
  companies: [
    { key: 'name', label: 'Company name', required: true },
    { key: 'website', label: 'Website', placeholder: 'https://example.com' },
    { key: 'industry', label: 'Industry' },
    { key: 'size', label: 'Company size', placeholder: 'e.g. 51–200 employees' },
    { key: 'phone', label: 'Phone' },
    { key: 'address', label: 'Address', type: 'textarea' },
    owner,
  ],
  deals: [
    { key: 'title', label: 'Deal name', required: true },
    { key: 'value', label: 'Value (USD)', type: 'number', required: true },
    { key: 'expectedCloseDate', label: 'Expected close date', type: 'date' },
    {
      key: 'stage',
      label: 'Stage',
      type: 'select',
      options: dealStages.slice(0, 4),
      required: true,
    },
    company,
    contact,
    owner,
  ],
  tasks: [
    { key: 'title', label: 'Task name', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    { key: 'dueDate', label: 'Due date', type: 'date', required: true },
    { key: 'priority', label: 'Priority', type: 'select', options: priorities, required: true },
    { key: 'status', label: 'Status', type: 'select', options: taskStatuses, required: true },
    { key: 'assigneeId', label: 'Assignee', type: 'select', relation: 'users', required: true },
    { key: 'leadId', label: 'Related lead', type: 'select', relation: 'leads' },
    company,
    contact,
    { key: 'dealId', label: 'Related deal', type: 'select', relation: 'deals' },
  ],
};
