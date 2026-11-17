import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Bell, Building2, ChevronRight, FileText, GraduationCap, LayoutGrid, RotateCcw, Smartphone, Tv, Wifi, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { FundWalletButton } from '@/components/wallet/FundSheet';
import BalanceCard from './wallet/BalanceCard';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const naira = (n: number) => '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 });
const when = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
const STATUS: Record<string, string> = { completed: 'bg-emerald-50 text-emerald-700', processing: 'bg-blue-50 text-blue-700', pending: 'bg-amber-50 text-amber-700', needs_information: 'bg-amber-50 text-amber-700', cancelled: 'bg-slate-100 text-slate-500', draft: 'bg-slate-100 text-slate-500' };
const TILES: [string, string, any, string][] = [
  ['Data', '/services/data-subscription/request', Wifi, 'bg-violet-100 text-violet-600'], ['Airtime', '/services/airtime-recharge/request', Smartphone, 'bg-blue-100 text-blue-600'],
  ['TV', '/services/dstv-subscription/request', Tv, 'bg-cyan-100 text-cyan-600'], ['Electricity', '/services/electricity-bill/request', Zap, 'bg-amber-100 text-amber-600'],
  ['Exam PINs', '/services/exam-pins/request', GraduationCap, 'bg-emerald-100 text-emerald-600'], ['JAMB', '/services', FileText, 'bg-rose-100 text-rose-600'],
  ['Internet', '/services/internet-subscription/request', Building2, 'bg-indigo-100 text-indigo-600'], ['All services', '/services', LayoutGrid, 'bg-slate-100 text-slate-600'],
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: orders }, { data: wallet }, { data: txns }, { data: notes }] = await Promise.all([
    supabase.from('profiles').select('full_name,role').eq('id', user.id).maybeSingle(),
    supabase.from('orders').select('id,reference,status,amount,created_at,services(title)').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('wallet_transactions').select('id,kind,direction,amount,description,created_at').eq('user_id', user.id).eq('status', 'success').order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('id,title,message,read,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
  ]);
  const first = (profile?.full_name || '').trim().split(/\s+/)[0];
  const unread = (notes ?? []).filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-slate-500">Welcome back</p><h1 className="text-2xl font-black sm:text-3xl">{first ? `Hi, ${first} 👋` : 'Hi there 👋'}</h1></div>
        {profile?.role === 'admin' && <Link href="/admin" className="rounded-xl bg-[#071a3a] px-4 py-2.5 text-sm font-bold text-white shadow-sm">Open Admin →</Link>}
      </div>

      <BalanceCard balance={Number(wallet?.balance || 0)} fundHref="/dashboard/wallet#transfer" />

      <section>
        <h2 className="mb-3 text-lg font-black">What do you need?</h2>
        <div className="grid grid-cols-4 gap-3">
          {TILES.map(([label, href, Icon, tone]) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-2 rounded-2xl bg-white px-1 py-4 text-center shadow-sm transition hover:shadow-md">
              <span className={'grid h-11 w-11 place-items-center rounded-xl ' + tone}><Icon size={20} /></span><span className="text-[11px] font-bold leading-tight text-slate-700 sm:text-xs">{label}</span>
            </Link>))}
        </div>
      </section>

      {unread > 0 && (
        <Link href="/dashboard/notifications" className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#f0f6ff] px-4 py-3 hover:border-[#0757d5]">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0757d5] text-white"><Bell size={17} /></span>
          <span className="flex-1 text-sm"><b>{unread} new notification{unread === 1 ? '' : 's'}</b><span className="block truncate text-slate-600">{(notes ?? []).find(n => !n.read)?.title}</span></span><ChevronRight size={18} className="text-slate-400" />
        </Link>)}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Recent orders</h2><Link href="/dashboard/orders" className="text-sm font-bold text-[#0757d5]">View all</Link></div>
          {(orders ?? []).length === 0
            ? <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center"><p className="font-bold">No orders yet</p><Link href="/services" className="mt-3 inline-flex rounded-xl bg-[#0757d5] px-4 py-2.5 text-sm font-bold text-white">Browse services</Link></div>
            : <ul className="mt-3 divide-y divide-slate-100">{(orders ?? []).map((o: any) => (
                <li key={o.id}><Link href={`/dashboard/orders/${o.id}`} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{(Array.isArray(o.services) ? o.services[0] : o.services)?.title || 'Order'}</p><p className="text-xs text-slate-500">{o.reference} · {when(o.created_at)}</p></div>
                  <div className="text-right"><p className="text-sm font-black">{naira(o.amount)}</p><span className={'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ' + (STATUS[o.status] || STATUS.draft)}>{String(o.status).replace('_', ' ')}</span></div>
                </Link></li>))}</ul>}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Wallet activity</h2><Link href="/dashboard/wallet#history" className="text-sm font-bold text-[#0757d5]">View all</Link></div>
          {(txns ?? []).length === 0
            ? <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center"><p className="font-bold">No activity yet</p><FundWalletButton className="mt-3 inline-flex rounded-xl bg-[#0757d5] px-4 py-2.5 text-sm font-bold text-white">Fund your wallet</FundWalletButton></div>
            : <ul className="mt-3 divide-y divide-slate-100">{(txns ?? []).map((t: any) => {
                const credit = t.direction === 'credit'; const Icon = t.kind === 'refund' ? RotateCcw : credit ? ArrowDownLeft : ArrowUpRight;
                return <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-full ' + (credit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600')}><Icon size={16} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{t.description || 'Transaction'}</p><p className="text-xs text-slate-500">{when(t.created_at)}</p></div>
                  <p className={'text-sm font-black ' + (credit ? 'text-emerald-600' : 'text-slate-800')}>{credit ? '+' : '−'}{naira(t.amount)}</p></li>; })}</ul>}
        </section>
      </div>
    </div>
  );
}
