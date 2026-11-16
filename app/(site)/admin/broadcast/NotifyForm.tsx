'use client';
import { useState } from 'react';
import ScheduledList from './ScheduledList';

export default function NotifyForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(audience: 'test' | 'one' | 'all') {
    const later = when === 'later' && audience !== 'test';
    if (later && !at) { setResult({ ok: false, text: 'Pick the date and time to send.' }); return; }
    if (!later && audience === 'all' && !window.confirm('Send this notification to ALL customers now? This cannot be undone.')) return;
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/admin/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message, audience, email, ...(later ? { sendAt: new Date(at).toISOString() } : {}) }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setResult({ ok: true, text: d.scheduled ? `Scheduled for ${new Date(d.sendAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}.` : audience === 'test' ? 'Test notification sent to you.' : `Sent to ${d.sent} customer${d.sent === 1 ? '' : 's'}.` });
        if (d.scheduled) setRefresh(n => n + 1);
      } else setResult({ ok: false, text: d.error || 'Could not send.' });
    } catch { setResult({ ok: false, text: 'Network error. Please try again.' }); }
    setBusy(false);
  }

  const input = 'mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0757d5]';
  const ready = title.trim() && message.trim();
  const later = when === 'later';
  return (
    <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className={input} placeholder="e.g. Your JAMB slip is ready" /></label>
      <label className="block text-sm font-bold">Message<textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={500} className={input} placeholder="Short message (max 500 characters)" /></label>
      <label className="block text-sm font-bold">Customer email (for “one customer”)<input type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="customer@example.com" /></label>
      <div>
        <p className="text-sm font-bold">When</p>
        <div className="mt-2 grid max-w-xs grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          <button type="button" onClick={() => setWhen('now')} className={'rounded-lg py-2 ' + (!later ? 'bg-white shadow' : 'text-slate-500')}>Send now</button>
          <button type="button" onClick={() => setWhen('later')} className={'rounded-lg py-2 ' + (later ? 'bg-white shadow' : 'text-slate-500')}>Schedule</button>
        </div>
        {later && <input type="datetime-local" value={at} onChange={e => setAt(e.target.value)} className={input + ' max-w-xs'} aria-label="Send at" />}
        <p className="mt-2 text-xs text-slate-500">Customers get it in the app bell and as a push alert on devices where they turned alerts on.</p>
      </div>
      {result && <div className={`rounded-xl border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{result.text}</div>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !ready} onClick={() => send('test')} className="rounded-xl border border-[#0757d5] px-5 py-3 font-bold text-[#0757d5] disabled:opacity-50">Send test to me</button>
        <button disabled={busy || !ready || !email.trim()} onClick={() => send('one')} className="rounded-xl border border-[#0757d5] px-5 py-3 font-bold text-[#0757d5] disabled:opacity-50">{later ? 'Schedule for one customer' : 'Send to one customer'}</button>
        <button disabled={busy || !ready} onClick={() => send('all')} className="rounded-xl bg-[#0757d5] px-5 py-3 font-bold text-white hover:bg-[#063b93] disabled:opacity-50">{later ? 'Schedule for all customers' : 'Send to all customers'}</button>
      </div>
      <ScheduledList refreshKey={refresh} />
    </div>
  );
}
