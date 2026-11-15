import { NextResponse } from 'next/server';
import { creditFlwTransfer, verifyFlwSignature } from '@/lib/flutterwave';

export const dynamic = 'force-dynamic';

// Webhook URL to set in Flutterwave → Settings → Webhooks: https://<your-domain>/api/flutterwave/webhook
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyFlwSignature(raw, request.headers.get('flutterwave-signature'))) return new NextResponse('Invalid signature', { status: 401 });
  let payload: any; try { payload = JSON.parse(raw); } catch { return new NextResponse('Bad JSON', { status: 400 }); }
  try { await creditFlwTransfer(payload); }
  catch (e) { console.error('[flw] webhook credit failed', e instanceof Error ? e.message : e); return new NextResponse('Temporary error', { status: 500 }); }
  return NextResponse.json({ received: true });
}
