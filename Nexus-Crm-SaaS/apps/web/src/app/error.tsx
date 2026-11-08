'use client';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/states';
export default function PageError({
  error,
  reset,
}: {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Nexus page error', error.digest || error.name);
  }, [error]);
  return (
    <div className={'py-[80px]! px-[20px]! min-h-[60vh]! grid! place-items-center!'}>
      <ErrorState
        error={
          new Error('This page encountered a problem. Your saved work is safe. Please try again.')
        }
        retry={reset}
      />
    </div>
  );
}
