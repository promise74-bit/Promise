'use client';

import { useEffect, useState } from 'react';
import { KeyRound, X } from 'lucide-react';

type Props = { open: boolean; onClose: () => void; onDone?: () => void };
const box = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-xl tracking-[.4em] outline-none focus:border-[#0757d5]';

export default function PinResetModal({ open, onClose, onDone }: Props) {
  const [step, setStep] = useState<'send' | 'confirm' | 'done'>('send');
  const [ticket, setTicket] = useState(''); const [hint, setHint] = useState('');
  const [code, setCode] = useState(''); const [pin, setPin] = useState(''); const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');

  useEffect(() => { if (open) { setStep('send'); setTicket(''); setCode(''); setPin(''); setAgain(''); setError(''); } }, [open]);
  if (!open) return null;

  async function call(payload: object) {
    const r = await fetch('/api/wallet/pin/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Something went wrong.'); return d;
  }
  async function send() {
    if (busy) return; setBusy(true); setError('');
    try { const d = await call({ action: 'send' }); setTicket(d.ticket); setHint(d.email || 'your email'); setStep('confirm'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    setBusy(false);
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setError('');
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');
    if (!/^\d{4}$/.test(pin)) return setError('The new PIN must be 4 digits.');
    if (pin !== again) return setError('The two PINs do not match.');
    setBusy(true);
    try { await call({ action: 'confirm', ticket, code, pin }); setStep('done'); onDone?.(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-full bg-amber-50 text-amber-600"><KeyRound size={20} /></span><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button></div>
        <h3 className="mt-3 text-lg font-black">Reset payment PIN</h3>
        {step === 'send' && <>
          <p className="mt-1 text-sm text-slate-500">We will email a 6-digit code to the address on your account. Enter it here to choose a new PIN.</p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button onClick={send} disabled={busy} className="mt-4 w-full rounded-xl bg-[#0757d5] py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Sending…' : 'Email me a code'}</button>
        </>}
        {step === 'confirm' && <form onSubmit={confirm} className="mt-1 space-y-3">
          <p className="text-sm text-slate-500">Code sent to <b>{hint}</b>. It expires in 10 minutes.</p>
          <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" aria-label="Code" className={box} />
          <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="New PIN" aria-label="New PIN" className={box} />
          <input type="password" inputMode="numeric" maxLength={4} value={again} onChange={e => setAgain(e.target.value.replace(/\D/g, ''))} placeholder="Repeat new PIN" aria-label="Repeat new PIN" className={box} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#0757d5] py-3 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Please wait…' : 'Save new PIN'}</button>
          <button type="button" onClick={send} disabled={busy} className="w-full text-sm font-semibold text-slate-500 hover:text-[#0757d5]">Resend code</button>
        </form>}
        {step === 'done' && <>
          <p className="mt-2 text-sm text-emerald-600">Your PIN has been reset. Use the new PIN for your next payment.</p>
          <button onClick={onClose} className="mt-4 w-full rounded-xl bg-[#0757d5] py-3 text-sm font-bold text-white">Done</button>
        </>}
      </div>
    </div>
  );
}
