import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintButton from './PrintButton';

export const metadata = { title: 'Receipt' };
export const dynamic = 'force-dynamic';
const KIND: Record<string, string> = { funding: 'Wallet funding', order_payment: 'Order payment', refund: 'Refund', adjustment: 'Adjustment' };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: t } = await supabase.from('wallet_transactions').select('id,kind,direction,amount,balance_after,status,reference,description,created_at,orders(reference)').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!t || t.status !== 'success') notFound();
  const { data: p } = await supabase.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle();
  const credit = t.direction === 'credit';
  const rows: [string, string][] = [
    ['Receipt number', t.reference], ['Date', new Date(t.created_at).toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' })],
    ['Type', KIND[t.kind] || 'Transaction'], ['Details', t.description || '—'], ...(((t as any).orders?.reference) ? [['Order', (t as any).orders.reference] as [string, string]] : []),
    ['Account', (p?.full_name || user.email || '') as string], ['Status', 'Successful'],
    ...(t.balance_after != null ? [['Balance after', '₦' + Number(t.balance_after).toLocaleString('en-NG', { minimumFractionDigits: 2 })] as [string, string]] : []),
  ];
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8 print:shadow-none">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <Image src="/logo.png" alt="Promise Computer Research" width={44} height={44} className="h-11 w-11 rounded-lg object-contain" unoptimized />
          <div><p className="font-black leading-tight">Promise Computer Research</p><p className="text-xs text-slate-500">Transaction receipt</p></div>
        </div>
        <p className="mt-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">{credit ? 'Amount received' : 'Amount paid'}</p>
        <p className={'mt-1 text-center text-4xl font-black ' + (credit ? 'text-emerald-600' : 'text-slate-900')}>{credit ? '+' : '−'}₦{Number(t.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
        <dl className="mt-6 divide-y divide-slate-100 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="break-all text-right font-semibold">{v}</dd></div>)}</dl>
        <p className="mt-6 text-center text-xs text-slate-400">Thank you for using Promise Computer Research.</p>
      </div>
      <div className="mt-4 flex items-center justify-between print:hidden"><Link href="/dashboard/wallet#history" className="text-sm font-bold text-[#0757d5]">← Back to wallet</Link><PrintButton /></div>
    </div>
  );
}
