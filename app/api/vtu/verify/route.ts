import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    code: "NOT_SUPPORTED",
    message: "Verification happens when an order is created.",
  }, { status: 501 });
}
