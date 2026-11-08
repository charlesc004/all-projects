'use client';
import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { Logo } from '@/components/layout/logo';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { ErrorState } from '@/components/ui/states';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error, refetch } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user && error instanceof ApiError && error.status === 401)
      router.replace('/login');
  }, [user, isLoading, error, router]);
  if (error && (!(error instanceof ApiError) || error.status !== 401))
    return (
      <div className={'min-h-screen! grid! place-items-center!'}>
        <ErrorState error={error} retry={() => refetch()} />
      </div>
    );
  if (isLoading || !user)
    return (
      <div className={'min-h-screen! flex! items-center! justify-center! bg-navy!'}>
        <div>
          <Logo />
          <div className={cn(ui.skeleton, 'h-[3px]! w-[130px]! opacity-[0.4]! my-0! mx-auto!')} />
        </div>
      </div>
    );
  return <AppShell user={user}>{children}</AppShell>;
}
