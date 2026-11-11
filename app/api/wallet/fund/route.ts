import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_FUNDING, MIN_FUNDING, validFundingAmount } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const amount = validFundingAmount(body.amount);
    if (!amount) {
      return NextResponse.json({ error: `Enter a whole-naira amount from ₦${MIN_FUNDING.toLocaleString()} to ₦${MAX_FUNDING.toLocaleString()}.` }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });
    if (!user.email) return NextResponse.json({ error: 'Your account does not have an email address.' }, { status: 400 });

    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret) return NextResponse.json({ error: 'Payment gateway is not configured.' }, { status: 500 });

    const admin = createAdminClient();
    const reference = `WLT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { error: insertError } = await admin.from('wallet_transactions').insert({
      user_id: user.id, kind: 'funding', direction: 'credit', amount, status: 'pending',
      reference, description: 'Wallet funding via Paystack'
    });
    if (insertError) return NextResponse.json({ error: 'Could not prepare the funding. Please try again.' }, { status: 500 });

    const origin = new URL(request.url).origin;
    const init = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        amount: amount * 100,
        reference,
        callback_url: `${origin}/wallet/callback`,
        metadata: { wallet_funding: true, customer_id: user.id }
      })
    });
    let result: any = null;
    try { result = await init.json(); } catch { result = null; }

    if (!init.ok || !result?.status || !result?.data?.authorization_url) {
      await admin.from('wallet_transactions').update({ status: 'failed', metadata: { error: result?.message || 'init failed' } }).eq('reference', reference);
      return NextResponse.json({ error: result?.message || 'Could not start the payment.' }, { status: 502 });
    }
    return NextResponse.json({ authorization_url: result.data.authorization_url, reference });
  } catch {
    return NextResponse.json({ error: 'Unexpected wallet funding error.' }, { status: 500 });
  }
}
