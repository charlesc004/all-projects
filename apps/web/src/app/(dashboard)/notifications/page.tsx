import { Suspense } from 'react';
import { NotificationsPage } from '@/features/crm/notifications-page';
import { LoadingRows } from '@/features/crm/common';
export default function Page() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <NotificationsPage />
    </Suspense>
  );
}
