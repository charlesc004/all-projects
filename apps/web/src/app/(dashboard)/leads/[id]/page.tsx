import { RecordDetail } from '@/features/crm/record-detail';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecordDetail resource="leads" id={id} />;
}
