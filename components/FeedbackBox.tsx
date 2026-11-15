'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

// Google-style front: one big rounded box. Tap it and it opens up so visitors can say where we should improve.
export default function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(''); const [contact, setContact] = useState(''); const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle'); const [error, setError] = useState('');

  async function send(e: React.FormEvent) {
    e.preventDefault(); if (state === 'sending') return;
    setState('sending'); setError('');
    const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, contact, website }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (r?.ok) { setState('done'); setMessage(''); setContact(''); }
    else { setState('idle'); setError(d?.error || 'Could not send. Please try again.'); }
  }

  if (state === 'done') return (
    <div className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50 px-6 py-5 text-center">
      <p className="font-black text-emerald-800">Thank you! 🙏</p><p className="mt-1 text-sm text-emerald-700">Your idea has reached our team.</p>
      <button onClick={() => { setState('idle'); setOpen(false); }} className="mt-3 text-sm font-bold text-emerald-700 underline">Send another</button>
    </div>);

  return (
    <form onSubmit={send} className="mt-8">
      <div className={'rounded-[28px] border bg-white shadow-md transition ' + (open ? 'border-[#0757d5] shadow-lg' : 'border-slate-200 hover:shadow-lg')}>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 px-5 py-4 text-left text-slate-500">
            <span className="text-lg">💡</span><span className="flex-1">Tell us where to improve…</span>
          </button>
        ) : (
          <div className="p-4">
            <textarea autoFocus value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={4} required placeholder="Tell us where to improve…" aria-label="Tell us where to improve" className="w-full resize-none rounded-2xl bg-transparent px-2 py-1 text-base outline-none" />
            <input value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-3">
              <input value={contact} onChange={e => setContact(e.target.value)} maxLength={120} placeholder="Phone or email (optional)" className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-sm outline-none" />
              <button disabled={state === 'sending' || message.trim().length < 3} className="inline-flex items-center gap-2 rounded-full bg-[#0757d5] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Send size={15} />{state === 'sending' ? 'Sending…' : 'Send'}</button>
            </div>
          </div>)}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-center text-xs text-slate-400">No account needed. Your message goes straight to our team.</p>
    </form>
  );
}
