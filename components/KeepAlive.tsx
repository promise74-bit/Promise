'use client';

import { useEffect } from 'react';

// Keeps the server awake while someone has the site open, so a payment never waits on a cold start.
// Pings /api/health on load, then every 4 minutes while the tab is visible (hosts like Render sleep after ~15 idle minutes).
export default function KeepAlive() {
  useEffect(() => {
    let last = 0;
    const ping = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 60_000) return;
      last = Date.now();
      fetch('/api/health', { cache: 'no-store', keepalive: true }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    document.addEventListener('visibilitychange', ping);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', ping); };
  }, []);
  return null;
}
