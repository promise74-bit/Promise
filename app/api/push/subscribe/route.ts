import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sub = body.subscription;
  const endpoint = String(sub?.endpoint || ''), p256dh = String(sub?.keys?.p256dh || ''), auth = String(sub?.keys?.auth || '');
  if (!/^https:\/\//.test(endpoint) || !p256dh || !auth) return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
  const { error } = await createAdminClient().from('push_subscriptions').upsert({ user_id: user.id, endpoint, p256dh, auth, user_agent: String(request.headers.get('user-agent') || '').slice(0, 200) }, { onConflict: 'endpoint' });
  if (error) { console.error('[push] subscribe failed', error.message); return NextResponse.json({ error: 'Could not enable notifications.' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  await createAdminClient().from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', String(body.endpoint || ''));
  return NextResponse.json({ ok: true });
}
