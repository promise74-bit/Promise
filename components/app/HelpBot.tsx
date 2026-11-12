'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Headphones, MessageCircle, Send, X } from 'lucide-react';
import { answer, START_CHIPS, WHATSAPP, type BotLink } from '@/lib/help-bot';

type Msg = { from: 'bot' | 'user'; text: string; links?: BotLink[]; chips?: string[] };

export default function HelpBot({ name, defaultOpen = false }: { name?: string; defaultOpen?: boolean }) {
  const first = (name || '').trim().split(/\s+/)[0];
  const [open, setOpen] = useState(defaultOpen);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'bot', text: `Hi${first ? ' ' + first : ''}! I'm your Promise helper. Ask me anything about your wallet, orders or services.`, chips: START_CHIPS }]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, typing, open]);

  function send(raw: string) {
    const q = raw.trim(); if (!q || typing) return;
    setMsgs(m => [...m.map(x => ({ ...x, chips: undefined })), { from: 'user', text: q }]);
    setText(''); setTyping(true);
    setTimeout(() => { const r = answer(q); setMsgs(m => [...m, { from: 'bot', ...r }]); setTyping(false); }, 550);
  }

  return (
    <div className="print:hidden">
      {open && (
        <div className="fixed inset-x-2 bottom-24 z-50 flex h-[68vh] max-h-[560px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:right-6 sm:w-96 lg:bottom-24">
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#0757d5] to-[#0b1730] px-4 py-3 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20"><Headphones size={18} /></span>
            <div className="flex-1"><p className="text-sm font-black leading-tight">Help Centre</p><p className="text-[11px] text-blue-100">Instant answers, 24/7</p></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-lg p-1.5 hover:bg-white/15"><X size={18} /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex'}>
                <div className={'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ' + (m.from === 'user' ? 'rounded-br-md bg-[#0757d5] text-white' : 'rounded-bl-md bg-white text-slate-800 shadow-sm')}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.links && <div className="mt-2 flex flex-col gap-1.5">{m.links.map(l => l.external
                    ? <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{l.label} →</a>
                    : <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-[#0757d5]">{l.label} →</Link>)}</div>}
                  {m.chips && <div className="mt-2 flex flex-wrap gap-1.5">{m.chips.map(c => <button key={c} onClick={() => send(c)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0757d5]">{c}</button>)}</div>}
                </div>
              </div>))}
            {typing && <div className="flex"><div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm"><span className="inline-flex gap-1"><i className="h-2 w-2 animate-bounce rounded-full bg-slate-300" /><i className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:.15s]" /><i className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:.3s]" /></span></div></div>}
            <div ref={end} />
          </div>
          <form onSubmit={e => { e.preventDefault(); send(text); }} className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Type your question…" aria-label="Your question" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#0757d5]" />
            <button aria-label="Send" className="grid h-10 w-10 place-items-center rounded-xl bg-[#0757d5] text-white disabled:opacity-50" disabled={!text.trim() || typing}><Send size={17} /></button>
          </form>
          <a href={WHATSAPP} target="_blank" rel="noreferrer" className="border-t border-slate-100 bg-emerald-50 py-2 text-center text-xs font-bold text-emerald-700">Prefer a person? Chat on WhatsApp</a>
        </div>)}
      <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Close help chat' : 'Open help chat'} className="fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#0757d5] text-white shadow-xl ring-4 ring-white transition hover:scale-105 sm:right-6 lg:bottom-6">
        {open ? <X size={24} /> : <MessageCircle size={26} />}
      </button>
    </div>
  );
}
