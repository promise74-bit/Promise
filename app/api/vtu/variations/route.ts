import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    code: "NOT_SUPPORTED",
    message: "Service variations are served by /api/vtu/catalogue.",
  }, { status: 501 });
}
