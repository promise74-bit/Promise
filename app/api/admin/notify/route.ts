import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return profile?.role === 'admin' ? user : null;
}

async function findUserIdByEmail(email: string) {
  const admin = createAdminClient();
  const target = email.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find(u => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

export async function POST(request: Request) {
  const adminUser = await requireAdmin();
  if (!adminUser) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const b = await request.json().catch(() => ({}));
    const title = String(b.title || '').trim().slice(0, 100);
    const message = String(b.message || '').trim().slice(0, 500);
    const audience = String(b.audience || '');
    if (!title || !message) return NextResponse.json({ error: 'Add a title and a message.' }, { status: 400 });
    if (!['test', 'one', 'all'].includes(audience)) return NextResponse.json({ error: 'Choose who to send to.' }, { status: 400 });

    const admin = createAdminClient();
    let ids: string[] = [];
    if (audience === 'test') {
      ids = [adminUser.id];
    } else if (audience === 'one') {
      const email = String(b.email || '').trim();
      if (!email) return NextResponse.json({ error: 'Enter the customer’s email address.' }, { status: 400 });
      const id = await findUserIdByEmail(email);
      if (!id) return NextResponse.json({ error: 'No customer found with that email.' }, { status: 404 });
      ids = [id];
    } else {
      const { data, error } = await admin.from('profiles').select('id');
      if (error) throw error;
      ids = (data || []).map(p => p.id as string);
    }
    if (!ids.length) return NextResponse.json({ error: 'No recipients found.' }, { status: 400 });

    for (let i = 0; i < ids.length; i += 500) {
      const rows = ids.slice(i, i + 500).map(user_id => ({ user_id, title, message }));
      const { error } = await admin.from('notifications').insert(rows);
      if (error) throw error;
    }
    return NextResponse.json({ ok: true, sent: ids.length, audience });
  } catch (e) {
    console.error('Admin notify failed:', e);
    return NextResponse.json({ error: 'Could not send the notification.' }, { status: 500 });
  }
}
