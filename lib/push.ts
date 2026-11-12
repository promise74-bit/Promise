// Server-only: load the CommonJS module directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush: typeof import('web-push') = require('web-push');
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '@/lib/push-config';

let ready = false;
function init() { if (!ready) { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY); ready = true; } }

export type PushPayload = { title: string; body: string; url?: string };

// Sends one notification to every device the user enabled. Dead subscriptions (404/410) are removed.
export async function sendPushToUser(admin: any, userId: string, payload: PushPayload) {
  init();
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', userId);
  let sent = 0;
  await Promise.all((subs || []).map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'high' });
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      else console.error('[push] send failed', e?.statusCode || e?.message);
    }
  }));
  return sent;
}
