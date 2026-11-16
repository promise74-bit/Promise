'use client';
import { useCallback, useEffect, useState } from 'react';

type Item = { id: string; title: string; audience: string; send_at: string; status: string; recipients: number | null };

export default function ScheduledList({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<Item[]>([]); const [note, setNote] = useState('');
  const load = useCallback(async () => { const d = await fetch('/api/admin/notify', { cache: 'no-store' }).then(r => r.json()).catch(() => ({})); setItems(d.items || []); setNote(d.error || ''); }, []);
  useEffect(() => { load(); }, [load, refreshKey]);
  async function cancel(id: string) { if (!confirm('Cancel this scheduled notification?')) return; await fetch('/api/admin/notify', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); load(); }
  if (!items.length && !note) return null;
  return (
    <div className="mt-2 border-t border-slate-100 pt-4">
      <p className="text-sm font-black">Scheduled</p>
      {note && <p className="mt-1 text-xs text-amber-700">{note}</p>}
      <ul className="mt-2 space-y-2">
        {items.map(i => (
          <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 text-sm">
            <div className="min-w-0"><p className="truncate font-bold">{i.title}</p><p className="text-xs text-slate-500">{i.audience === 'all' ? 'All customers' : 'One customer'} · {new Date(i.send_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}{i.status === 'sent' ? ` · sent to ${i.recipients ?? 0}` : ''}</p></div>
            {i.status === 'pending' ? <button onClick={() => cancel(i.id)} className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">Cancel</button>
              : <span className={'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ' + (i.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{i.status}</span>}
          </li>))}
      </ul>
    </div>
  );
}
