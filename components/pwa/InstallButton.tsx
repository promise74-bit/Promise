'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Permanent "Install app" entry in the menu (the banner can be snoozed). Hidden once the app is installed.
export default function InstallButton() {
  const [ev, setEv] = useState<any>(null); const [ios, setIos] = useState(false); const [hint, setHint] = useState(false); const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) { setInstalled(true); return; }
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setEv((window as any).__pcrInstall || null);
    const ready = () => setEv((window as any).__pcrInstall || null);
    const done = () => setInstalled(true);
    window.addEventListener('pcr-install-ready', ready); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('pcr-install-ready', ready); window.removeEventListener('appinstalled', done); };
  }, []);
  if (installed || (!ev && !ios)) return null;
  async function install() { if (ev) { await ev.prompt(); await ev.userChoice?.catch(() => null); setEv(null); } else setHint(h => !h); }
  return (
    <div>
      <button onClick={install} className="flex w-full items-center gap-3 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-bold text-[#0757d5] hover:bg-blue-100"><Download size={18} /> Install app</button>
      {hint && <p className="mx-3 mt-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">On iPhone: tap the Share button, then “Add to Home Screen”.</p>}
    </div>
  );
}
