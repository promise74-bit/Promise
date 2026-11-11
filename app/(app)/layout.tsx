import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppShell from '@/components/app/AppShell';
import { buildServiceGroups } from '@/lib/app-nav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: wallet }, { count }, { data: services }] = await Promise.all([
    supabase.from('profiles').select('full_name,role').eq('id', user.id).maybeSingle(),
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    supabase.from('services').select('slug,title,category').eq('active', true).order('sort_order'),
  ]);

  return (
    <AppShell
      groups={buildServiceGroups(services ?? [])}
      name={profile?.full_name || ''} email={user.email || ''} userId={user.id}
      balance={Number(wallet?.balance || 0)} unread={Number(count || 0)} isAdmin={profile?.role === 'admin'}
    >
      {children}
    </AppShell>
  );
}
