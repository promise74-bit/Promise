import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Admin only. mode: credit | debit | set (set = make the balance exactly `amount`).
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required.' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId || ''), mode = String(body.mode || ''), reason = String(body.reason || '').trim();
  const amount = Number(body.amount);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Customer not found.' }, { status: 400 });
  if (!['credit', 'debit', 'set'].includes(mode)) return NextResponse.json({ error: 'Choose credit, debit or set.' }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000 || (mode !== 'set' && amount <= 0)) return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
  if (reason.length < 3) return NextResponse.json({ error: 'Add a short reason (it is recorded).' }, { status: 400 });

  const admin = createAdminClient();
  let direction = mode, delta = amount;
  if (mode === 'set') {
    const { data: w } = await admin.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
    const diff = Math.round((amount - Number(w?.balance || 0)) * 100) / 100;
    if (diff === 0) return NextResponse.json({ ok: true, unchanged: true, balance: Number(w?.balance || 0) });
    direction = diff > 0 ? 'credit' : 'debit'; delta = Math.abs(diff);
  }
  const { data, error } = await admin.rpc('wallet_admin_adjust', { p_user: userId, p_amount: delta, p_direction: direction, p_reason: reason, p_admin: user.id });
  if (error) { console.error('[admin] wallet adjust failed', error.message); return NextResponse.json({ error: 'Could not update the wallet. Has the latest SQL been run?' }, { status: 500 }); }
  const r = data as any;
  if (!r?.ok) return NextResponse.json({ error: r.code === 'insufficient' ? `The customer only has ₦${Number(r.balance).toLocaleString()}.` : 'Could not update the wallet.' }, { status: 400 });
  await admin.from('notifications').insert({ user_id: userId, title: 'Wallet updated', message: `Your wallet was ${direction === 'credit' ? 'credited' : 'debited'} ₦${delta.toLocaleString()}. New balance: ₦${Number(r.balance).toLocaleString()}.` });
  return NextResponse.json({ ok: true, balance: Number(r.balance) });
}
