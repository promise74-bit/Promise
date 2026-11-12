'use client';

import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { VAPID_PUBLIC_KEY } from '@/lib/push-config';

const toKey = (b64: string) => { const p = '='.repeat((4 - (b64.length % 4)) % 4); const raw = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };

export default function PushToggle() {
  const [state, setState] = useState<'checking' | 'unsupported' | 'denied' | 'off' | 'on'>('checking');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setState('unsupported');
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && Notification.permission === 'granted' ? 'on' : 'off');
    })().catch(() => setState('unsupported'));
  }, []);

  async function enable() {
    setBusy(true); setError('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); setBusy(false); return; }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) }));
      const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Could not enable notifications.');
      setState('on');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not enable notifications.'); }
    setBusy(false);
  }
  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription();
      if (sub) { await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }); await sub.unsubscribe(); }
      setState('off');
    } catch { /* ignore */ }
    setBusy(false);
  }

  if (state === 'checking') return null;
  const note = state === 'unsupported' ? (isIos ? 'On iPhone: tap Share, then "Add to Home Screen", open the app from your Home Screen, then come back here to turn on alerts.' : 'This browser does not support push notifications.')
    : state === 'denied' ? 'Notifications are blocked for this site. Allow them in your browser settings to turn this on.'
    : state === 'on' ? 'You will get an alert on this device for payments, wallet changes and order updates.' : 'Get an instant alert on this device for payments, wallet changes and order updates.';
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#f0f6ff] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0757d5] text-white"><BellRing size={18} /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-black">{state === 'on' ? 'Push alerts are on' : 'Turn on push alerts'}</p><p className="text-xs text-slate-600">{note}</p>{error && <p className="mt-1 text-xs text-red-600">{error}</p>}</div>
      {state === 'off' && <button onClick={enable} disabled={busy} className="shrink-0 rounded-xl bg-[#0757d5] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? '…' : 'Turn on'}</button>}
      {state === 'on' && <button onClick={disable} disabled={busy} className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-60">Turn off</button>}
    </div>
  );
}
