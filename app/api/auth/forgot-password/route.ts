import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, sendEmail } from '@/lib/brevo';
import { resetPasswordEmail } from '@/lib/email-templates';

// Always answers the same way so the form can't be used to discover which emails have accounts.
export async function POST(request: Request) {
  const ok = NextResponse.json({ ok: true });
  try {
    const b = await request.json();
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ok;

    const siteUrl = getSiteUrl(request);
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: `${siteUrl}/reset-password` } });
    if (error || !data?.properties?.hashed_token) return ok;

    const resetUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=/reset-password`;
    const name = (data.user?.user_metadata as any)?.full_name as string | undefined;
    await sendEmail({ to: email, toName: name, ...resetPasswordEmail({ name, resetUrl, siteUrl }) });
  } catch (e) {
    console.error('Forgot password failed:', e instanceof Error ? e.message : e);
  }
  return ok;
}
