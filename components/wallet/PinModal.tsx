'use client';

import { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';

type Props = {
  open: boolean;
  mode: 'pay' | 'manage';          // pay: ask for the PIN (or create one first); manage: create / change the PIN
  title?: string;
  onClose: () => void;
  onPin?: (pin: string) => Promise<string | null>; // pay mode: return an error message, or null when payment succeeded
  onSaved?: () => void;
};

export default function PinModal({ open, mode, title, onClose, onPin, onSaved }: Props) {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState(''); const [confirm, setConfirm] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPin(''); setConfirm(''); setPassword(''); setError(''); setHasPin(null);
    fetch('/api/wallet/pin', { cache: 'no-store' }).then(r => r.json()).then(d => setHasPin(!!d.hasPin)).catch(() => setHasPin(true));
  }, [open]);
  if (!open) return null;

  const creating = mode === 'manage' || hasPin === false;
  const input = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[.5em] outline-none focus:border-[#0757d5]';

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setError('');
    if (!/^\d{4}$/.test(pin)) { setError('Enter 4 digits.'); return; }
    setBusy(true);
    try {
      if (creating) {
        if (pin !== confirm) throw new Error('The two PINs do not match.');
        const r = await fetch('/api/wallet/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, password }) });
        const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Could not save the PIN.');
        if (mode === 'manage') { onSaved?.(); onClose(); return; }
        setHasPin(true); setConfirm(''); setPassword(''); setError('PIN saved. Enter it again to pay.');
      } else {
        const msg = await onPin!(pin);
        if (msg) { setError(msg); setPin(''); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.'); }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-[#0757d5]"><Lock size={20} /></span><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button></div>
        <h3 className="mt-3 text-lg font-black">{title || (creating ? 'Create your payment PIN' : 'Enter your payment PIN')}</h3>
        <p className="mt-1 text-sm text-slate-500">{hasPin === null ? 'One moment…' : creating ? 'Choose a 4-digit PIN. You will enter it every time you pay from your wallet.' : 'Confirm this payment with your 4-digit PIN.'}</p>
        {hasPin !== null && <div className="mt-4 space-y-3">
          <input autoFocus type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" aria-label="PIN" className={input} />
          {creating && <>
            <input type="password" inputMode="numeric" maxLength={4} value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} placeholder="Repeat PIN" aria-label="Repeat PIN" className={input} />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your account password" autoComplete="current-password" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0757d5]" />
          </>}
          {error && <p className={'text-sm ' + (error.startsWith('PIN saved') ? 'text-emerald-600' : 'text-red-600')}>{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#0757d5] py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : creating ? (mode === 'manage' ? 'Save PIN' : 'Save PIN and continue') : 'Confirm and pay'}</button>
        </div>}
      </form>
    </div>
  );
}
