import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, sendEmail } from '@/lib/brevo';
import { pinResetEmail } from '@/lib/email-templates';
import { hashPin, PIN_RE } from '@/lib/pin';
import { checkTicket, makeTicket } from '@/lib/pin-reset';

export const dynamic = 'force-dynamic';
const MAX_TRIES = 5, LOCK_MINUTES = 15;

// action "send": email a 6-digit code.  action "confirm": check the code and set the new PIN.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: row } = await admin.from('transaction_pins').select('updated_at,attempts,locked_until').eq('user_id', user.id).maybeSingle();
  const version = row?.updated_at ? String(row.updated_at) : 'none';

  if (body.action === 'send') {
    if (row?.locked_until && new Date(row.locked_until).getTime() > Date.now()) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    try {
      const { ticket, code } = makeTicket(user.id, version);
      const name = (user.user_metadata as any)?.full_name as string | undefined;
      await sendEmail({ to: user.email, toName: name, ...pinResetEmail({ name, code, siteUrl: getSiteUrl(request) }) });
      return NextResponse.json({ ok: true, ticket, email: user.email.replace(/^(.).*(@.*)$/, '$1•••$2') });
    } catch (e) {
      console.error('[pin-reset] send failed', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Could not send the code. Please try again.' }, { status: 500 });
    }
  }

  if (body.action === 'confirm') {
    const pin = String(body.pin || ''), code = String(body.code || '').trim();
    if (!PIN_RE.test(pin)) return NextResponse.json({ error: 'The PIN must be exactly 4 digits.' }, { status: 400 });
    if (row?.locked_until && new Date(row.locked_until).getTime() > Date.now()) return NextResponse.json({ error: 'Too many wrong codes. Try again in a few minutes.' }, { status: 429 });
    const res = checkTicket(user.id, version, String(body.ticket || ''), code);
    if (res === 'expired') return NextResponse.json({ error: 'That code has expired. Request a new one.' }, { status: 400 });
    if (res !== 'ok') {
      if (row) {
        const attempts = (row.attempts || 0) + 1;
        await admin.from('transaction_pins').update(attempts >= MAX_TRIES ? { attempts: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() } : { attempts }).eq('user_id', user.id);
      }
      return NextResponse.json({ error: 'That code is not correct.' }, { status: 403 });
    }
    const { error } = await admin.from('transaction_pins').upsert({ user_id: user.id, pin_hash: hashPin(pin), attempts: 0, locked_until: null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) { console.error('[pin-reset] save failed', error.message); return NextResponse.json({ error: 'Could not save your PIN. Please try again.' }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
}
