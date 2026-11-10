'use client';

import { useState } from 'react';

export default function BroadcastForm() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(testOnly: boolean) {
    if (!testOnly && !window.confirm('Send this email to ALL customers? This cannot be undone.')) return;
    setBusy(true); setResult(null);
    try {
      const res = await fetch('/api/admin/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, message, buttonLabel, buttonUrl, testOnly }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) setResult({ ok: true, text: d.test ? 'Test email sent to your address.' : `Sent to ${d.sent} customer${d.sent === 1 ? '' : 's'}.` });
      else setResult({ ok: false, text: (d.sent ? `Sent ${d.sent} of ${d.total}. ` : '') + (d.error || 'Could not send.') });
    } catch { setResult({ ok: false, text: 'Network error. Please try again.' }); }
    setBusy(false);
  }

  const input = 'mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0757d5]';
  return (
    <div className="mt-5 space-y-4">
      <label className="block text-sm font-bold">Subject<input value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} className={input} placeholder="e.g. New service available" /></label>
      <label className="block text-sm font-bold">Message<textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} maxLength={5000} className={input} placeholder="Write your message. Leave a blank line between paragraphs. Each customer is greeted by first name." /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Button text (optional)<input value={buttonLabel} onChange={e => setButtonLabel(e.target.value)} maxLength={40} className={input} placeholder="Visit dashboard" /></label>
        <label className="block text-sm font-bold">Button link (optional)<input value={buttonUrl} onChange={e => setButtonUrl(e.target.value)} className={input} placeholder="https://..." /></label>
      </div>
      {result && <div className={`rounded-xl border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{result.text}</div>}
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !subject.trim() || !message.trim()} onClick={() => send(true)} className="rounded-xl border border-[#0757d5] px-5 py-3 font-bold text-[#0757d5] disabled:opacity-50">{busy ? 'Sending…' : 'Send test to me'}</button>
        <button disabled={busy || !subject.trim() || !message.trim()} onClick={() => send(false)} className="rounded-xl bg-[#0757d5] px-5 py-3 font-bold text-white hover:bg-[#063b93] disabled:opacity-50">Send to all customers</button>
      </div>
    </div>
  );
}
