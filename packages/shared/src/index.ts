export const ROLES = ['ADMIN', 'MANAGER', 'SALES_REP'] as const;
export type Role = (typeof ROLES)[number];
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'LINKEDIN',
  'EVENT',
  'OUTBOUND',
  'OTHER',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Priority = (typeof PRIORITIES)[number];
export const DEAL_STAGES = [
  'QUALIFICATION',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type EntityType = 'lead' | 'contact' | 'company' | 'deal';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  avatar?: string | null;
  createdAt?: string;
}
export interface Organization {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  currency: string;
  createdAt?: string;
}
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
export interface RecordBase {
  id: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
}
export interface Lead extends RecordBase {
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  companyName?: string | null;
  title?: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: Priority;
  ownerId: string;
  owner: User;
  convertedAt?: string | null;
  convertedContactId?: string | null;
  convertedCompanyId?: string | null;
  convertedDealId?: string | null;
}
export interface Company extends RecordBase {
  name: string;
  website?: string | null;
  industry?: string | null;
  size?: string | null;
  phone?: string | null;
  address?: string | null;
  ownerId: string;
  owner: User;
  contacts?: Contact[];
  deals?: Deal[];
  _count?: { contacts: number; deals: number };
}
export interface Contact extends RecordBase {
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  company?: Company | null;
  ownerId: string;
  owner: User;
  deals?: Deal[];
}
export interface Deal extends RecordBase {
  title: string;
  value: number;
  stage: DealStage;
  expectedCloseDate: string | null;
  ownerId: string;
  owner: User;
  companyId?: string | null;
  company?: Company | null;
  contactId?: string | null;
  contact?: Contact | null;
  lostReason?: string | null;
  closedAt?: string | null;
}
export interface Task extends RecordBase {
  title: string;
  description?: string | null;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  assigneeId: string;
  assignee: User;
  leadId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  completedAt?: string | null;
}
export interface Note extends RecordBase {
  body: string;
  authorId: string;
  author: User;
  leadId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
}
export interface Activity {
  id: string;
  organizationId?: string;
  action: string;
  description: string;
  createdAt: string;
  actorId?: string | null;
  actor?: User | null;
  leadId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  taskId?: string | null;
}
export interface Notification {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  userId: string;
  taskId?: string | null;
  link?: string | null;
}
export interface DashboardSummary {
  metrics: {
    totalLeads: number;
    totalContacts: number;
    openDeals: number;
    pipelineValue: number;
    wonRevenue: number;
    conversionRate: number;
    wonDeals: number;
  };
  salesPerformance: { month: string; revenue: number; target?: number }[];
  pipeline: { stage: DealStage; count: number; value: number }[];
  recentActivities: Activity[];
  upcomingTasks: Task[];
  recentLeads: Lead[];
  period: { from: string; to: string };
}
export interface SalesReport {
  revenueOverTime: { month: string; revenue: number }[];
  leadsBySource: { source: string; count: number }[];
  leadsByStatus: { status: string; count: number }[];
  dealsByStage: { stage: DealStage; count: number; value: number }[];
  teamPerformance: {
    id: string;
    name: string;
    wonRevenue: number;
    wonDeals: number;
    totalDeals: number;
  }[];
  stats: { wonRevenue: number; wonDeals: number; lostDeals: number; winRate: number };
}
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  requestId?: string;
}
export const displayLabel = (value: string): string =>
  value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
