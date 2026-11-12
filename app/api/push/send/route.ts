import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushToUser } from '@/lib/push';
import { PUSH_SECRET } from '@/lib/push-config';

export const dynamic = 'force-dynamic';

// Called by the database trigger whenever a notification row is created. Protected by a shared secret.
export async function POST(request: Request) {
  const given = Buffer.from(request.headers.get('x-push-secret') || ''), want = Buffer.from(PUSH_SECRET);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const r = body.record || {};
  const userId = String(r.user_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Bad record' }, { status: 400 });
  const title = String(r.title || 'Promise Computer Research').slice(0, 80);
  const message = String(r.message || '').replace(/\s+/g, ' ').slice(0, 160);
  const url = /wallet|refund|funded|credited|debited/i.test(title) ? '/dashboard/wallet#history' : '/dashboard/notifications';
  const sent = await sendPushToUser(createAdminClient(), userId, { title, body: message, url });
  return NextResponse.json({ ok: true, sent });
}
