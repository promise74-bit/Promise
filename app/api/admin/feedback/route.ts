import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return me?.role === 'admin';
}

// PATCH { id | all:true, read:boolean }   DELETE { id }
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const q = createAdminClient().from('feedback').update({ read: b.read !== false });
  const { error } = b.all ? await q.eq('read', false) : await q.eq('id', String(b.id || ''));
  return error ? NextResponse.json({ error: 'Could not update.' }, { status: 500 }) : NextResponse.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  const b = await request.json().catch(() => ({}));
  const { error } = await createAdminClient().from('feedback').delete().eq('id', String(b.id || ''));
  return error ? NextResponse.json({ error: 'Could not delete.' }, { status: 500 }) : NextResponse.json({ ok: true });
}
