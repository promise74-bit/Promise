import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureWalletAccount, getWalletAccount } from '@/lib/wallet-transfer';
import { createFlwAccount, flwConfigured, FlwError } from '@/lib/flutterwave';

export const dynamic = 'force-dynamic';

async function who() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { user } = await who();
  if (!user) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  return NextResponse.json({ account: await getWalletAccount(user.id) });
}

export async function POST(request: Request) {
  const { supabase, user } = await who();
  if (!user || !user.email) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  if (flwConfigured()) {
    const body = await request.json().catch(() => ({}));
    try { return NextResponse.json({ account: await createFlwAccount({ id: user.id, email: user.email }, { nin: String(body.nin || ''), ninName: String(body.ninName || '') }) }); }
    catch (e) {
      if (e instanceof FlwError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.code === 'UNAVAILABLE' ? 503 : 400 });
      console.error('[wallet] flutterwave account failed', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'Could not create your account right now. Please try again.' }, { status: 500 });
    }
  }
  try {
    const { data: profile } = await supabase.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle();
    const account = await ensureWalletAccount({ id: user.id, email: user.email }, profile || {});
    return NextResponse.json({ account });
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    console.error('[wallet] dedicated account failed:', m);
    if (m === 'PHONE_REQUIRED') return NextResponse.json({ error: 'Add your phone number on your profile first, then try again.', code: 'PHONE_REQUIRED' }, { status: 400 });
    return NextResponse.json({ error: 'Bank transfer funding is not available yet. Please fund with your card for now.' }, { status: 503 });
  }
}
