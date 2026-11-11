'use client';
import { useState } from 'react';

export default function NotifyForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(audience: 'test' | 'one' | 'all') {
    if (audience === 'all' && !window.confirm('Send this notification to ALL customers? This cannot be undone.')) return;
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/admin/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, message, audience, email }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setResult({ ok: true, text: audience === 'test' ? 'Test notification sent to you.' : `Sent to ${d.sent} customer${d.sent === 1 ? '' : 's'}.` });
      else setResult({ ok: false, text: d.error || 'Could not send.' });
    } catch { setResult({ ok: false, text: 'Network error. Please try again.' }); }
    setBusy(false);
  }

  const input = 'mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0757d5]';
  const ready = title.trim() && message.trim();
  return (
    <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} className={input} placeholder="e.g. Your JAMB slip is ready" /></label>
      <label className="block text-sm font-bold">Message<textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} maxLength={500} className={input} placeholder="Short message (max 500 characters)" /></label>
      <label className="block text-sm font-bold">Customer email (for “Send to one customer”)<input type="email" value={email} onChange={e => setEmail(e.target.value)} className={input} placeholder="customer@example.com" /></label>
      {result && <div className={`rounded-xl border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{result.text}</div>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !ready} onClick={() => send('test')} className="rounded-xl border border-[#0757d5] px-5 py-3 font-bold text-[#0757d5] disabled:opacity-50">Send test to me</button>
        <button disabled={busy || !ready || !email.trim()} onClick={() => send('one')} className="rounded-xl border border-[#0757d5] px-5 py-3 font-bold text-[#0757d5] disabled:opacity-50">Send to one customer</button>
        <button disabled={busy || !ready} onClick={() => send('all')} className="rounded-xl bg-[#0757d5] px-5 py-3 font-bold text-white hover:bg-[#063b93] disabled:opacity-50">Send to all customers</button>
      </div>
    </div>
  );
}
