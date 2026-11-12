import { createClient } from '@/lib/supabase/server';
import { customerSafeError } from '@/lib/service-errors';
import NotificationCenter from '@/components/notifications/NotificationCenter';

export const metadata = { title: 'Notifications' };
export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from('notifications').select('id,title,message,read,created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(100);
  const initial = (data ?? []).map(n => ({ ...n, message: customerSafeError(n.message) }));
  return <NotificationCenter initial={initial} />;
}
