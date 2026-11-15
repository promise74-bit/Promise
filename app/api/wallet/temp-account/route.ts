import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTempAccount, TransferError } from '@/lib/wallet-transfer';
import { MAX_FUNDING, MIN_FUNDING } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// POST { amount } -> a one-time bank account for that amount (no NIN needed).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < MIN_FUNDING || amount > MAX_FUNDING) return NextResponse.json({ error: `Enter a whole amount from ₦${MIN_FUNDING.toLocaleString()} to ₦${MAX_FUNDING.toLocaleString()}.` }, { status: 400 });
  try { return NextResponse.json(await createTempAccount({ id: user.id, email: user.email }, amount)); }
  catch (e) {
    if (e instanceof TransferError) return NextResponse.json({ error: e.message }, { status: e.code === 'RATE' ? 429 : 503 });
    console.error('[wallet] temp account failed', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Could not create the transfer account. Please try again.' }, { status: 500 });
  }
}
