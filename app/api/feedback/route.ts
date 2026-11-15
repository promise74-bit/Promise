import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Public endpoint (landing page). Light abuse protection: honeypot field + 5 messages per hour per visitor.
const hits = new Map<string, number[]>();

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (String(body.website || '').trim()) return NextResponse.json({ ok: true }); // bots fill the hidden field
  const message = String(body.message || '').trim().slice(0, 2000);
  const contact = String(body.contact || '').trim().slice(0, 120) || null;
  if (message.length < 3) return NextResponse.json({ error: 'Please write a few words.' }, { status: 400 });

  const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  if (recent.length >= 5) return NextResponse.json({ error: 'Thanks! You have sent a few already. Please try again later.' }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const { error } = await createAdminClient().from('feedback').insert({ message, contact });
  if (error) { console.error('[feedback] save failed', error.message); return NextResponse.json({ error: 'Could not send right now. Please try again.' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
