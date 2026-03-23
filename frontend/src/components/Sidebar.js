'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { isAdmin } from '@/lib/auth';

const navItems = [
  { label: 'Dashboard',  href: '/admin',            adminOnly: false },
  { label: 'Leads',      href: '/admin/leads',      adminOnly: false },
  { label: 'Tips',       href: '/admin/tips',       adminOnly: false },
  { label: 'Payments',   href: '/admin/payments',   adminOnly: false },
  { label: 'Accounting', href: '/admin/accounting', adminOnly: true  },
  { label: 'Packages',   href: '/admin/packages',   adminOnly: true  },
  { label: 'Settings',   href: '/admin/settings',   adminOnly: true  },
];

export default function Sidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  const admin = isAdmin(user);

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: '#111',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
    }}>
      <div style={{ padding: '0 20px 32px' }}>
        <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {admin ? 'Admin' : 'Staff'}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 600 }}>
          {user?.name ?? ''}
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems
          .filter(item => !item.adminOnly || admin)
          .map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'block',
                padding: '10px 20px',
                color: active ? '#fff' : '#aaa',
                background: active ? '#222' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                borderLeft: active ? '3px solid #fff' : '3px solid transparent',
              }}>
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div style={{ padding: '20px' }}>
        <Link href="/api/auth/logout" style={{
          display: 'block',
          textAlign: 'center',
          padding: '8px',
          background: '#222',
          color: '#aaa',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '13px',
        }}>
          Sign out
        </Link>
      </div>
    </aside>
  );
}