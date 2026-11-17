'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import BankTransferCard from '@/app/(app)/dashboard/wallet/BankTransferCard';
import { MAX_FUNDING, MIN_FUNDING } from '@/lib/wallet-limits';

type Account = { bank_name: string; account_number: string; account_name: string } | null;
const Ctx = createContext<{ open: () => void }>({ open: () => {} });
export const useFundSheet = () => useContext(Ctx);

// A button that opens the slide-up funding sheet instead of navigating to the wallet page.
export function FundWalletButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = useFundSheet();
  return <button type="button" onClick={open} className={className}>{children}</button>;
}

export function FundSheetProvider({ balance, children }: { balance: number; children: React.ReactNode }) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false); // in the DOM
  const [shown, setShown] = useState(false);     // slid up (drives the animation)
  const [account, setAccount] = useState<Account | undefined>(undefined); // undefined = loading
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setAccount(undefined); setFailed(false);
    fetch('/api/wallet/account', { cache: 'no-store' }).then(r => r.json()).then(d => setAccount(d.account ?? null)).catch(() => { setFailed(true); setAccount(null); });
  }, []);
  const open = useCallback(() => { setMounted(true); load(); requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))); }, [load]);
  const close = useCallback(() => { setShown(false); setTimeout(() => setMounted(false), 320); }, []);

  useEffect(() => { if (mounted) close(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [path]);
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [mounted, close]);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {mounted && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Fund wallet">
          <div onClick={close} className={'absolute inset-0 bg-slate-900/60 transition-opacity duration-300 ' + (shown ? 'opacity-100' : 'opacity-0')} />
          <div className={'absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-3 shadow-2xl transition-transform duration-300 ease-out ' + (shown ? 'translate-y-0' : 'translate-y-full')}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" />
            <button onClick={close} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600"><X size={18} /></button>
            {account === undefined
              ? <div className="space-y-3 py-6"><div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" /><div className="h-32 animate-pulse rounded-2xl bg-slate-100" /><div className="h-12 animate-pulse rounded-xl bg-slate-100" /></div>
              : failed
                ? <div className="py-8 text-center text-sm text-slate-600">Could not load your account. <button onClick={load} className="font-bold text-[#0757d5] underline">Try again</button></div>
                : <BankTransferCard account={account} balance={balance} min={MIN_FUNDING} max={MAX_FUNDING} embedded />}
            <p className="mt-5 text-center text-xs text-slate-500">Prefer to pay by card? <Link href="/dashboard/wallet#fund" className="font-bold text-[#0757d5]">Fund with card</Link></p>
          </div>
        </div>)}
    </Ctx.Provider>
  );
}
