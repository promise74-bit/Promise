'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Item = { id: string; message: string; contact: string | null; read: boolean; created_at: string };

export default function FeedbackRow({ item }: { item: Item }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function call(method: 'PATCH' | 'DELETE', body: object) {
    setBusy(true);
    await fetch('/api/admin/feedback', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false); router.refresh();
  }
  return (
    <li className={'rounded-2xl border p-4 ' + (item.read ? 'border-slate-100 bg-white' : 'border-blue-200 bg-blue-50/50')}>
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-800">{item.message}</p>
        {!item.read && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0757d5]" aria-label="Unread" />}
      </div>
      <p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}{item.contact ? ' · ' + item.contact : ''}</p>
      <div className="mt-3 flex gap-2">
        <button disabled={busy} onClick={() => call('PATCH', { id: item.id, read: !item.read })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold">{item.read ? 'Mark unread' : 'Mark read'}</button>
        <button disabled={busy} onClick={() => confirm('Delete this message?') && call('DELETE', { id: item.id })} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">Delete</button>
      </div>
    </li>
  );
}
