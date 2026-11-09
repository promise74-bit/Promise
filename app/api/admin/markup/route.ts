import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MARKUP_CATEGORIES } from "@/lib/markup";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? user : null;
}

export async function PUT(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const category = String(body.category || "");
  const mode = String(body.mode || "");
  const value = Number(body.value);
  if (!(MARKUP_CATEGORIES as readonly string[]).includes(category)) return NextResponse.json({ error: "Unknown service." }, { status: 400 });
  if (!["percent", "flat"].includes(mode)) return NextResponse.json({ error: "Choose percent or flat." }, { status: 400 });
  if (!Number.isFinite(value) || value < 0 || (mode === "percent" && value > 100) || (mode === "flat" && value > 100000)) return NextResponse.json({ error: "Enter a valid markup (percent 0–100, or flat naira up to 100,000)." }, { status: 400 });
  const { error } = await createAdminClient().from("markup_settings").upsert({ category, mode, value, updated_at: new Date().toISOString(), updated_by: user.id }, { onConflict: "category" });
  if (error) return NextResponse.json({ error: "Could not save. Has the markup migration been run?" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
