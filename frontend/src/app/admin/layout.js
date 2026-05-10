import { getSession } from '@auth0/nextjs-auth0';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default async function AdminLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/api/auth/login');
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