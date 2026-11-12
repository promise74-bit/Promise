'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import WalletAdjust from './[id]/WalletAdjust';

// Balance + "Edit wallet" button for the customers list. The editor opens in a pop-up so you never leave the list.
export default function WalletCell({ userId, name, balance }: { userId: string; name: string; balance: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-bold">₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
        <button onClick={() => setOpen(true)} className="rounded-lg bg-[#0757d5] px-2.5 py-1.5 text-xs font-bold text-white">Edit</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Edit wallet</p><h3 className="text-lg font-black">{name || 'Customer'}</h3></div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <WalletAdjust userId={userId} balance={balance} />
            <button onClick={() => setOpen(false)} className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold">Done</button>
          </div>
        </div>
      )}
    </>
  );
}
