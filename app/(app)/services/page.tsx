import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getServicePresentation } from '@/lib/service-presentation';
import { buildServiceGroups } from '@/lib/app-nav';
import { getMarkupRules, feeFor } from '@/lib/markup';
import { JAMB_SERVICE_PRICES } from '@/lib/jamb-prices';
import ServiceHub, { type HubGroup } from '@/components/app/ServiceHub';

export const metadata: Metadata = { title: 'Services' };
export const dynamic = 'force-dynamic';

const BLURBS: Record<string, string> = {
  buy: 'Instant top-ups, paid straight from your wallet',
  exams: 'Result checkers, scratch cards and certificates',
  jamb: 'Results, admission letters and profile services',
};
const naira = (n: number) => '₦' + Math.round(n).toLocaleString('en-NG');

export default async function ServicesHub() {
  const supabase = await createClient();
  const { data: services } = await supabase.from('services').select('slug,title,category,price,price_type').eq('active', true).order('sort_order');
  const rows = services ?? [];
  const rules = await getMarkupRules(createAdminClient());
  const bySlug = new Map(rows.map(s => [s.slug, s]));

  const groups: HubGroup[] = buildServiceGroups(rows).map(g => ({
    id: g.id, label: g.label, icon: g.icon,
    blurb: BLURBS[g.id] || 'Tap a service to see details and request it',
    layout: g.id === 'buy' ? 'grid' : 'list',
    items: g.items.map(i => {
      const s = i.slug ? bySlug.get(i.slug) : undefined;
      const listPrice = i.slug ? JAMB_SERVICE_PRICES[i.slug] : undefined;
      let price = 'Request';
      if (g.id === 'buy') price = 'Instant';
      else if (listPrice != null) price = naira(listPrice + feeFor(rules.jamb, listPrice));
      else if (s?.price_type === 'fixed' && s.price != null) price = naira(Number(s.price));
      else if (g.id === 'exams') price = 'View';
      return { label: i.label, href: i.href, icon: getServicePresentation(i.slug || '', s?.category || '').icon, price };
    }),
  }));

  return (
    <div>
      <div className="mb-5">
        <p className="text-sm font-bold text-[#0757d5]">SERVICES</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">What do you need today?</h1>
      </div>
      <Link href="/dashboard/wallet" className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-[#f0f6ff] px-4 py-3 text-sm hover:border-[#0757d5]">
        <span><b className="text-[#0b1730]">Pay faster with your wallet.</b> <span className="text-slate-600">Fund once, pay for any service in one tap.</span></span>
        <span className="shrink-0 font-bold text-[#0757d5]">Open wallet →</span>
      </Link>
      {groups.length === 0
        ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Services are temporarily unavailable. Please contact us for assistance.</p>
        : <ServiceHub groups={groups} />}
    </div>
  );
}
