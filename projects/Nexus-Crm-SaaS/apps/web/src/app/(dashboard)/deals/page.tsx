import { Suspense } from 'react';
import { DealsPage } from '@/features/crm/deals-page';
import { LoadingRows } from '@/features/crm/common';
export default function Page() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <DealsPage />
    </Suspense>
  );
}
