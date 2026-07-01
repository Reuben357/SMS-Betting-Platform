import { connection } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function AdminLayout({ children }) {
    const session = await auth0.getSession();
    if (!session) {
        redirect('/api/auth/login?returnTo=/admin/dashboard');
    }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, background: '#f5f5f5' }}>
        {children}
      </main>
    </div>
  );
}