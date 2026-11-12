'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, Eye, EyeOff, Plus } from 'lucide-react';

// WoodPay-style balance card: dark glass, glow, show/hide eye, "Fund wallet" strip.
export default function BalanceCard({ balance }: { balance: number }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem('pcr_bal_hidden') === '1'); } catch { /* ignore */ } }, []);
  const toggle = () => setHidden(h => { const n = !h; try { localStorage.setItem('pcr_bal_hidden', n ? '1' : '0'); } catch { /* ignore */ } return n; });
  const [whole, kobo] = balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.');
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a2470] via-[#171b4a] to-[#0d1030] p-6 text-white shadow-xl">
      <span className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,.32),transparent_70%)]" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#B9C0E8]">Wallet balance</p>
        <button onClick={toggle} aria-label={hidden ? 'Show balance' : 'Hide balance'} className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 text-[#dfe4ff]">{hidden ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      <p className="relative mt-2 flex items-baseline gap-1 font-mono text-4xl font-semibold sm:text-5xl">
        <small className="text-xl font-medium opacity-60">₦</small>{hidden ? '••••••' : <>{whole}<small className="text-xl font-medium opacity-60">.{kobo}</small></>}
      </p>
      <Link href="#fund" className="relative mt-5 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-4 py-3.5 text-sm font-bold backdrop-blur hover:bg-white/15">
        <span className="flex items-center gap-2"><Plus size={18} strokeWidth={2.5} /> Fund wallet</span><ChevronRight size={18} className="opacity-70" />
      </Link>
    </section>
  );
}
