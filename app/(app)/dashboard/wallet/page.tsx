import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, RotateCcw, CreditCard, Smartphone, Tv, Wifi, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { MAX_FUNDING, MIN_FUNDING } from '@/lib/wallet';
import { getWalletAccount } from '@/lib/wallet-transfer';
import FundWalletForm from './FundWalletForm';
import BankTransferCard from './BankTransferCard';
import PinSettings from './PinSettings';
import BalanceCard from './BalanceCard';

export const metadata = { title: 'Wallet' };
export const dynamic = 'force-dynamic';

const PAGE = 15;
const KIND_LABEL: Record<string, string> = { funding: 'Funding', order_payment: 'Payment', refund: 'Refund', adjustment: 'Adjustment' };
const naira = (n: number, d = 2) => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: d, maximumFractionDigits: d });
type SP = Record<string, string | undefined>;

export default async function WalletPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const type = ['funding', 'payments', 'refunds'].includes(sp.type || '') ? sp.type! : '';
  const status = ['success', 'pending', 'failed'].includes(sp.status || '') ? sp.status! : '';
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from || '') ? sp.from! : '';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to || '') ? sp.to! : '';
  const page = Math.max(1, Number.parseInt(sp.page || '1', 10) || 1);

  let q = supabase.from('wallet_transactions').select('id,kind,direction,amount,balance_after,status,reference,description,created_at,orders(reference)', { count: 'exact' }).eq('user_id', user.id);
  if (type) q = q.eq('kind', type === 'payments' ? 'order_payment' : type === 'refunds' ? 'refund' : 'funding');
  if (status) q = q.eq('status', status); else q = q.neq('status', 'failed');
  if (from) q = q.gte('created_at', from + 'T00:00:00');
  if (to) q = q.lte('created_at', to + 'T23:59:59');
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [{ data: wallet, error: walletError }, { data: txData, count }, { data: monthRows }, account] = await Promise.all([
    supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle(),
    q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1),
    supabase.from('wallet_transactions').select('kind,amount').eq('user_id', user.id).eq('status', 'success').gte('created_at', monthStart.toISOString()),
    getWalletAccount(user.id),
  ]);
  const txns = txData ?? [];
  const balance = Number(wallet?.balance || 0);
  const sum = (k: string) => (monthRows ?? []).filter((r: any) => r.kind === k).reduce((a: number, r: any) => a + Number(r.amount), 0);
  const pages = Math.max(1, Math.ceil((count || 0) / PAGE));
  const qs = (over: Record<string, string>) => { const p = new URLSearchParams(); const all: SP = { type, status, from, to, ...over }; Object.entries(all).forEach(([k, v]) => { if (v) p.set(k, v); }); const s = p.toString(); return '/dashboard/wallet' + (s ? '?' + s : '') + '#history'; };

  return (
    <div className="space-y-6">
      <div><p className="text-sm font-bold text-[#0757d5]">MY WALLET</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Wallet</h1></div>
      {walletError && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">The wallet is not available yet. Please try again shortly.</div>}

      <BalanceCard balance={balance} />

      <div className="grid grid-cols-4 gap-3">
        {[['Data', '/services/data-subscription/request', Wifi, 'bg-violet-100 text-violet-600'], ['Airtime', '/services/airtime-recharge/request', Smartphone, 'bg-blue-100 text-blue-600'], ['TV', '/services/dstv-subscription/request', Tv, 'bg-cyan-100 text-cyan-600'], ['Power', '/services/electricity-bill/request', Zap, 'bg-amber-100 text-amber-600']].map(([label, href, Icon, tone]: any) => (
          <Link key={label} href={href} className="flex flex-col items-center gap-2 rounded-2xl bg-white py-4 shadow-sm transition hover:shadow-md"><span className={'grid h-11 w-11 place-items-center rounded-xl ' + tone}><Icon size={20} /></span><span className="text-xs font-bold text-slate-700">{label}</span></Link>))}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[['Funded this month', sum('funding'), 'text-emerald-600'], ['Spent this month', sum('order_payment'), 'text-slate-800'], ['Refunded', sum('refund'), 'text-blue-600']].map(([l, v, c]) => (
          <div key={String(l)} className="rounded-2xl bg-white p-3 shadow-sm"><p className={'text-base font-black sm:text-xl ' + c}>{naira(Number(v), 0)}</p><p className="mt-0.5 text-[11px] font-semibold text-slate-500">{l}</p></div>))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section id="fund" className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-[#0757d5]"><CreditCard size={20} /></span><h2 className="text-lg font-black">Fund with card</h2></div>
          <FundWalletForm min={MIN_FUNDING} max={MAX_FUNDING} />
        </section>
        <BankTransferCard account={account} />
      </div>

      <PinSettings />

      <section id="history" className="scroll-mt-20 rounded-3xl bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-xl font-black">Transactions</h2>
        <form method="get" action="/dashboard/wallet" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select name="type" defaultValue={type} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">All types</option><option value="funding">Funding</option><option value="payments">Payments</option><option value="refunds">Refunds</option></select>
          <select name="status" defaultValue={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Any status</option><option value="success">Successful</option><option value="pending">Pending</option><option value="failed">Failed</option></select>
          <input type="date" name="from" defaultValue={from} aria-label="From date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input type="date" name="to" defaultValue={to} aria-label="To date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <div className="col-span-2 flex gap-2 sm:col-span-1"><button className="flex-1 rounded-xl bg-[#0757d5] px-3 py-2 text-sm font-bold text-white">Filter</button><Link href="/dashboard/wallet#history" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Reset</Link></div>
        </form>

        {txns.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No transactions match.</div> : (
          <ul className="mt-4 divide-y divide-slate-100">
            {txns.map((t: any) => {
              const credit = t.direction === 'credit'; const pending = t.status === 'pending'; const failed = t.status === 'failed';
              const Icon = t.kind === 'refund' ? RotateCcw : credit ? ArrowDownLeft : ArrowUpRight;
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-full ' + (credit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600')}><Icon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{t.description || KIND_LABEL[t.kind] || 'Transaction'}{t.orders?.reference ? ` · ${t.orders.reference}` : ''}</p>
                    <p className="text-xs text-slate-500">{new Date(t.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · <span className={failed ? 'text-red-600' : pending ? 'text-amber-600' : 'text-emerald-600'}>{t.status}</span></p>
                  </div>
                  <div className="text-right">
                    <p className={'text-sm font-black ' + (failed ? 'text-slate-300 line-through' : pending ? 'text-slate-400' : credit ? 'text-emerald-600' : 'text-slate-800')}>{credit ? '+' : '−'}{naira(Number(t.amount), 0)}</p>
                    {t.status === 'success' && <Link href={`/dashboard/wallet/receipt/${t.id}`} className="text-xs font-bold text-[#0757d5] hover:underline">Receipt</Link>}
                  </div>
                </li>);
            })}
          </ul>)}

        {pages > 1 && <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="rounded-xl border border-slate-200 px-4 py-2 font-bold">← Newer</Link> : <span />}
          <span className="text-slate-500">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} className="rounded-xl border border-slate-200 px-4 py-2 font-bold">Older →</Link> : <span />}
        </div>}
      </section>
    </div>
  );
}
