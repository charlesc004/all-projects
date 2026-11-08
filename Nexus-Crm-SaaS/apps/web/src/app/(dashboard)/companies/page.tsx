import { Suspense } from 'react';
import { RecordList } from '@/features/crm/record-list';
import { LoadingRows } from '@/features/crm/common';
export default function Page() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <RecordList resource="companies" />
    </Suspense>
  );
}
