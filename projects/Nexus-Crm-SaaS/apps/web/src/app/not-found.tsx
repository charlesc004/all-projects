import { cn } from '@/lib/utils';
import { ui } from '@/components/ui/styles';
import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function NotFound() {
  return (
    <main
      className={
        'min-h-screen! flex! items-center! justify-center! flex-col! text-center! gap-[18px]! p-[25px]!'
      }
    >
      <span className={ui['auth-form-icon']}>
        <Compass size={23} />
      </span>
      <span className={ui['dashboard-eyebrow']}>A SMALL DETOUR</span>
      <h1 className={ui['page-title']}>Let’s find your way back.</h1>
      <p className={cn(ui['page-description'], 'm-0!')}>
        This page has moved, or the address doesn’t quite look right.
      </p>
      <Button asChild className={'mt-[12px]!'}>
        <Link href="/dashboard">
          <ArrowLeft size={15} />
          Back to your workspace
        </Link>
      </Button>
    </main>
  );
}
