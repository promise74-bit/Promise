// Automated refunds: a paid order whose delivery DEFINITELY failed is refunded to the customer's wallet (card or wallet payments alike).
// Never call this for an unknown outcome (timeout, pending) — the order may still be delivered.
export async function refundOrder(admin: any, order: { id: string; reference: string }, reason: string) {
  const { data, error } = await admin.rpc('wallet_refund_order', { p_order_id: order.id, p_reason: reason.slice(0, 200) });
  if (error) { console.error('[refund] failed to refund order', order.reference, error.message); return { ok: false as const }; }
  const r = data as { ok: boolean; already?: boolean; amount?: number; balance?: number; user_id?: string; code?: string };
  if (!r?.ok) { console.error('[refund] order not refunded', order.reference, JSON.stringify(r)); return { ok: false as const, code: r?.code }; }
  if (!r.already && r.user_id) {
    await admin.from('notifications').insert({
      user_id: r.user_id, title: 'Order refunded',
      message: `We could not deliver order ${order.reference}. ₦${Number(r.amount).toLocaleString('en-NG')} has been refunded to your wallet. New balance: ₦${Number(r.balance).toLocaleString('en-NG')}.`,
    });
  }
  return { ok: true as const, already: !!r.already, message: 'Delivery failed. Your payment was refunded to your wallet.' };
}
