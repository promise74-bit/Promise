import { createAdminClient } from '@/lib/supabase/admin';
import { getMarkupRules, MARKUP_CATEGORIES, MARKUP_LABELS } from '@/lib/markup';
import MarkupForm from './MarkupForm';

export const dynamic = 'force-dynamic';

export default async function AdminMarkup() {
  const rules = await getMarkupRules(createAdminClient());
  const rows = MARKUP_CATEGORIES.map(c => ({ category: c, label: MARKUP_LABELS[c], rule: rules[c] }));
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-black">Your markup</h2>
      <p className="mt-1 text-sm text-slate-500">Our cost price plus the markup you set here is what your customer pays. Change it any time; it applies to new orders.</p>
      <MarkupForm rows={rows} />
    </div>
  );
}
