'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import PinModal from '@/components/wallet/PinModal';

export default function PinSettings() {
  const [has, setHas] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const load = () => fetch('/api/wallet/pin', { cache: 'no-store' }).then(r => r.json()).then(d => setHas(!!d.hasPin)).catch(() => {});
  useEffect(() => { load(); }, []);
  return (
    <section className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><ShieldCheck size={22} /></span>
      <div className="min-w-0 flex-1"><h2 className="font-black">Payment PIN</h2><p className="text-xs text-slate-500">{has ? 'Required every time you pay from your wallet.' : 'Set a 4-digit PIN to protect your wallet payments.'}</p></div>
      <button onClick={() => setOpen(true)} className="shrink-0 rounded-xl bg-[#0757d5] px-4 py-2.5 text-sm font-bold text-white">{has ? 'Change PIN' : 'Set PIN'}</button>
      <PinModal open={open} mode="manage" title={has ? 'Change your payment PIN' : 'Create your payment PIN'} onClose={() => setOpen(false)} onSaved={load} />
    </section>
  );
}
