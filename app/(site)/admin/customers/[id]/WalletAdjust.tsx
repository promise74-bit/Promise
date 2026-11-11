'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function WalletAdjust({ userId, balance }: { userId: string; balance: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<'credit' | 'debit' | 'set'>('credit');
  const [amount, setAmount] = useState(''); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await fetch('/api/admin/wallet-adjust', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, mode, amount: Number(amount), reason }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMsg({ ok: true, text: d.unchanged ? 'Balance already matches.' : 'Saved. New balance: ₦' + Number(d.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 }) }); setAmount(''); setReason(''); router.refresh(); }
    else setMsg({ ok: false, text: d.error || 'Could not save.' });
    setBusy(false);
  }
  const box = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm';
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Wallet balance</p>
      <p className="mt-1 text-3xl font-black">₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
      <form onSubmit={save} className="mt-4 space-y-2">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
          {([['credit', 'Add money'], ['debit', 'Remove'], ['set', 'Set exact']] as const).map(([m, l]) => <button type="button" key={m} onClick={() => setMode(m)} className={'rounded-lg py-2 ' + (mode === m ? 'bg-white shadow' : 'text-slate-500')}>{l}</button>)}
        </div>
        <input type="number" min="0" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder={mode === 'set' ? 'New balance (₦)' : 'Amount (₦)'} className={box} />
        <input required minLength={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (recorded and shown to the customer)" className={box} />
        <button disabled={busy} className="w-full rounded-xl bg-[#0757d5] py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Update wallet'}</button>
        {msg && <p className={'text-sm ' + (msg.ok ? 'text-emerald-600' : 'text-red-600')}>{msg.text}</p>}
      </form>
    </div>
  );
}
