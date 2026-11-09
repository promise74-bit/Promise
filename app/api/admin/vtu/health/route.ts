import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { woodpayConfigured, woodpayWalletBalance } from '@/lib/woodpay';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Login required.' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') return NextResponse.json({ ok: false, error: 'Admin access required.' }, { status: 403 });

    const baseUrl = (process.env.WOODPAY_BASE_URL || 'https://woodpay.com.ng/api/v1').replace(/\/+$/, '') + '/';
    const result: Record<string, unknown> = { ok: true, configured: woodpayConfigured(), provider: 'WoodPay', baseUrl, endpoint: baseUrl + 'balance' };
    if (!woodpayConfigured()) return NextResponse.json({ ...result, providerReachable: false, providerError: 'WOODPAY_API_KEY is missing on the server.' });
    try {
      const b = await woodpayWalletBalance();
      result.providerReachable = b.httpStatus !== 401 && b.httpStatus !== 403;
      result.httpStatus = b.httpStatus;
      result.providerOk = b.ok;
      if (b.ok) result.walletBalance = b.balance;
      else result.providerError = 'WoodPay rejected the request (HTTP ' + b.httpStatus + ').';
    } catch (error) {
      result.providerReachable = false;
      result.providerOk = false;
      result.providerError = error instanceof Error ? error.message : String(error);
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Connection check failed.' }, { status: 500 });
  }
}
