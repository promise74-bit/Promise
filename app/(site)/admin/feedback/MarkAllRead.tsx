'use client';

import { useRouter } from 'next/navigation';

export default function MarkAllRead() {
  const router = useRouter();
  return <button onClick={async () => { await fetch('/api/admin/feedback', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true, read: true }) }); router.refresh(); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold">Mark all read</button>;
}
