'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';
import UploadForm from '@/components/leads/UploadForm';
import ContactsTable from '@/components/leads/ContactsTable';
import UploadHistory from '@/components/leads/UploadHistory';

export default function LeadsPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <>
      <TopBar title="Leads" />
      <div style={{ padding: '32px', maxWidth: '1100px' }}>
        <UploadForm onUploadComplete={() => setRefresh(r => r + 1)} />
        <ContactsTable refreshTrigger={refresh} />
        <UploadHistory refreshTrigger={refresh} />
      </div>
    </>
  );
}