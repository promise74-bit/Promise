'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bell, CheckCheck, ReceiptText, RotateCcw, Wallet } from 'lucide-react';
import PushToggle from '@/components/notifications/PushToggle';

export type NoteItem = { id: string; title: string; message: string; read: boolean; created_at: string };
type Filter = 'all' | 'unread' | 'wallet' | 'orders';

const category = (n: NoteItem): 'wallet' | 'orders' | 'other' => {
  if (/wallet|refund|funded|credited|debited/i.test(n.title)) return 'wallet';
  if (/order|deliver|payment|complet|process/i.test(n.title + ' ' + n.message)) return 'orders';
  return 'other';
};
const hrefFor = (n: NoteItem) => (category(n) === 'wallet' ? '/dashboard/wallet#history' : category(n) === 'orders' ? '/dashboard/orders' : null);

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}
function dayGroup(iso: string) {
  const d = new Date(iso), now = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(now) - start(d)) / 86400000);
  return diff <= 0 ? 'Today' : diff === 1 ? 'Yesterday' : 'Earlier';
}

export default function NotificationCenter({ initial }: { initial: NoteItem[] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);
  const unread = items.filter(n => !n.read).length;

  const shown = useMemo(() => items.filter(n => filter === 'all' ? true : filter === 'unread' ? !n.read : category(n) === filter), [items, filter]);
  const groups = useMemo(() => {
    const out: Record<string, NoteItem[]> = {};
    for (const n of shown) (out[dayGroup(n.created_at)] ||= []).push(n);
    return ['Today', 'Yesterday', 'Earlier'].filter(g => out[g]).map(g => ({ g, list: out[g] }));
  }, [shown]);

  async function markOne(id: string) {
    setItems(p => p.map(n => n.id === id ? { ...n, read: true } : n));
    fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {});
  }
  async function markAll() {
    setBusy(true);
    const r = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }).catch(() => null);
    if (r?.ok) setItems(p => p.map(n => ({ ...n, read: true })));
    setBusy(false);
  }

  const tabs: [Filter, string, number?][] = [['all', 'All'], ['unread', 'Unread', unread], ['wallet', 'Wallet'], ['orders', 'Orders']];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold text-[#0757d5]">ACCOUNT UPDATES</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">{unread ? `${unread} unread` : 'You are all caught up'}</p></div>
        {unread > 0 && <button onClick={markAll} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm disabled:opacity-50"><CheckCheck size={16} />{busy ? 'Marking…' : 'Mark all as read'}</button>}
      </div>

      <PushToggle />

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([f, label, count]) => (
          <button key={f} onClick={() => setFilter(f)} className={'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ' + (filter === f ? 'bg-[#0757d5] text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100')}>
            {label}{count ? <span className={'ml-2 rounded-full px-1.5 py-0.5 text-[11px] ' + (filter === f ? 'bg-white/25' : 'bg-red-500 text-white')}>{count}</span> : null}
          </button>))}
      </div>

      {groups.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center"><Bell className="mx-auto text-slate-300" size={34} /><p className="mt-3 font-bold">Nothing here</p><p className="mt-1 text-sm text-slate-500">{filter === 'all' ? 'Updates about your orders and wallet will appear here.' : 'No notifications in this view.'}</p></div>
      ) : groups.map(({ g, list }) => (
        <section key={g} className="mt-6">
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-widest text-slate-400">{g}</h2>
          <ul className="overflow-hidden rounded-3xl bg-white shadow-sm">
            {list.map(n => {
              const c = category(n); const Icon = /refund/i.test(n.title) ? RotateCcw : c === 'wallet' ? Wallet : c === 'orders' ? ReceiptText : Bell;
              const href = hrefFor(n);
              const body = (
                <div className={'flex gap-3 px-4 py-4 transition hover:bg-slate-50 ' + (n.read ? '' : 'bg-blue-50/60')}>
                  <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-full ' + (c === 'wallet' ? 'bg-emerald-50 text-emerald-600' : c === 'orders' ? 'bg-blue-50 text-[#0757d5]' : 'bg-slate-100 text-slate-500')}><Icon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3"><p className={'text-sm ' + (n.read ? 'font-semibold' : 'font-black')}>{n.title}</p>{!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0757d5]" aria-label="Unread" />}</div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{n.message}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{ago(n.created_at)}</p>
                  </div>
                </div>);
              return <li key={n.id} className="border-b border-slate-100 last:border-0" onClick={() => !n.read && markOne(n.id)}>{href ? <Link href={href}>{body}</Link> : body}</li>;
            })}
          </ul>
        </section>))}
    </div>
  );
}
