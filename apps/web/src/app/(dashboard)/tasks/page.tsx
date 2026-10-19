import { Suspense } from 'react';
import { TasksPage } from '@/features/crm/tasks-page';
import { LoadingRows } from '@/features/crm/common';
export default function Page() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <TasksPage />
    </Suspense>
  );
}
