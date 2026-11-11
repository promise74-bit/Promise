import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkPaystackAmount, verifyPaystackTransaction } from '@/lib/paystack';
import { creditFunding } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const reference = String(body?.reference || '').trim();
    if (!reference || reference.length > 200) return NextResponse.json({ paid: false, message: 'Invalid payment reference.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ paid: false, message: 'You must be logged in.' }, { status: 401 });

    const admin = createAdminClient();
    const { data: txn } = await admin.from('wallet_transactions').select('id,amount,status,user_id,balance_after')
      .eq('reference', reference).eq('kind', 'funding').eq('user_id', user.id).maybeSingle();
    if (!txn) return NextResponse.json({ paid: false, message: 'Funding not found.' }, { status: 404 });
    if (txn.status === 'success') return NextResponse.json({ paid: true, message: 'Wallet funded.', balance: Number(txn.balance_after) });
    if (txn.status === 'failed') return NextResponse.json({ paid: false, message: 'This funding attempt failed. Please start a new one.' });

    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret) return NextResponse.json({ paid: false, message: 'Payment gateway is not configured.' }, { status: 500 });

    const { result } = await verifyPaystackTransaction(reference, secret);
    const gatewayStatus = String(result.data?.status || '').toLowerCase();
    if (!result.status) return NextResponse.json({ paid: false, message: result.message || 'Could not verify the payment yet.' }, { status: 502 });
    if (gatewayStatus !== 'success') {
      return NextResponse.json({ paid: false, message: gatewayStatus === 'pending' || gatewayStatus === 'ongoing' ? 'Payment is still being confirmed.' : 'The payment was not completed.' });
    }
    const check = checkPaystackAmount(result.data, Number(txn.amount));
    if (!check.ok || String(result.data?.currency || 'NGN').toUpperCase() !== 'NGN') {
      console.error('Wallet funding verification rejected:', check.cause);
      return NextResponse.json({ paid: false, message: 'The amount paid does not match this funding. Please contact support.' });
    }
    const credited = await creditFunding(reference);
    if (!credited?.ok) return NextResponse.json({ paid: false, message: 'Payment confirmed but the wallet could not be credited. Please contact support.' }, { status: 500 });
    return NextResponse.json({ paid: true, message: 'Wallet funded.', balance: Number(credited.balance) });
  } catch (error) {
    console.error('Wallet verify error:', error);
    return NextResponse.json({ paid: false, message: 'Could not verify the payment right now.' }, { status: 500 });
  }
}
