import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { afterWalletPayment } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, [string, number]> = {
  not_found: ['Order not found.', 404],
  already_paid: ['This order is already paid.', 409],
  payment_in_progress: ['A payment is already in progress for this order.', 409],
  cancelled: ['This order is cancelled.', 409],
  no_price: ['This order does not have a price yet.', 400]
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || '');
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'You must be logged in.' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin.rpc('wallet_pay_order', { p_order_id: orderId, p_user_id: user.id });
    if (error) {
      console.error('wallet_pay_order failed:', error.message);
      return NextResponse.json({ error: 'Could not complete the wallet payment. Please try again.' }, { status: 500 });
    }
    const result = data as any;
    if (!result?.ok) {
      if (result?.code === 'insufficient') {
        return NextResponse.json({ error: `Insufficient wallet balance. You need ₦${Number(result.needed).toLocaleString()} but have ₦${Number(result.balance).toLocaleString()}.`, code: 'insufficient' }, { status: 402 });
      }
      const [message, status] = MESSAGES[result?.code] || ['Could not complete the wallet payment.', 400];
      return NextResponse.json({ error: message }, { status });
    }
    const fulfillment = await afterWalletPayment(orderId, request);
    return NextResponse.json({ paid: true, balance: Number(result.balance), fulfillment });
  } catch (error) {
    console.error('Wallet pay error:', error);
    return NextResponse.json({ error: 'Unexpected wallet payment error.' }, { status: 500 });
  }
}
