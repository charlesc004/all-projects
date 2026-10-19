'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LockKeyhole, Plus, ShieldCheck, UserRound, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldsForm, FormValues } from '@/components/forms/record-form';
import { ErrorState, initialLetters, LoadingRows, useFilters } from './common';
import { FormField, label, Person } from './types';
import styles from './modules.styles';
const tabs = [
  { id: 'profile', name: 'My profile', icon: UserRound },
  { id: 'security', name: 'Password & security', icon: LockKeyhole },
  { id: 'organization', name: 'Organization', icon: Building2 },
  { id: 'team', name: 'Team members', icon: Users },
];
const profileFields: FormField[] = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'email', label: 'Email address', type: 'email', required: true },
];
const passwordFields: FormField[] = [
  { key: 'currentPassword', label: 'Current password', type: 'password', required: true },
  { key: 'newPassword', label: 'New password', type: 'password', required: true, minLength: 12 },
];
const organizationFields: FormField[] = [
  { key: 'name', label: 'Organization name', required: true },
  { key: 'website', label: 'Website', placeholder: 'https://example.com' },
  { key: 'industry', label: 'Industry' },
  { key: 'address', label: 'Address', type: 'textarea' },
];
const roles = ['ADMIN', 'MANAGER', 'SALES_REP'];
const teamFields: FormField[] = [
  { key: 'name', label: 'Full name', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'role', label: 'Role', type: 'select', options: roles, required: true },
  { key: 'password', label: 'Initial password', type: 'password', required: true, minLength: 12 },
];
export function SettingsPage() {
  const { user } = useAuth();
  const { params, update } = useFilters();
  const visibleTabs = tabs.filter((entry) =>
    ['organization', 'team'].includes(entry.id)
      ? user?.role === 'ADMIN' || user?.role === 'MANAGER'
      : true,
  );
  const tab = visibleTabs.some((entry) => entry.id === params.get('tab'))
    ? params.get('tab')
    : 'profile';
  return (
    <>
      <div className={ui['page-header']}>
        <div>
          <h1 className={ui['page-title']}>Settings</h1>
          <p className={ui['page-description']}>Make Nexus work for you and your team.</p>
        </div>
      </div>
      <div className={cn(ui.card, styles.settingsCard)}>
        <div className={styles.tabs} role="tablist" aria-label="Settings sections">
          {visibleTabs.map((entry) => (
            <button
              key={entry.id}
              className={cn(
                styles.tab,
                tab === entry.id ? styles.activeTab : '',
                'flex! items-center! gap-[7px]!',
              )}
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => update('tab', entry.id)}
            >
              <entry.icon size={14} />
              {entry.name}
            </button>
          ))}
        </div>
        <div className={styles.settingsBody}>
          {tab === 'profile' ? (
            <ProfileSettings />
          ) : tab === 'security' ? (
            <SecuritySettings />
          ) : tab === 'organization' ? (
            <OrganizationSettings />
          ) : (
            <TeamSettings />
          )}
        </div>
      </div>
    </>
  );
}
function ProfileSettings() {
  const { user, isLoading } = useAuth();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.patch('/settings/profile', values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['auth'] });
      void client.invalidateQueries({ queryKey: ['options', 'users'] });
      toast.success('Profile updated');
    },
  });
  if (isLoading || !user) return <LoadingRows />;
  return (
    <>
      <h2 className={styles.sectionTitle}>Personal information</h2>
      <p className={styles.settingsDescription}>
        Your name and email are visible to people in your workspace.
      </p>
      <div className={cn(styles.person, 'mb-[28px]!')}>
        <span
          className={cn(styles.avatar, 'w-[55px]! h-[55px]! text-[length:17px]! rounded-[15px]!')}
        >
          {initialLetters(user.name)}
        </span>
        <div>
          <strong className={'text-[length:14px]! text-[#42506a]!'}>{user.name}</strong>
          <div className={styles.secondary}>{label(user.role)}</div>
        </div>
      </div>
      <FieldsForm
        key={`${user.name}-${user.email}`}
        formFields={profileFields}
        initial={{ name: user.name, email: user.email }}
        onSubmit={(values) => mutation.mutate(values)}
        pending={mutation.isPending}
        error={mutation.error?.message}
      />
    </>
  );
}
function SecuritySettings() {
  const router = useRouter();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.post('/auth/change-password', values),
    onSuccess: () => {
      client.clear();
      toast.success('Password changed. Sign in with your new password.');
      router.replace('/login');
    },
  });
  return (
    <>
      <h2 className={styles.sectionTitle}>Change your password</h2>
      <p className={styles.settingsDescription}>
        Use at least 12 characters, including uppercase and lowercase letters and a number. Changing
        your password signs you out of all sessions.
      </p>
      <FieldsForm
        formFields={passwordFields}
        onSubmit={(values) => mutation.mutate(values)}
        pending={mutation.isPending}
        error={mutation.error?.message}
        submitLabel="Update password"
      />
      <div className={cn(styles.banner, 'mt-[28px]! mb-0! flex! gap-[10px]!')}>
        <ShieldCheck size={20} className={'shrink-0! mt-[2px]!'} />
        Your account uses secure, HttpOnly sessions. Never share your password with someone else.
      </div>
    </>
  );
}
function OrganizationSettings() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['organization'],
    queryFn: () =>
      api.get<{
        id: string;
        name: string;
        website?: string;
        industry?: string;
        address?: string;
        currency: string;
      }>('/settings/organization'),
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.patch('/settings/organization', values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Organization updated');
    },
  });
  if (query.isPending) return <LoadingRows />;
  if (query.isError) return <ErrorState retry={() => query.refetch()} />;
  const organization = query.data;
  return (
    <>
      <h2 className={styles.sectionTitle}>Organization information</h2>
      <p className={styles.settingsDescription}>
        Manage the business details shared across your workspace. Your reporting currency is{' '}
        {organization.currency}.
      </p>
      {user?.role === 'ADMIN' ? (
        <FieldsForm
          key={JSON.stringify(organization)}
          formFields={organizationFields}
          initial={{
            name: organization.name,
            website: organization.website || '',
            industry: organization.industry || '',
            address: organization.address || '',
          }}
          onSubmit={(values) => mutation.mutate(values)}
          pending={mutation.isPending}
          error={mutation.error?.message}
        />
      ) : (
        <>
          <div className={styles.banner}>
            Organization information can be updated by an administrator.
          </div>
          <div className={styles.details}>
            {organizationFields.map((field) => (
              <div key={field.key}>
                <div className={styles.detailLabel}>{field.label}</div>
                <div className={styles.detailValue}>
                  {organization[field.key as keyof typeof organization] || '—'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
function TeamSettings() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [change, setChange] = useState<{
    member: Person;
    role?: string;
    active?: false;
  }>();
  const query = useQuery({
    queryKey: ['options', 'users'],
    queryFn: () => api.get<Person[]>('/users'),
  });
  const add = useMutation({
    mutationFn: (values: FormValues) => api.post('/users', values),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['options', 'users'] });
      setAdding(false);
      toast.success('Team member added');
    },
  });
  const update = useMutation({
    mutationFn: () =>
      api.patch(
        `/users/${change?.member.id}`,
        change?.active === false ? { active: false } : { role: change?.role },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['options', 'users'] });
      void client.invalidateQueries({ queryKey: ['auth'] });
      setChange(undefined);
      toast.success('Team member updated');
    },
  });
  const isAdmin = user?.role === 'ADMIN';
  return (
    <>
      <div className={'flex! justify-between! items-center! gap-[16px]!'}>
        <h2 className={styles.sectionTitle}>Your team</h2>
        {isAdmin && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={14} />
            Add member
          </Button>
        )}
      </div>
      <p className={styles.settingsDescription}>
        Manage who has access to your workspace and what they can do.
      </p>
      {!isAdmin && (
        <div className={styles.banner}>Only administrators can add members or change access.</div>
      )}
      {query.isPending ? (
        <LoadingRows />
      ) : query.isError ? (
        <ErrorState retry={() => query.refetch()} />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                {isAdmin && (
                  <th>
                    <span className={ui['sr-only']}>Actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {query.data.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className={styles.person}>
                      <span className={styles.avatar}>{initialLetters(member.name)}</span>
                      <div>
                        <span className={styles.primary}>
                          {member.name}
                          {member.id === user?.id && <span className={styles.count}>You</span>}
                        </span>
                        <div className={styles.secondary}>{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isAdmin ? (
                      <select
                        className={ui.select}
                        value={member.role}
                        aria-label={`Role for ${member.name}`}
                        onChange={(event) => setChange({ member, role: event.target.value })}
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {label(role)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      label(member.role)
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      {member.id !== user?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setChange({ member, active: false })}
                        >
                          Deactivate
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog
        open={adding}
        onOpenChange={(open) => {
          if (!add.isPending) {
            setAdding(open);
            add.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>
              Create an account for your organization. Share the initial password securely; the
              member can change it in settings.
            </DialogDescription>
          </DialogHeader>
          {adding && (
            <FieldsForm
              formFields={teamFields}
              initial={{ role: 'SALES_REP' }}
              onSubmit={(values) => add.mutate(values)}
              pending={add.isPending}
              error={add.error?.message}
              submitLabel="Add member"
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!change}
        onOpenChange={(open) => {
          if (!open && !update.isPending) {
            setChange(undefined);
            update.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {change?.active === false ? 'Deactivate team member?' : 'Change team member role?'}
            </DialogTitle>
            <DialogDescription>
              {change?.active === false
                ? `${change.member.name} will no longer be able to access this workspace.`
                : `${change?.member.name} will have ${label(change?.role || '').toLowerCase()} permissions. This changes their access across the workspace.`}
            </DialogDescription>
          </DialogHeader>
          {update.isError && (
            <p className={styles.formError} role="alert">
              {update.error.message}
            </p>
          )}
          <div className={styles.pageActions}>
            <Button
              variant="outline"
              onClick={() => setChange(undefined)}
              disabled={update.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={change?.active === false ? 'destructive' : 'default'}
              disabled={update.isPending}
              onClick={() => update.mutate()}
            >
              {update.isPending ? 'Updating…' : 'Confirm change'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
