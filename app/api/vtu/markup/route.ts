import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMarkupRules } from "@/lib/markup";

export const dynamic = "force-dynamic";
// Public: the checkout page shows the service fee, and the server recalculates it when the order is created.
export async function GET() {
  return NextResponse.json({ rules: await getMarkupRules(createAdminClient()) }, { headers: { "Cache-Control": "no-store" } });
}
