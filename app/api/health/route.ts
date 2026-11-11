import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Tiny "I'm awake" endpoint for uptime pingers and the on-page keep-warm heartbeat.
// It touches no database and no third-party service, so it is free and instant.
const headers = { "Cache-Control": "no-store" };
export async function GET() { return NextResponse.json({ ok: true }, { headers }); }
export async function HEAD() { return new NextResponse(null, { status: 200, headers }); }
