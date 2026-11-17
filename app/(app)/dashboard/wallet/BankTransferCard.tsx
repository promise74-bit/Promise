'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Landmark } from 'lucide-react';

type Account = { bank_name: string; account_number: string; account_name: string } | null;
type Temp = { accountNumber: string; bankName: string; accountName: string; amount: number; reference: string; expiresAt: string };
const CHIPS = [500, 1000, 2000, 5000, 10000];

function useCopy() { const [done, setDone] = useState(''); return { done, copy: (t: string) => navigator.clipboard?.writeText(t).then(() => { setDone(t); setTimeout(() => setDone(''), 1800); }).catch(() => {}) }; }

// In-app funding like WoodPay: a bank-card-style account the customer can transfer to. Works with or without a NIN.
export default function BankTransferCard({ account, balance, min, max, embedded = false }: { account: Account; balance: number; min: number; max: number; embedded?: boolean }) {
  const router = useRouter(); const { done, copy } = useCopy();
  const [tab, setTab] = useState<'once' | 'permanent'>('once');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [needPhone, setNeedPhone] = useState(false); const lastCode = useRef('');
  const [amount, setAmount] = useState(''); const [temp, setTemp] = useState<Temp | null>(null);
    const startBalance = useRef(balance); const [credited, setCredited] = useState(false);

  // While a one-time account is open, check for the payment every 10 seconds.
  useEffect(() => { if (!temp || credited) return; const id = setInterval(() => router.refresh(), 10000); return () => clearInterval(id); }, [temp, credited, router]);
  useEffect(() => { if (temp && balance >= startBalance.current + temp.amount - 0.001) setCredited(true); }, [balance, temp]);

  async function post(url: string, body: object) {
    setBusy(true); setError(''); setNeedPhone(false); lastCode.current = '';
    try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) { lastCode.current = d.code || ''; setNeedPhone(d.code === 'PHONE_REQUIRED'); throw new Error(d.error || 'Something went wrong.'); } return d; }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); return null; } finally { setBusy(false); }
  }
  async function makeTemp(e: React.FormEvent) { e.preventDefault(); const n = Number(amount); if (!Number.isInteger(n) || n < min || n > max) { setError(`Enter a whole amount from ₦${min.toLocaleString()} to ₦${max.toLocaleString()}.`); return; } startBalance.current = balance; setCredited(false); const d = await post('/api/wallet/temp-account', { amount: n }); if (d) setTemp(d); }
  async function makePermanent() { const d = await post('/api/wallet/account', {}); if (d) { router.refresh(); return; } if (lastCode.current === 'DVA_UNAVAILABLE') setTab('once'); }

  const bankCard = (bank: string, number: string, name: string, note: string, extra?: React.ReactNode) => (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a2470] via-[#171b4a] to-[#0d1030] p-5 text-white shadow-lg">
        <span className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.3),transparent_70%)]" />
        <p className="relative text-[11px] font-bold uppercase tracking-[.2em] text-[#B9C0E8]">{bank}</p>
        <div className="relative mt-2 flex items-center justify-between gap-3">
          <p className="font-mono text-3xl font-semibold tracking-wider">{number}</p>
          <button onClick={() => copy(number)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold">{done === number ? <Check size={14} /> : <Copy size={14} />}{done === number ? 'Copied' : 'Copy'}</button>
        </div>
        <p className="relative mt-3 text-sm font-semibold text-[#dfe4ff]">{name}</p>
        {extra}
      </div>
      <p className="mt-3 text-xs text-slate-500">{note}</p>
    </div>);

  const inp = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0757d5]';
  return (
    <section id={embedded ? undefined : 'transfer'} className={embedded ? '' : 'rounded-3xl bg-white p-6 shadow-sm'}>
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Landmark size={20} /></span><div><h2 className="text-lg font-black">Fund wallet by bank transfer</h2><p className="text-xs text-slate-500">Pay from any bank app. Credited automatically.</p></div></div>

      <div className="mt-4">
        {account ? bankCard(account.bank_name, account.account_number, account.account_name, 'This is your own permanent account number. Send any amount to it from any bank app and your wallet is credited automatically, usually within a minute.')
        : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button onClick={() => { setTab('once'); setError(''); }} className={'rounded-lg py-2.5 ' + (tab === 'once' ? 'bg-white shadow' : 'text-slate-500')}>Without NIN</button>
              <button onClick={() => { setTab('permanent'); setError(''); setTemp(null); }} className={'rounded-lg py-2.5 ' + (tab === 'permanent' ? 'bg-white shadow' : 'text-slate-500')}>My permanent account</button>
            </div>

            {tab === 'once' && (temp ? (credited
              ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center"><p className="font-black text-emerald-800">₦{temp.amount.toLocaleString()} received 🎉</p><p className="mt-1 text-sm text-emerald-700">Your wallet has been credited.</p><button onClick={() => { setTemp(null); setAmount(''); }} className="mt-3 text-sm font-bold text-emerald-700 underline">Fund again</button></div>
              : <div className="mt-4">{bankCard(temp.bankName, temp.accountNumber, temp.accountName, `Transfer exactly ₦${temp.amount.toLocaleString()} to this account${temp.expiresAt ? ' before it expires' : ''}. This page checks for your payment automatically. A different amount will not be credited.`,
                  <p className="relative mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Pay exactly ₦{temp.amount.toLocaleString()}</p>)}
                  <button onClick={() => setTemp(null)} className="mt-3 text-xs font-bold text-slate-500 underline">Use a different amount</button></div>)
              : <form onSubmit={makeTemp} className="mt-4 space-y-3">
                  <p className="text-sm text-slate-600">Choose an amount and we create a one-time account for it. No extra details needed.</p>
                  <input type="number" inputMode="numeric" min={min} max={max} value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (₦)" className={inp} required />
                  <div className="flex flex-wrap gap-2">{CHIPS.filter(c => c >= min && c <= max).map(c => <button type="button" key={c} onClick={() => setAmount(String(c))} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold hover:border-[#0757d5]">₦{c.toLocaleString()}</button>)}</div>
                  <button disabled={busy} className="w-full rounded-xl bg-[#0757d5] py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Creating account…' : 'Generate account'}</button>
                </form>)}

            {tab === 'permanent' && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">Get your own account number that never expires. Send any amount to it, any time, and your wallet is credited automatically.</p>
                <button onClick={makePermanent} disabled={busy} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Creating account…' : 'Create my permanent account'}</button>
              </div>)}
          </>)}
        {error && <p className="mt-3 text-sm text-red-600">{error} {needPhone && <Link href="/dashboard/profile" className="font-bold underline">Open profile</Link>}</p>}
      </div>
    </section>
  );
}
