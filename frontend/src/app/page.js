import { redirect } from 'next/navigation';

// Redirect root to the admin dashboard (protected by middleware)
export default function Home() {
  redirect('/admin/dashboard');
}