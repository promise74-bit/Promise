import { NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPin, PIN_RE } from '@/lib/pin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const { data } = await createAdminClient().from('transaction_pins').select('user_id').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ hasPin: !!data });
}

// Create or change the PIN. Requires the account password, so a stolen session cannot set its own PIN.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const pin = String(body.pin || ''), password = String(body.password || '');
  if (!PIN_RE.test(pin)) return NextResponse.json({ error: 'The PIN must be exactly 4 digits.' }, { status: 400 });
  if (!password) return NextResponse.json({ error: 'Enter your account password to confirm.' }, { status: 400 });

  const probe = createSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pwError } = await probe.auth.signInWithPassword({ email: user.email, password });
  if (pwError) return NextResponse.json({ error: 'That password is not correct.' }, { status: 403 });

  const { error } = await createAdminClient().from('transaction_pins').upsert({ user_id: user.id, pin_hash: hashPin(pin), attempts: 0, locked_until: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) { console.error('[pin] save failed', error.message); return NextResponse.json({ error: 'Could not save your PIN. Please try again.' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
