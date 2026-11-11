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
