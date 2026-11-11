'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Copy, Landmark } from 'lucide-react';

type Account = { bank_name: string; account_number: string; account_name: string } | null;

export default function BankTransferCard({ account }: { account: Account }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needPhone, setNeedPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function create() {
    setLoading(true); setError(''); setNeedPhone(false);
    try {
      const r = await fetch('/api/wallet/account', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) { setNeedPhone(d.code === 'PHONE_REQUIRED'); throw new Error(d.error || 'Could not create your account number.'); }
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    setLoading(false);
  }
  function copy() { navigator.clipboard?.writeText(account!.account_number).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }).catch(() => {}); }

  return (
    <section id="transfer" className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Landmark size={20} /></span><h2 className="text-lg font-black">Fund by bank transfer</h2></div>
      {account ? (
        <div className="mt-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{account.bank_name}</p>
            <div className="mt-1 flex items-center justify-between gap-3"><p className="text-3xl font-black tracking-wider">{account.account_number}</p>
              <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:border-[#0757d5]"><Copy size={15} />{copied ? 'Copied' : 'Copy'}</button></div>
            <p className="mt-1 text-sm font-semibold text-slate-600">{account.account_name}</p>
          </div>
          <p className="mt-3 text-xs text-slate-500">Send any amount from any bank app. Your wallet is credited automatically, usually within a minute. This account number is yours alone.</p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-600">Get your own account number. Transfer from any bank app and your wallet is credited automatically, with no card needed.</p>
          <button onClick={create} disabled={loading} className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? 'Creating…' : 'Get my account number'}</button>
          {error && <p className="mt-3 text-sm text-red-600">{error} {needPhone && <Link href="/dashboard/profile" className="font-bold underline">Open profile</Link>}</p>}
        </div>
      )}
    </section>
  );
}
