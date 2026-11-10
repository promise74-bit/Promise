import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, sendEmail } from '@/lib/brevo';
import { welcomeEmail } from '@/lib/email-templates';

export async function POST(request: Request) {
  try {
    const b = await request.json();
    const fullName = String(b.fullName || '').trim().slice(0, 120);
    const phone = String(b.phone || '').trim().slice(0, 30);
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!fullName || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      return NextResponse.json({ error: 'Enter your name, phone, a valid email and a password of at least 6 characters.' }, { status: 400 });
    }

    const siteUrl = getSiteUrl(request);
    const admin = createAdminClient();
    // Creates the (unconfirmed) user and returns a confirmation token WITHOUT Supabase sending its own email.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'signup', email, password,
      options: { data: { full_name: fullName, phone }, redirectTo: `${siteUrl}/dashboard` },
    });
    if (error || !data?.properties?.hashed_token) {
      const exists = /already|registered|exists/i.test(error?.message || '');
      return NextResponse.json({ error: exists ? 'An account with this email already exists. Try signing in.' : (error?.message || 'Could not create account.') }, { status: exists ? 409 : 400 });
    }

    const confirmUrl = `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=signup&next=/dashboard`;
    try {
      await sendEmail({ to: email, toName: fullName, ...welcomeEmail({ name: fullName, confirmUrl, siteUrl }) });
    } catch (e) {
      console.error('Welcome email failed:', e instanceof Error ? e.message : e);
      return NextResponse.json({ ok: true, emailSent: false });
    }
    return NextResponse.json({ ok: true, emailSent: true });
  } catch (e) {
    console.error('Register failed:', e);
    return NextResponse.json({ error: 'Could not create account. Please try again.' }, { status: 500 });
  }
}
