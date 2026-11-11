import { createAdminClient } from '@/lib/supabase/admin';
import { fulfillOrder } from '@/lib/woodpay';
import { sendOrderEmail } from '@/lib/order-emails';

export const MIN_FUNDING = 100;
export const MAX_FUNDING = 500000;

export function validFundingAmount(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n >= MIN_FUNDING && n <= MAX_FUNDING ? n : null;
}

// Credits a verified Paystack wallet funding exactly once (the SQL function is idempotent).
export async function creditFunding(reference: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('wallet_complete_funding', { p_reference: reference });
  if (error) throw error;
  const result = data as { ok: boolean; already?: boolean; amount?: number; balance?: number; user_id?: string; code?: string };
  if (result?.ok && !result.already && result.user_id) {
    await admin.from('notifications').insert({
      user_id: result.user_id,
      title: 'Wallet funded',
      message: `Your wallet has been credited with ₦${Number(result.amount).toLocaleString()}. New balance: ₦${Number(result.balance).toLocaleString()}.`
    });
  }
  return result;
}

// Runs the same post-payment steps as a successful Paystack payment.
export async function afterWalletPayment(orderId: string, request: Request) {
  const admin = createAdminClient();
  let fulfillment: any = null;
  try {
    fulfillment = await fulfillOrder(orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown fulfillment error';
    console.error('Fulfillment after wallet payment failed:', message);
    await admin.from('orders').update({
      status: 'needs_information',
      admin_note: 'Paid from wallet, but automatic fulfillment encountered an unexpected error: ' + message.slice(0, 500)
    }).eq('id', orderId);
    fulfillment = { status: 'failed', message };
  }
  const { data: owner } = await admin.from('orders').select('customer_id,reference').eq('id', orderId).maybeSingle();
  if (owner?.customer_id) {
    await admin.from('notifications').insert({
      user_id: owner.customer_id,
      title: 'Payment confirmed',
      message: 'Order ' + owner.reference + ' was paid from your wallet and is now being processed.'
    });
  }
  try { await sendOrderEmail(orderId, 'paid', request); } catch (e) { console.error('Wallet payment email failed:', e); }
  return fulfillment;
}
