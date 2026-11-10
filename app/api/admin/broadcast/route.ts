import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSiteUrl, sendBulkEmail } from '@/lib/brevo';
import { broadcastEmail, esc } from '@/lib/email-templates';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return profile?.role === 'admin' ? user : null;
}

const first = (n: unknown, email: string) => String(n || '').trim().split(/\s+/)[0] || email.split('@')[0];

async function getRecipients() {
  const admin = createAdminClient();
  const out: { email: string; name: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email && u.email_confirmed_at && !(u as any).banned_until) {
        out.push({ email: u.email, name: esc(first((u.user_metadata as any)?.full_name, u.email)) });
      }
    }
    if (data.users.length < 1000) break;
  }
  return out;
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const b = await request.json().catch(() => ({}));
    const subject = String(b.subject || '').trim().slice(0, 150);
    const message = String(b.message || '').trim().slice(0, 5000);
    const buttonLabel = String(b.buttonLabel || '').trim().slice(0, 40);
    const buttonUrl = String(b.buttonUrl || '').trim();
    const testOnly = b.testOnly === true;
    if (!subject || !message) return NextResponse.json({ error: 'Add a subject and a message.' }, { status: 400 });
    if (buttonUrl && !/^https?:\/\//i.test(buttonUrl)) return NextResponse.json({ error: 'Button link must start with http:// or https://' }, { status: 400 });

    const mail = broadcastEmail({ subject, message, siteUrl: getSiteUrl(request), buttonLabel, buttonUrl });
    let recipients: { email: string; name: string }[];
    if (testOnly) {
      recipients = [{ email: user.email!, name: esc(first((user.user_metadata as any)?.full_name, user.email!)) }];
    } else {
      recipients = await getRecipients();
    }
    if (!recipients.length) return NextResponse.json({ error: 'No recipients found.' }, { status: 400 });

    const { sent, failures } = await sendBulkEmail({ ...mail, recipients });
    if (failures.length) console.error('Broadcast failures:', failures);
    return NextResponse.json({ ok: failures.length === 0, sent, total: recipients.length, test: testOnly, error: failures.length ? 'Some emails were rejected by Brevo (daily sending limit or sender not verified). ' + failures[0] : undefined }, { status: failures.length && !sent ? 502 : 200 });
  } catch (e) {
    console.error('Broadcast failed:', e);
    return NextResponse.json({ error: 'Could not send. Check that BREVO_API_KEY and BREVO_SENDER_EMAIL are set.' }, { status: 500 });
  }
}
