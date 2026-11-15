// In-app wallet funding like WoodPay: each customer gets a permanent Flutterwave virtual account (created from their NIN + name).
// Money sent to it reaches /api/flutterwave/webhook, which credits the wallet exactly once.
// Needs FLW_SECRET_KEY and FLW_WEBHOOK_SECRET_HASH (the secret hash you set in Flutterwave → Settings → Webhooks).
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWalletAccount, type WalletAccount } from '@/lib/wallet-transfer';
import { creditFunding } from '@/lib/wallet';

const FLW = 'https://api.flutterwave.com/v3';
const BANK_CODE = '057'; // Zenith Bank — the same issuing bank WoodPay uses
const clean = (v: unknown) => String(v ?? '').trim();
export const flwConfigured = () => Boolean(process.env.FLW_SECRET_KEY?.trim());

export class FlwError extends Error { constructor(public code: 'NIN_INVALID' | 'NAME_MISMATCH' | 'NAME_REQUIRED' | 'UNAVAILABLE' | 'EXISTS' | 'RATE', message: string) { super(message); } }

export async function createFlwAccount(user: { id: string; email: string }, input: { nin: string; ninName: string }): Promise<WalletAccount> {
  const existing = await getWalletAccount(user.id);
  if (existing) return existing;
  const nin = clean(input.nin), name = clean(input.ninName).replace(/\s+/g, ' ');
  if (!/^[1-9][0-9]{10}$/.test(nin)) throw new FlwError('NIN_INVALID', 'Your NIN must be exactly 11 digits.');
  if (name.length < 3 || !name.includes(' ')) throw new FlwError('NAME_REQUIRED', 'Enter your full name (first and last) exactly as it appears on your NIN.');
  const [first, ...rest] = name.split(' ');
  const tx_ref = `PCR-${user.id}`;

  const res = await fetch(`${FLW}/virtual-account-numbers`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY!.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, tx_ref, is_permanent: true, bank_code: BANK_CODE, firstname: first, lastname: rest.join(' ') || first, narration: name, nin }),
  });
  const j: any = await res.json().catch(() => ({}));
  const d = j?.data;
  if (!res.ok || j?.status !== 'success' || !d?.account_number) {
    const m = clean(j?.message).toLowerCase();
    console.error('[flw] account creation failed', res.status, m.slice(0, 200));
    if (/already|exist|duplicate|in use|previously/.test(m)) throw new FlwError('EXISTS', 'An account already exists for these details. Please contact support so we can link it to your wallet.');
    if (/name/.test(m) && /(match|mismatch|differ|invalid)/.test(m)) throw new FlwError('NAME_MISMATCH', 'The name does not match this NIN. Enter your full name exactly as it appears on your NIN (same spelling and order).');
    if (/(nin|bvn|identity|national|verif)/.test(m)) throw new FlwError('NIN_INVALID', 'We could not verify this NIN. Check all 11 digits and that your name matches your NIN record.');
    if (res.status === 429 || /(rate|too many|limit)/.test(m)) throw new FlwError('RATE', 'Too many attempts. Please wait a few minutes and try again.');
    throw new FlwError('UNAVAILABLE', 'Account creation is not available right now. Please try again later or fund with your card.');
  }
  const row = { user_id: user.id, customer_code: tx_ref, bank_name: clean(d.bank_name) || 'Zenith Bank', account_number: clean(d.account_number), account_name: name };
  const { error } = await createAdminClient().from('wallet_accounts').upsert(row, { onConflict: 'user_id' });
  if (error) throw new Error('Could not save the account: ' + error.message);
  return { bank_name: row.bank_name, account_number: row.account_number, account_name: row.account_name };
}

// "Fund without NIN": a one-time account for ONE amount (like WoodPay). The customer transfers exactly that amount; the webhook
// matches the transaction reference to the pending funding row and credits it.
export async function createTempAccount(user: { id: string; email: string }, amount: number) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('kind', 'funding').eq('status', 'pending').like('reference', 'PCRVA%').gte('created_at', since);
  if ((count || 0) >= 5) throw new FlwError('RATE', 'You have several unpaid transfer requests. Please complete one or wait an hour, then try again.');
  const reference = `PCRVA${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const res = await fetch(`${FLW}/virtual-account-numbers`, {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY!.trim()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, tx_ref: reference, amount, is_permanent: false, narration: 'Promise Computer Research wallet' }),
  });
  const j: any = await res.json().catch(() => ({}));
  const d = j?.data;
  if (!res.ok || j?.status !== 'success' || !d?.account_number) {
    console.error('[flw] temp account failed', res.status, clean(j?.message).slice(0, 200));
    throw new FlwError('UNAVAILABLE', 'We could not create a transfer account right now. Please try again shortly, or fund with your card.');
  }
  const { error } = await admin.from('wallet_transactions').insert({ user_id: user.id, kind: 'funding', direction: 'credit', amount, status: 'pending', reference, description: 'Wallet funding by bank transfer', metadata: { channel: 'temp_account', bank: clean(d.bank_name), account: clean(d.account_number), expires: clean(d.expiry_date) } });
  if (error) throw new Error('Could not record the request: ' + error.message);
  return { accountNumber: clean(d.account_number), bankName: clean(d.bank_name) || 'Bank transfer', amount, reference, expiresAt: clean(d.expiry_date) };
}

// Flutterwave v4 signs the RAW body: base64(HMAC-SHA256(body, secretHash)) in the "flutterwave-signature" header.
export function verifyFlwSignature(rawBody: string, header: string | null) {
  const secret = process.env.FLW_WEBHOOK_SECRET_HASH?.trim();
  if (!secret || !header) return false;
  const want = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const a = Buffer.from(want), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function extractAccountNumber(data: any): string {
  const c = [data?.virtual_account?.account_number, data?.payment_method?.virtual_account?.account_number, data?.payment_method?.bank_transfer?.account_number,
    data?.payment_method?.bank_transfer?.virtual_account?.account_number, data?.account_number, data?.meta?.account_number];
  return clean(c.find(v => typeof v === 'string' && v.length > 0));
}

// Returns null when the event is not a successful transfer we should handle.
export async function creditFlwTransfer(payload: any) {
  if (payload?.type !== 'charge.completed') return null;
  const data = payload.data || {};
  if (clean(data.status).toLowerCase() !== 'succeeded') return null;
  const admin = createAdminClient();
  const acct = extractAccountNumber(data), ref = clean(data.reference), chargeId = clean(data.id);
  if (ref.startsWith('PCRVA')) { // one-time ("without NIN") account: credit the matching pending funding row, but only if the exact amount arrived
    const { data: row } = await admin.from('wallet_transactions').select('amount,status').eq('reference', ref).eq('kind', 'funding').maybeSingle();
    if (!row) { console.error('[flw] one-time transfer has no matching request', ref); return { ok: false }; }
    if (row.status === 'success') return { ok: true, already: true };
    if (Math.round(Number(row.amount) * 100) !== Math.round(Number(data.amount) * 100)) { console.error('[flw] one-time transfer amount mismatch — not credited', JSON.stringify({ ref, expected: row.amount, got: data.amount })); return { ok: false }; }
    return await creditFunding(ref);
  }
  let userId = '';
  if (ref) { const { data: r } = await admin.from('wallet_accounts').select('user_id').eq('customer_code', ref).maybeSingle(); userId = r?.user_id || ''; }
  if (!userId && acct) { const { data: r } = await admin.from('wallet_accounts').select('user_id').eq('account_number', acct).maybeSingle(); userId = r?.user_id || ''; }
  const amount = Number(data.amount);
  if (!userId || !chargeId || !Number.isFinite(amount) || amount <= 0) { console.error('[flw] transfer could not be matched', JSON.stringify({ ref, acct, chargeId, amount })); return { ok: false }; }
  // Keyed on the charge id, NOT the reference: Flutterwave reuses the reference for every transfer into a static account.
  const { data: res, error } = await admin.rpc('wallet_credit_transfer', { p_user: userId, p_amount: amount, p_reference: 'FLW-' + chargeId, p_description: 'Wallet funding by bank transfer' });
  if (error) throw error;
  const r = res as { ok: boolean; already?: boolean; balance?: number };
  if (r?.ok && !r.already) await admin.from('notifications').insert({ user_id: userId, title: 'Wallet funded', message: `Your bank transfer of ₦${amount.toLocaleString('en-NG')} has been credited. New balance: ₦${Number(r.balance).toLocaleString('en-NG')}.` });
  return r;
}
