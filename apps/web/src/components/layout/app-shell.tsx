'use client';
import { ui } from '@/components/ui/styles';
import { useCallback, useEffect, useState } from 'react';
import * as NavigationDialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  ContactRound,
  FileBarChart2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Wallet,
  X,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Company, Contact, Deal, Lead, Notification, Paginated, User } from '@nexus/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/hooks/use-debounce';
import { cn, initials, label, timeAgo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from './logo';
const navigation = [
  { href: '/dashboard', title: 'Overview', icon: LayoutDashboard },
  { href: '/leads', title: 'Leads', icon: Target },
  { href: '/contacts', title: 'Contacts', icon: ContactRound },
  { href: '/companies', title: 'Companies', icon: Building2 },
  { href: '/deals', title: 'Deals & pipeline', icon: Wallet },
  { href: '/tasks', title: 'Tasks', icon: ListTodo },
];
function ProfileMenu({ user, children }: { user: User; children: React.ReactNode }) {
  const { logout } = useAuth();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className={'pt-[9px]! pr-[10px]! pb-[12px]! pl-[10px]!'}>
          <strong className={'text-[length:12px]!'}>{user.name}</strong>
          <p className={cn(ui['text-muted'], 'text-[length:10px]! mt-[5px]!')}>{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRound size={14} />
            My profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?tab=security">
            <ShieldCheck size={14} />
            Security settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout().catch((error) => toast.error(error.message))}>
          <LogOut size={14} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function NotificationsMenu() {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ['notifications', 'menu'],
    queryFn: () => api.get<Paginated<Notification>>('/notifications?pageSize=6'),
    refetchInterval: 60000,
  });
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api.get<Paginated<Notification>>('/notifications?unread=true&pageSize=1'),
    refetchInterval: 60000,
  });
  const unread = unreadQuery.data?.meta.total || 0;
  const read = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={ui['notification-trigger']}
          aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        >
          <Bell size={17} />
          {unread > 0 && <span className={ui['notification-dot']} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className={ui['notifications-menu']} align="end">
        <div className={ui['menu-heading']}>
          <h3>Notifications</h3>
          <span className={ui.badge}>{unread} unread</span>
        </div>
        {notifications.isError ? (
          <div className={ui['empty-state']}>
            <p>Notifications unavailable</p>
            <Button variant="ghost" size="sm" onClick={() => notifications.refetch()}>
              Retry
            </Button>
          </div>
        ) : notifications.data?.data.length ? (
          notifications.data.data.map((n) => (
            <button
              key={n.id}
              type="button"
              className={cn(
                ui['notification-item'],
                !n.readAt && ui.unread,
                'border-l-0! border-r-0! border-t-0! w-full!',
                n.readAt ? 'bg-white!' : '',
                'text-left!',
              )}
              onClick={() => !n.readAt && read.mutate(n.id)}
              disabled={read.isPending}
            >
              <span className={cn(ui['notification-mark'], n.readAt ? 'bg-[#d9dce5]!' : '')} />
              <div>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <small>
                  {timeAgo(n.createdAt)} · {n.readAt ? 'Read' : 'Click to mark read'}
                </small>
              </div>
            </button>
          ))
        ) : (
          <div className={ui['empty-state']}>
            <Check size={23} />
            <p>You’re all caught up.</p>
          </div>
        )}
        <Link href="/notifications" className={ui['menu-footer']}>
          View all notifications
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState('');
  const term = useDebounce(search);
  const router = useRouter();
  const result = useQuery({
    queryKey: ['global-search', term],
    enabled: open && term.trim().length >= 2,
    queryFn: async () => {
      const q = `?search=${encodeURIComponent(term)}&pageSize=4`;
      const [leads, contacts, companies, deals] = await Promise.all([
        api.get<Paginated<Lead>>(`/leads${q}`),
        api.get<Paginated<Contact>>(`/contacts${q}`),
        api.get<Paginated<Company>>(`/companies${q}`),
        api.get<Paginated<Deal>>(`/deals${q}`),
      ]);
      return [
        ...leads.data.map((x) => ({
          id: x.id,
          name: `${x.firstName} ${x.lastName}`,
          description: x.email,
          type: 'Lead',
          href: `/leads/${x.id}`,
          icon: Target,
        })),
        ...contacts.data.map((x) => ({
          id: x.id,
          name: `${x.firstName} ${x.lastName}`,
          description: x.email,
          type: 'Contact',
          href: `/contacts/${x.id}`,
          icon: ContactRound,
        })),
        ...companies.data.map((x) => ({
          id: x.id,
          name: x.name,
          description: x.industry || 'Company',
          type: 'Company',
          href: `/companies/${x.id}`,
          icon: Building2,
        })),
        ...deals.data.map((x) => ({
          id: x.id,
          name: x.title,
          description: label(x.stage),
          type: 'Deal',
          href: `/deals?search=${encodeURIComponent(x.title)}`,
          icon: Wallet,
        })),
      ];
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={ui['search-dialog']}>
        <DialogTitle className={ui['sr-only']}>Search your workspace</DialogTitle>
        <DialogDescription className={ui['sr-only']}>
          Find leads, contacts, companies, and deals by entering at least two characters.
        </DialogDescription>
        <div className={ui['search-input-wrap']}>
          <Search size={20} />
          <input
            autoFocus
            placeholder="Search your workspace…"
            aria-label="Search all records"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className={ui['search-results']}>
          {term.trim().length < 2 ? (
            <div className={ui['empty-state']}>
              <Command size={25} />
              <p>
                A name, company, or your next opportunity.
                <br />
                Type at least 2 characters to start searching.
              </p>
            </div>
          ) : result.isLoading ? (
            <div className={ui['empty-state']}>
              <p>Searching your workspace…</p>
            </div>
          ) : result.isError ? (
            <div className={ui['empty-state']}>
              <p>{result.error.message}</p>
              <Button variant="outline" onClick={() => result.refetch()}>
                Try again
              </Button>
            </div>
          ) : !result.data?.length ? (
            <div className={ui['empty-state']}>
              <Search size={25} />
              <p>No results for “{term}”. Try another search.</p>
            </div>
          ) : (
            result.data.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                className={cn(ui['search-result'], 'w-full! bg-transparent! border-0! text-left!')}
                onClick={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
              >
                <item.icon size={18} className={ui['text-muted']} />
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </div>
                <span className={cn(ui.badge, ui['badge-secondary'])}>{item.type}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
function SidebarSurface({ open, children }: { open: boolean; children: React.ReactElement }) {
  if (!open) return children;
  return (
    <NavigationDialog.Portal>
      <NavigationDialog.Overlay className={ui['mobile-overlay']} />
      <NavigationDialog.Content asChild aria-describedby={undefined}>
        {children}
      </NavigationDialog.Content>
    </NavigationDialog.Portal>
  );
}
export function AppShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const setSearch = useCallback((value: boolean) => setSearchOpen(value), []);
  const current = [
    ...navigation,
    { href: '/reports', title: 'Reports' },
    { href: '/notifications', title: 'Notifications' },
    { href: '/settings', title: 'Settings' },
  ].find((n) => pathname.startsWith(n.href));
  const segments = pathname.split('/').filter(Boolean);
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 641px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);
  return (
    <NavigationDialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className={cn(ui['app-shell'], collapsed && ui['shell-collapsed'])}>
        <a className={ui['skip-link']} href="#main-content">
          Skip to content
        </a>
        <SidebarSurface open={mobileOpen}>
          <aside
            className={cn(ui.sidebar, mobileOpen && ui['mobile-drawer'])}
            aria-label="Main navigation"
            onClickCapture={(event) => {
              if (mobileOpen && event.target instanceof Element && event.target.closest('a')) {
                setMobileOpen(false);
              }
            }}
          >
            {mobileOpen && (
              <>
                <NavigationDialog.Title className={ui['sr-only']}>
                  Main navigation
                </NavigationDialog.Title>
                <NavigationDialog.Close
                  className={ui['mobile-close']}
                  aria-label="Close navigation"
                >
                  <X size={20} />
                </NavigationDialog.Close>
              </>
            )}
            <Link
              href="/dashboard"
              aria-label="Nexus dashboard"
              onClick={() => setMobileOpen(false)}
            >
              <Logo />
            </Link>
            <button
              className={ui['sidebar-collapse']}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
            <Link
              href={user.role === 'SALES_REP' ? '/settings' : '/settings?tab=organization'}
              className={ui['workspace-switch']}
            >
              <span className={ui['workspace-logo']}>N</span>
              <span>
                Nexus Studio
                <small>{user.role === 'SALES_REP' ? 'Personal workspace' : 'Team workspace'}</small>
              </span>
              <ChevronDown size={12} className={'ml-auto!'} />
            </Link>
            <p className={ui['nav-label']}>WORKSPACE</p>
            <nav className={ui['nav-items']}>
              {navigation.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  className={cn(ui['nav-item'], pathname.startsWith(item.href) && ui.active)}
                  aria-label={item.title}
                  aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                  title={collapsed ? item.title : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon />
                  <span className={ui['nav-text']}>{item.title}</span>
                  {item.href === '/leads' && <span className={ui['nav-count']}>CRM</span>}
                </Link>
              ))}
            </nav>
            <div className={ui['nav-spacer']} />
            <p className={ui['nav-label']}>MANAGEMENT</p>
            <nav className={ui['nav-items']}>
              {user.role !== 'SALES_REP' && (
                <Link
                  href="/reports"
                  aria-label="Reports & analytics"
                  aria-current={pathname.startsWith('/reports') ? 'page' : undefined}
                  className={cn(ui['nav-item'], pathname.startsWith('/reports') && ui.active)}
                  onClick={() => setMobileOpen(false)}
                >
                  <FileBarChart2 />
                  <span className={ui['nav-text']}>Reports & analytics</span>
                </Link>
              )}
              <Link
                href="/notifications"
                aria-label="Notifications"
                aria-current={pathname.startsWith('/notifications') ? 'page' : undefined}
                className={cn(ui['nav-item'], pathname.startsWith('/notifications') && ui.active)}
                onClick={() => setMobileOpen(false)}
              >
                <Bell />
                <span className={ui['nav-text']}>Notifications</span>
              </Link>
              <Link
                href="/settings"
                aria-label="Settings"
                aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
                className={cn(ui['nav-item'], pathname.startsWith('/settings') && ui.active)}
                onClick={() => setMobileOpen(false)}
              >
                <Settings2 />
                <span className={ui['nav-text']}>Settings</span>
              </Link>
            </nav>
            <div className={ui['sidebar-bottom']}>
              <div className={ui['sidebar-help']}>
                <Sparkles size={17} className={'text-[#a393db]!'} />
                <h3 className={ui['sidebar-help-title']}>Good things start with a lead.</h3>
                <p>
                  Your next great relationship
                  <br />
                  is one conversation away.
                </p>
                <Link href="/leads?create=true">
                  Add your next lead
                  <ArrowUpRight size={12} />
                </Link>
              </div>
              <ProfileMenu user={user}>
                <button className={ui['sidebar-profile']} aria-label={`Account for ${user.name}`}>
                  <span className={ui.avatar}>{initials(user.name)}</span>
                  <span className={ui['profile-copy']}>
                    <span className={ui['profile-name']}>{user.name}</span>
                    <span className={cn(ui['profile-role'], 'block!')}>{label(user.role)}</span>
                  </span>
                  <ChevronDown className={cn(ui['profile-chevron'], 'ml-auto!')} size={13} />
                </button>
              </ProfileMenu>
            </div>
          </aside>
        </SidebarSurface>
        <div className={ui['main-container']}>
          <header className={ui.topbar}>
            <div className={'flex! items-center! gap-[12px]!'}>
              <NavigationDialog.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={ui['mobile-toggle']}
                  aria-label="Open navigation"
                >
                  <Menu size={19} />
                </Button>
              </NavigationDialog.Trigger>
              <div className={ui.breadcrumb}>
                <Link href="/dashboard" aria-label="Home">
                  <Home size={13} />
                </Link>
                <ChevronRight className={ui['breadcrumb-home-divider']} size={11} />
                <Link href={current?.href || '/dashboard'}>{current?.title || 'Workspace'}</Link>
                {segments.length > 1 && (
                  <>
                    <ChevronRight size={11} />
                    <strong>Record details</strong>
                  </>
                )}
              </div>
            </div>
            <div className={ui['topbar-actions']}>
              <button
                className={ui['topbar-search']}
                onClick={() => setSearchOpen(true)}
                aria-label="Search workspace"
              >
                <Search size={15} />
                <span>Search anything…</span>
                <kbd>⌘ K</kbd>
              </button>
              <span className={ui['topbar-divider']} />
              <NotificationsMenu />
              <ProfileMenu user={user}>
                <button
                  type="button"
                  className={cn(ui.btn, ui['btn-ghost'], ui['btn-icon'])}
                  aria-label="Open profile menu"
                >
                  <span className={cn(ui.avatar, 'bg-[#f0e7de]! text-[#76573e]!')}>
                    {initials(user.name)}
                  </span>
                </button>
              </ProfileMenu>
            </div>
          </header>
          <main className={ui['main-content']} id="main-content" tabIndex={-1}>
            {children}
            <footer className={ui['app-footer']}>
              <span>© {new Date().getFullYear()} Nexus CRM. A little clarity goes a long way.</span>
              <span>
                <i className={ui['status-live']} />
                Connected to your workspace
              </span>
            </footer>
          </main>
        </div>
        <GlobalSearch open={searchOpen} onOpenChange={setSearch} />
      </div>
    </NavigationDialog.Root>
  );
}
