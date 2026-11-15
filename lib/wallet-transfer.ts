// Fund-by-bank-transfer: every customer gets a personal Paystack dedicated account number.
// Money sent to it reaches Paystack's webhook (charge.success, channel "dedicated_nuban") and is credited to the wallet.
import { createAdminClient } from '@/lib/supabase/admin';

const clean = (v: unknown) => String(v ?? '').trim();
async function paystack(path: string, method: 'GET' | 'POST', body?: unknown) {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) throw new Error('GATEWAY_NOT_CONFIGURED');
  const res = await fetch('https://api.paystack.co' + path, { method, headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.status === true, json };
}
const normalizePhone = (v: unknown) => { const d = clean(v).replace(/\D/g, ''); return d.length === 13 && d.startsWith('234') ? '0' + d.slice(3) : d.length === 10 ? '0' + d : d; };

export type WalletAccount = { bank_name: string; account_number: string; account_name: string };

export async function getWalletAccount(userId: string): Promise<WalletAccount | null> {
  const { data } = await createAdminClient().from('wallet_accounts').select('bank_name,account_number,account_name').eq('user_id', userId).maybeSingle();
  return data || null;
}

export async function ensureWalletAccount(user: { id: string; email: string }, profile: { full_name?: string | null; phone?: string | null }): Promise<WalletAccount> {
  const existing = await getWalletAccount(user.id);
  if (existing) return existing;
  const phone = normalizePhone(profile.phone);
  if (!/^0[789][01]\d{8}$/.test(phone)) throw new Error('PHONE_REQUIRED');
  const parts = clean(profile.full_name || user.email.split('@')[0]).split(/\s+/);
  const first = parts[0] || 'Customer', last = parts.slice(1).join(' ') || first;

  let code = '';
  const created = await paystack('/customer', 'POST', { email: user.email, first_name: first, last_name: last, phone });
  code = clean(created.json?.data?.customer_code);
  if (!code) { const found = await paystack('/customer/' + encodeURIComponent(user.email), 'GET'); code = clean(found.json?.data?.customer_code); }
  if (!code) throw new Error('PAYSTACK: ' + clean(created.json?.message).slice(0, 160));

  const secret = process.env.PAYSTACK_SECRET_KEY?.trim() || '';
  const bank = secret.startsWith('sk_test') ? 'test-bank' : (process.env.PAYSTACK_DVA_BANK?.trim() || 'wema-bank');
  const dva = await paystack('/dedicated_account', 'POST', { customer: code, preferred_bank: bank });
  const d = dva.json?.data;
  if (!dva.ok || !d?.account_number) throw new Error('PAYSTACK: ' + clean(dva.json?.message).slice(0, 160));

  const row = { user_id: user.id, customer_code: code, bank_name: clean(d.bank?.name) || 'Bank transfer', account_number: clean(d.account_number), account_name: clean(d.account_name) };
  const { error } = await createAdminClient().from('wallet_accounts').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error('Could not save the account: ' + error.message);
  return { bank_name: row.bank_name, account_number: row.account_number, account_name: row.account_name };
}

export class TransferError extends Error { constructor(public code: 'RATE' | 'UNAVAILABLE', message: string) { super(message); } }

// Reads Paystack's "Pay with Transfer" charge reply. Returns null when no account number came back.
export function parseTransferCharge(json: any) {
  const d = json?.data || {};
  const accountNumber = clean(d.account_number || d.authorization?.account_number);
  if (!accountNumber) return null;
  return { accountNumber, bankName: clean(d.bank?.name || d.bank_name) || 'Bank transfer', accountName: clean(d.account_name) || 'Promise Computer Research', expiresAt: clean(d.account_expires_at || d.expires_at) };
}

// "Fund without NIN": a one-time Paystack account for ONE amount. The transfer is credited by the existing Paystack webhook
// (charge.success -> pending wallet funding with this reference -> amount check -> credit). Paystack signs webhooks with your secret key.
export async function createTempAccount(user: { id: string; email: string }, amount: number) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'funding').eq('status', 'pending').like('reference', 'PCRVA%').gte('created_at', since);
  if ((count || 0) >= 5) throw new TransferError('RATE', 'You have several unpaid transfer requests. Please complete one or wait an hour, then try again.');
  const reference = `PCRVA${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const expires = new Date(Date.now() + 30 * 60_000).toISOString();
  const r = await paystack('/charge', 'POST', { email: user.email, amount: amount * 100, reference, bank_transfer: { account_expires_at: expires }, metadata: { wallet_funding: true, customer_id: user.id } });
  const acct = r.ok ? parseTransferCharge(r.json) : null;
  if (!acct) { console.error('[wallet] paystack transfer account failed', clean(r.json?.message).slice(0, 200)); throw new TransferError('UNAVAILABLE', 'We could not create a transfer account right now. Please try again shortly, or fund with your card.'); }
  const { error } = await admin.from('wallet_transactions').insert({ user_id: user.id, kind: 'funding', direction: 'credit', amount, status: 'pending', reference, description: 'Wallet funding by bank transfer', metadata: { channel: 'bank_transfer_once', bank: acct.bankName, account: acct.accountNumber, expires: acct.expiresAt || expires } });
  if (error) throw new Error('Could not record the request: ' + error.message);
  return { accountNumber: acct.accountNumber, bankName: acct.bankName, accountName: acct.accountName, amount, reference, expiresAt: acct.expiresAt || expires };
}

// Called by the Paystack webhook. Returns null when the event is not a dedicated-account transfer.
export async function creditTransfer(data: any) {
  const channel = clean(data?.channel || data?.authorization?.channel);
  if (channel !== 'dedicated_nuban') return null;
  const admin = createAdminClient();
  const account = clean(data?.dedicated_account?.account_number || data?.authorization?.receiver_bank_account_number);
  const code = clean(data?.customer?.customer_code);
  let userId = '';
  if (account) { const { data: r } = await admin.from('wallet_accounts').select('user_id').eq('account_number', account).maybeSingle(); userId = r?.user_id || ''; }
  if (!userId && code) { const { data: r } = await admin.from('wallet_accounts').select('user_id').eq('customer_code', code).maybeSingle(); userId = r?.user_id || ''; }
  const amount = Number(data?.amount) / 100;
  const ref = clean(data?.reference);
  if (!userId || !ref || !Number.isFinite(amount) || amount <= 0 || clean(data?.currency || 'NGN').toUpperCase() !== 'NGN') {
    console.error('[wallet] bank transfer could not be matched', JSON.stringify({ account, code, ref, amount }));
    return { ok: false };
  }
  const { data: res, error } = await admin.rpc('wallet_credit_transfer', { p_user: userId, p_amount: amount, p_reference: 'DVA-' + ref, p_description: 'Wallet funding by bank transfer' });
  if (error) throw error;
  const r = res as { ok: boolean; already?: boolean; amount?: number; balance?: number };
  if (r?.ok && !r.already) {
    await admin.from('notifications').insert({ user_id: userId, title: 'Wallet funded', message: `Your bank transfer of ₦${amount.toLocaleString()} has been credited. New balance: ₦${Number(r.balance).toLocaleString()}.` });
  }
  return r;
}
