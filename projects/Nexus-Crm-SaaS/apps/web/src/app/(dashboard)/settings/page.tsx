import { Suspense } from 'react';
import { SettingsPage } from '@/features/crm/settings-page';
import { LoadingRows } from '@/features/crm/common';
export default function Page() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <SettingsPage />
    </Suspense>
  );
}
