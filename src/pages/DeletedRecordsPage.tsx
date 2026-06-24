import { useEffect, useState } from 'react';
import type { BreakRecord } from '../types';
import { getBreakRecords, restoreRecord } from '../services/recordsService';
import { useAuthStore } from '../store/authStore';
import { PageHeader } from '../components/layout/PageHeader';
import { RecordsTable } from '../components/records/RecordsTable';

export function DeletedRecordsPage() {
  const profile = useAuthStore((state) => state.profile)!;
  const [records, setRecords] = useState<BreakRecord[]>([]);

  async function load() {
    setRecords((await getBreakRecords({ includeDeleted: true }, 1000)).filter((record) => record.deleted));
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(record: BreakRecord) {
    await restoreRecord(record, profile);
    await load();
  }

  return (
    <div>
      <PageHeader title="Deleted Records / Restore" description="Records are soft-deleted only. Super Admin can restore any deleted break record with full audit trace." />
      <RecordsTable records={records} canEdit={false} canRestore onRestore={restore} />
    </div>
  );
}
