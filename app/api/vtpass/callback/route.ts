import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ received: false, message: "The legacy VTpass callback is disabled. this endpoint is no longer used." }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({ received: false, message: "The legacy VTpass callback is disabled. this endpoint is no longer used." }, { status: 410 });
}
