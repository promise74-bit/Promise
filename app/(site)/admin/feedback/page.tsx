import { createAdminClient } from '@/lib/supabase/admin';
import FeedbackRow from './FeedbackRow';
import MarkAllRead from './MarkAllRead';

export const metadata = { title: 'Feedback' };
export const dynamic = 'force-dynamic';

export default async function AdminFeedback() {
  const { data, error } = await createAdminClient().from('feedback').select('id,message,contact,read,created_at').order('created_at', { ascending: false }).limit(200);
  const items = data ?? []; const unread = items.filter(i => !i.read).length;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-black">Feedback</h2><p className="mt-1 text-sm text-slate-500">What visitors said on the landing page. {unread ? `${unread} unread.` : 'All read.'}</p></div>
        {unread > 0 && <MarkAllRead />}
      </div>
      {error && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Could not load feedback. Has the feedback SQL been run?</p>}
      {items.length === 0 && !error ? <p className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No feedback yet.</p>
        : <ul className="mt-5 space-y-3">{items.map(i => <FeedbackRow key={i.id} item={i} />)}</ul>}
    </div>
  );
}
