import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUSH_SECRET } from '@/lib/push-config';

export const dynamic = 'force-dynamic';

// Backup scheduler: if you do not use Supabase's pg_cron, point a free uptime monitor at
// https://<your-domain>/api/push/dispatch?key=<PUSH_SECRET> every minute. It sends whatever is due.
export async function GET(request: Request) {
  const given = Buffer.from(new URL(request.url).searchParams.get('key') || ''), want = Buffer.from(PUSH_SECRET);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await createAdminClient().rpc('dispatch_scheduled_notifications');
  if (error) { console.error('[push] dispatch failed', error.message); return NextResponse.json({ error: 'Dispatch failed' }, { status: 500 }); }
  return NextResponse.json({ ok: true, sent: data });
}
